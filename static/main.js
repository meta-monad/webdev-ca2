import { tileWidth, tileHeight, tileTranslation, drawTile, drawMap, drawEntities, drawPlayer, getMouseTile, drawSelection, drawUI } from "./renderer.js";
import { processCamera, generatePath, eq_coord, enemyConstructor, generateEntityCombatScore, generatePlayerCombatScore, getGameTurns, combatTurn } from "./game.js";
import { makeRequest, saveGameState } from "./network.js";

let canvas;
let context;

// game state information
let player = {
    position : {
        x: null,
        y: null
    },
    width : 8,
    height : 16,
    attributes : { // TODO
        perception : 5,
        agility: 5,
    },
    activeWeapon : 0,
    inventory : [
        {
            type : "weapon",
            name : "pistol",
            falloff : 1,
            criticalChance : 0,
            baseDamage : 3,
        },
        {
            type : "weapon",
            name : "fist",
            falloff : 1,
            range : 1,
            criticalChance : 0.05, // +5% extra
            baseDamage : 2,
        }
    ]
};
let camera = {
    x : 0,
    y : 0,
    moveLeft : false,
    moveRight : false,
    moveUp : false,
    moveDown : false,
    speed : 10,
    tileScale : 1,
    mouseX : null,
    mouseY : null,
};
let entities = [];
let combatQueue = [];
let gameMode = "Exploring"; // Combat | Exploring
let cursorMode = "Move"; // Move | Info | Attack

let gameCycle = {
    capacity : null, // null is unlimited
    queue : [],
}
// block the normal game cycle from updating, but not rendering
let playerCombatTurn = false;
let playerMoved = false;

let gameMap = [];
let path = [];

// fps
// let now;
let then = Date.now();
const fpsInterval = 1000 / 30; // 30 frames per 1000 milliseconds
let gameTickCounter = 0;

// remote assets
let spriteMap = new Image();
let displayFont = new FontFace(
    "CourierPrime",
    "url(static/CourierPrime-Regular.ttf)"
);

// UI
// all game UI renders from the same sprite map
let UIElems = [
    {
        type : "fill",
        color : "brown",
        origin : "BL", // bottom left
        width : "fill",
        height : 128,
    },
    {
        type : "fill",
        color : "darkgoldenrod",
        origin : "BC", // bottom center
        width : 256,
        height : 112,
        y : 8,
    },
    {
        type : "fill",
        color : "darkgoldenrod",
        origin : "BL", // bottom left
        width : 100,
        height : 112,
        y : 8,
        x : 8,
    },
    {
        type : "fill",
        color : "darkgoldenrod",
        origin : "BR", // bottom right
        width : 100,
        height : 112,
        y : 8,
        x : 8,
    },
    {
        type : "text",
        color : "black",
        origin : "BC", // bottom center
        referenceWidth : 247,
        referenceHeight : 108,
        contents : "",
        x: 4,
        y: -8,
    },
    {
        type : "text",
        color : "black",
        origin : "BL", // bottom left
        referenceWidth : 91,
        referenceHeight : 108,
        contents : () => {
            if (gameMode === "Combat") {
                return `Health: ${player.health}\n` + 
                    `Actions: ${gameCycle.capacity}\n` +
                    `State: ${gameMode}`;
            } else {
                return `Health: ${player.health}\n` + 
                    `State: ${gameMode}`;
            }
        },
        x: 12,
        y: -4,
    },
];

// this is actually a reference
let textDisplay = UIElems[4];

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    let form = document.querySelector("form");
    document.fonts.add(displayFont);
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        let player_name = document.getElementById("player_name").value;
        game_init(player_name);
    });
}

function game_init(player_name) {
    let data = new FormData();
    data.append("player_name", player_name);

    makeRequest("./begin_session", data, (response) => {
        console.log(response);

        player.position.x = response.player.x;
        player.position.y = response.player.y;
        player.description = response.player.description;
        player.health = response.player.health;
        player.maxHealth = response.player.maxHealth;
        gameMap = response.gameMap;

        // process entities
        for (let entity of response.entities) {
            let state;
            console.log("entity: ", entity);
            switch (entity.constructor) {
                case "enemy":
                    state = enemyConstructor(entity.args, entity.position);
                    break;
                default:
                    console.warn("Unable to import entity with constructor:\"", entity.constructor, "\", ignoring");
            }
            if (state) {
                // state is undefined or false: both are falsy
                entities.push(state);
            } else if (state === false) {
                console.warn("Unable to create entity with constructor:\"", entity.constructor, "\", ignoring");
            }
        }

        document.getElementById("game_area").hidden = false;
        document.getElementById("join_form").hidden = true;

        canvas = document.querySelector("canvas");
        context = canvas.getContext("2d");

        context.imageSmoothingEnabled = false;

        // "click" event only registers primary button
        canvas.addEventListener("mouseup", mouseup, false);
        window.addEventListener("mousemove", mousemove, false);
        window.addEventListener("keyup", keyup, false);
        window.addEventListener("keydown", keydown, false);

        load_assets([
            {var : spriteMap, url : "static/spritemap.png"}
        ], draw);
    }, (error) => {
        console.error(error);
        document.getElementById("error").innerText = `Error: ${error.cause ?? "Server error"}`;
    });
}


function draw() {
    window.requestAnimationFrame(draw);

    // fps limiter
    let now = Date.now();
    let delta = now - then;
    if (delta <= fpsInterval ) {
        return;
    }
    then = now - (delta % fpsInterval);

    gameTickCounter += 1;

    /// game state updates
    
    if (gameTickCounter % 3 === 0 && !playerCombatTurn) {
        // 100ms

        // process entitites: non-combat
        for (let entity_index = 0; entity_index < entities.length; entity_index++) {
            if (!(combatQueue.map(([ei]) => ei).includes(entity_index))) {
                let entity = entities[entity_index];
                let engaged = entity.updateFunction(gameMap, tileTranslation, entities, gameCycle, player, gameTickCounter);
                if (engaged) {
                    gameMode = "Combat";
                    gameCycle.capacity = getGameTurns(player);
                    gameCycle.queue = [];
                    let combatScore = generateEntityCombatScore(entity);
                    combatQueue.push([entity_index, combatScore]);
                }
            }
        }

        if (gameMode === "Combat") {
            // process combat cycle

            // .sort is an in-place operation that mutates combatQueue
            combatQueue.sort(([entity1, score1], [entity2, score2]) => {
                // positive/negative means number 1 is before/after number 2
                // this sorts the array in descending order of combat score
                return score2 - score1;
            });

            let playerScore = generatePlayerCombatScore(player);

            // 1. frame render with gameTick % 3 === 0
            // 2. notice that gameMode is Combat
            // 3. process entities with higher combatScore than the player (playerMoved === false)
            // 4. reach the player in the combat round (playerScore > combatScore)
            // 4.1. set playerCombatTurn = true to block further processing
            // 4.2. set playerMoved = true
            // 4.3. break and finish rendering up the frame
            // 5. wait until gameCycle.capacity depletes
            // 5.1 simultaneously process gameCycle.queue's actions
            // 5.2 set playerCombatTurn to false
            // 6. code gets back to step 2.
            // How do we avoid re-processing entities with a higher combat score than the player?
            // - playerMoved = false --> process
            // - playerMoved = true && combatScore <= player --> process 
            // 7. exit for loop
            // 7.1 if playerCombatTurn to false, we have finished a combat turn and playerMoved must be reset
            for (let [entity_index, combatScore] of combatQueue) {
                let entity = entities[entity_index];

                if (!playerMoved && playerScore > combatScore) {
                    console.log("player turn");
                    playerMoved = true;
                    playerCombatTurn = true;
                    gameCycle.capacity = getGameTurns(player);
                    break;
                } else if (!playerMoved || (playerMoved && playerScore >= combatScore)) {
                    entity.updateFunction(gameMap, tileTranslation, entities, gameCycle, player, gameTickCounter);
                    if (!entity.internalState.alive) {
                        combatQueue = combatQueue.filter((element) => 
                            element[0] != entity_index
                        );

                        if (combatQueue.length === 0) {
                            gameMode = "Exploring";
                        }
                    }
                }
            }
            
            if (!playerCombatTurn) {
                playerMoved = false;
            }

        } else if (gameMode === "Exploring") {
            // process non-combat game cycle
            // player specific

            processPlayerActions();
            
        } else {
            console.error("gameMode has been set to an invalid state:" + gameMode); 
        }

        // auto-save
        if (gameTickCounter % 300 === 0) { // 10s
            saveGameState(player);
        }
    } else if (gameTickCounter % 3 === 0 && playerCombatTurn) {
        processPlayerActions();
    }

    /// rendering

    // background
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#707070"; 
    context.fillRect(0, 0, canvas.width, canvas.height);

    // camera displacement
    context.save()
    context.translate(camera.x, camera.y);

    // draw game map
    drawMap(context, camera, gameMap, tileTranslation, spriteMap, tileWidth, tileHeight, canvas.width,);

    // tile selection
    drawSelection(context, camera, gameMap, tileTranslation, spriteMap, cursorMode, canvas.width, tileWidth, tileHeight);

    // draw entities
    drawEntities(context, camera, entities, tileWidth, tileHeight, canvas.width);
    // player

    drawPlayer(context, camera, player, tileWidth, tileHeight, canvas.width);

    context.restore();

    drawUI(context, UIElems, canvas.width, canvas.height);
    
    // camera
    processCamera(camera);
}

function processPlayerActions() {
    if (gameCycle.queue.length) {
        let action = gameCycle.queue.shift();
        switch (action.actionType) {
            case "move":
                [player.position.x, player.position.y] = action.position;
                break;
            case "attack":
                let weapon = player.inventory[player.activeWeapon];
                let hitResult = combatTurn(player, weapon, action.target);
                if (!action.target.internalState.alive) {
                    switch (hitResult) {
                        case "miss":
                        case "out-of-range":
                            // do nothing
                            break;
                        case "hit":
                        case "critical":
                            textDisplay.content = "You hit the lifeless corpse.";
                            break;
                    }
                    break;
                }

                let damage; // switches aren't scoped -_-
                switch (hitResult) {
                    case "miss":
                        textDisplay.contents = "You miss.";
                        if (Math.random() >= 0.2) {
                            textDisplay.content += ` ${action.target.name} looks at you slightly perplexed.`;
                        }
                        break;
                    case "out-of-range":
                        textDisplay.contents = "You hit the air as the target is out of range.";
                        if (Math.random() >= 0.5) {
                            textDisplay.content += " What were you thinking?";
                        }
                        break;
                    case "hit":
                        damage = weapon.baseDamage;
                        action.target.internalState.health -= damage;
                        textDisplay.contents = `You hit ${action.target.name} for ${damage} points.`;
                        break;
                    case "critical":
                        damage = Math.ceil(weapon.baseDamage * (Math.random() + 1));
                        action.target.internalState.health -= damage;
                        textDisplay.contents = `You score a critical hit on ${action.target.name} for ${damage} points with your trusty ${weapon.name}.`;
                        if (damage >= 5) {
                            let criticalMessages = [
                                " It wails in pain.",
                                " It coughs up some blood.",
                                " Its body contorts for a second.",
                                " That will surely leave a mark.",
                            ]
                            textDisplay.contents += criticalMessages[Math.floor(Math.random() * criticalMessages.length)];
                        }
                        break;
                }
                break;
            case "entityAttack":
                let entityHitResult = combatTurn(action.entity, action.weapon, action.target);
                let entityDamage;
                switch (entityHitResult) {
                    case "miss":
                        textDisplay.contents += "\nIts attack misses you.";
                        break;
                    case "out-of-range":
                        textDisplay.contents += `\nNothing happens as ${action.entity.name} lashed out into the air.`;
                        break;
                    case "hit":
                    case "critical":
                        if (entityHitResult === "hit") {
                            entityDamage = action.weapon.baseDamage;
                        } else { // critical
                            entityDamage = Math.ceil(action.weapon.baseDamage * (Math.random() + 1));
                        }
                        player.health -= entityDamage;
                        textDisplay.contents += `\nYou are hit for ${entityDamage} points by ${action.entity.name}'s ${action.weapon.name}.`;
                        break;
                }
                break;
            case "entityMove":
                [action.entity.position.x, action.entity.position.y] = action.position;
                break;
            default:
                console.warn("unknown action type in game cycle: ", action);
        }
    }
    if (gameCycle.capacity === 0) {
        playerCombatTurn = false;
    }
}

function mousemove(event) {
    camera.mouseX = event.pageX - canvas.offsetLeft - camera.x;
    camera.mouseY = event.pageY - canvas.offsetTop - camera.y;
}

function mouseup(event) {
    event.preventDefault(); // TODO: prevent context menu
    switch (event.button) {
        case 0:
            let coords = getMouseTile(camera, canvas.width, tileWidth, tileHeight);
            switch (cursorMode) {
                case "Move":
                    path = generatePath(
                        gameMap,
                        tileTranslation,
                        entities,
                        [player.position.x, player.position.y],
                        coords
                    );
                    console.debug(path);

                    let moves = path.length;
                    if (gameCycle.capacity !== null) {
                        moves = Math.min(path.length, gameCycle.capacity);
                        gameCycle.queue.push(...path.map((pathNode) => {
                            return {
                                actionType : "move",
                                position : pathNode
                            }
                        }).slice(
                            0,
                            Math.max(gameCycle.capacity, 0)
                        ));
                        gameCycle.capacity -= moves; 
                        gameCycle.capacity = Math.max(gameCycle.capacity, 0);
                        // Math.max(gameCycle.capacity, 0) just in case two calls of this function are running
                    } else {
                        gameCycle.queue.push(...path.map((pathNode) => {
                            return {
                                actionType : "move",
                                position : pathNode
                            }
                        }));
                    }
                    if (player.health === player.maxHealth) {
                        textDisplay.contents = `You sprint ${moves} tiles away.`;
                    } else if (player.health >= 3) {
                        textDisplay.contents = `You move ${moves} tiles.`;
                    } else { // player.health <= 2
                        textDisplay.contents = `You crawl your way across ${moves} tiles`;
                    }
                    break;
                case "Info" :
                    infoBlock : {
                        // check for an entity
                        for (let entity of entities) {
                            if (eq_coord([entity.position.x, entity.position.y], coords)) {
                                textDisplay.contents = entity.description + " " + (() => {
                                    if (!entity.internalState.alive) {
                                        return "You are confident that it's dead.";
                                    }
                                    if (entity.internalState.maxHealth === entity.internalState.health) {
                                        return "It is unscathed. ";
                                    } else if (entity.internalState.health >= 4) {
                                        return "It looks wounded.";
                                    } else {
                                        // HP <= 3
                                        return "It looks infirm.";
                                    }
                                })();
                                break infoBlock;
                            }

                            // check for player
                            if (eq_coord(
                                [player.position.x, player.position.y],
                                coords
                            )) {
                                textDisplay.contents = player.description;
                                break infoBlock;
                            }

                            // no entity on the tile, describe the tile instead
                            try {
                                const tileCode = gameMap[coords[0]][coords[1]];
                                textDisplay.contents = tileTranslation[tileCode].description;
                            } catch (error) {
                                // ignore
                                // two possibilites: coordinates outside of game map
                                //                   no defined tile in position
                            }
                        }

                        break;
                    }
                    break;
                case "Attack":
                    // check for the presence of an entity
                    let target_index;
                    for (let entity_index = 0; entity_index < entities.length; entity_index+=1) {
                        let entity = entities[entity_index];
                        if (eq_coord([entity.position.x, entity.position.y], coords)) {
                            target_index = entity_index;
                        }
                    }
                    if (target_index !== undefined && (gameCycle.capacity >= 2 || gameCycle.capacity === null)) {
                        let target = entities[target_index];
                        if (gameMode !== "Combat" && target.internalState.alive) {
                            gameMode = "Combat";
                            playerCombatTurn = true;
                            target.internalState.makeEngaged();
                            gameCycle.capacity = getGameTurns(player) - 1;
                            gameCycle.queue = [];
                            let combatScore = generateEntityCombatScore(target);
                            combatQueue.push([target_index, combatScore]);
                        }
                        if (gameMode === "Combat") {
                            gameCycle.capacity -= 2;
                        }
                        gameCycle.queue.push({
                            actionType: "attack",
                            target: target
                        });
                    }
                    break;
                default:
                    console.warn("Click with an invalid cursorMode");
            }
            break;
        case 2:
            let cursorModes = ["Info", "Move", "Attack"];
            let modeIndex = cursorModes.indexOf(cursorMode);
            if (modeIndex !== -1) {
                cursorMode = cursorModes[(modeIndex + 1) % cursorModes.length];
            }
            break;
    } 
}

function keydown(event) {
    let key = event.key; 
    if ( key === "ArrowLeft" || 
         key === "ArrowRight" || 
         key === "ArrowUp" || 
         key === "ArrowDown"
       ) {
        event.preventDefault();
    }

    switch (key) {
        case "ArrowLeft":
            camera.moveLeft = true;
            break;
        case "ArrowRight":
            camera.moveRight = true;
            break;
        case "ArrowUp":
            camera.moveUp = true;
            break;
        case "ArrowDown":
            camera.moveDown = true;
            break;
    }
}

function keyup(event) {
    let key = event.key;
    switch (key) {
        case "ArrowLeft":
            camera.moveLeft = false;
            break;
        case "ArrowRight":
            camera.moveRight = false;
            break;
        case "ArrowUp":
            camera.moveUp = false;
            break;
        case "ArrowDown":
            camera.moveDown = false;
            break;
        case "+":
            camera.tileScale += 1;
            break;
        case "-":
            if (camera.tileScale > 1) {
                camera.tileScale -= 1;
            }
            break;
    }
}

function load_assets(assets, callback) {
    let num_assets = assets.length;
    let loaded = function() {
        console.debug("loaded asset")
        num_assets -= 1;
        if (num_assets === 0) {
            console.log("loaded all assets");
            callback();
        }
    }
    for (let asset of assets) {
        let element = asset.var;
        if (element instanceof HTMLImageElement) {
            console.debug("loading image");
            element.addEventListener("load", loaded, false);
        } else if (element instanceof HTMLAudioElement) {
            console.debug("loading audio");
            element.addEventListener("canplaythrough", loaded, false);
        } else {
            console.warn("unknown type of asset, skipping");
        }
        element.src = asset.url;
    }
}
