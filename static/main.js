import { drawTile, drawMap, drawEntities, drawPlayer, getMouseTile, drawSelection, drawUI } from "./renderer.js";
import { processCamera, generatePath, eq_coord, enemyConstructor, generateEntityCombatScore, generatePlayerCombatScore } from "./game.js";
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

// DEBUG ONLY
function setCursor(val) {
    cursorMode = val;
}
globalThis.setCursor = setCursor;

let gameCycle = {
    limit : null,
    queue : [],
}

// const gameMap = [
//         [1,1,2],
//         [1,3,-1],
//         [-1,1,3],
//         [3,3,3]
// ];
let gameMap = [];
const tileWidth = 32;
const tileHeight = 16;
let path = [];

// displacement goes down
const tileTranslation = [
    // 0
    {
        x : 0,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false,
        description : "An empty void. You stare into it, and it stares back.",
    },
    // 1
    {
        x : 0,
        y : 16,
        width : tileWidth,
        height : tileHeight,
        traversable : true,
        description : "Flat land. Nothing out of the ordinary.",
    },
    // 2
    {
        x : 32,
        y : 32,
        width : tileWidth,
        height : tileHeight * 2,
        displacement : -tileHeight,
        traversable : true,
        description : "A perfectly flat wall. It might be good cover.",
    },
    // 3
    {
        x : 0,
        y : 32,
        width : tileWidth,
        height : tileHeight * 2,
        traversable : true,
        description : "An edge. I should be careful around it.",
    },
    // 4
    {
        x : 32,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    },
    // 5
    {
        x : 64,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    },
    // 6
    {
        x : 96,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    },
];

// fps
// let now;
let then = Date.now();
const fpsInterval = 1000 / 30; // 30 frames per 1000 milliseconds
let gameTickCounter = 0;

// sprites
let spriteMap = new Image();

// UI
// game UI renders from the same sprite map
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
        type : "text",
        color : "white",
        origin : "BC", // bottom left
        maxWidth : 256,
        contents : "Boo",
    },
];

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    let form = document.querySelector("form");
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
                console.log(state);
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

        window.addEventListener("mousemove", mousemove, false);
        window.addEventListener("click", click, false);
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
    
    if (gameTickCounter % 3 === 0) { // 100ms
        // process entitites: non-combat
        for (let entity_index = 0; entity_index < entities.length; entity_index++) {
            if (!(combatQueue.includes(entity_index))) {
                let entity = entities[entity_index];
                let engaged = entity.updateFunction(gameMap, player, gameTickCounter);
                if (engaged) {
                    gameCycle.queue = [];
                    gameMode = "Combat";
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

            let playerMoved = false;
            let playerScore = generatePlayerCombatScore(player);

            for (let [entity_index, combatScore] of combatQueue) {
                let entity = entities[entity_index];

                if (!playerMoved && playerScore > combatScore) {
                    playerMoved = true;
                    alert("Your turn");
                } else {
                    entity.updateFunction();
                    if (entity.internalState.health === 0) {
                        combatQueue = combatQueue.filter((element) => 
                            element[0] != entity_index
                        );
                        entity.internalState.alive = false;

                        if (combatQueue.length === 0) {
                            gameMode = "Exploring";
                        }
                    }
                }
            }
        } else if (gameMode === "Exploring") {
            // process non-combat game cycle
            // player specific

            if (gameCycle.queue.length) {
                let action = gameCycle.queue.shift();
                switch (action.actionType) {
                    case "move":
                        console.log("move");
                        [player.position.x, player.position.y] = action.position;
                        break;
                    default:
                        console.warn("unknown action type in game cycle: ", action);
                }
            }
        } else {
            console.error("gameMode has been set to an invalid state:" + gameMode); 
        }

        // auto-save
        if (gameTickCounter % 300 === 0) { // 10s
            saveGameState(player);
        }
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

function mousemove(event) {
    camera.mouseX = event.pageX - canvas.offsetLeft - camera.x;
    camera.mouseY = event.pageY - canvas.offsetTop - camera.y;
}

function click(event) {
    switch (cursorMode) {
        case "Move":
            let dest = getMouseTile(camera, canvas.width, tileWidth, tileHeight);

            path = generatePath(
                gameMap,
                tileTranslation,
                entities,
                [player.position.x, player.position.y],
                dest
            );

            // TODO
            if (gameCycle.queue.length < gameCycle.limit || !gameCycle.limit) { // gameCycle.limit is nullable
                gameCycle.queue.push(...path.map((pathNode) => {
                    return {
                        actionType : "move",
                        position : pathNode
                    }
                }));
            }
            break;
        case "Info" :
            let coords = getMouseTile(camera, canvas.width, tileWidth, tileHeight);

            infoBlock : {
                // check for an entity
                for (let entity of entities) {
                    if (eq_coord([entity.position.x, entity.position.y], coords)) {
                        // TODO
                        console.log(entity.description + " " + (() => {
                            if (entity.internalState.maxHealth === entity.internalState.health) {
                                return "It is unscathed. ";
                            } else if (entity.internalState.health >= 4) {
                                return "It looks wounded.";
                            } else {
                                // HP <= 3
                                return "It looks infirm.";
                            }
                        })());
                        break infoBlock;
                    }

                    // check for player
                    if (eq_coord(
                        [player.position.x, player.position.y],
                        coords
                    )) {
                        console.log(player.description);
                        break infoBlock;
                    }

                    // no entity on the tile, describe the tile instead
                    const tileCode = gameMap[coords[0]][coords[1]];
                    console.log(tileTranslation[tileCode].description);
                }

                break;
            }
        case "Attack":
            // TODO
            break;
        default:
            console.warn("Click with invalid cursorMode");
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

    if (key === "ArrowLeft") {
        camera.moveLeft = true;
    } else if (key === "ArrowRight") {
        camera.moveRight = true;
    } else if (key === "ArrowUp") {
        camera.moveUp = true;
    } else if (key === "ArrowDown") {
        camera.moveDown = true;
    }
}

function keyup(event) {
    let key = event.key;
    if (key === "ArrowLeft") {
        camera.moveLeft = false;
    } else if (key === "ArrowRight") {
        camera.moveRight = false;
    } else if (key === "ArrowUp") {
        camera.moveUp = false;
    } else if (key === "ArrowDown") {
        camera.moveDown = false;
    } else if (key === "+") {
        camera.tileScale += 1;
    } else if (key === "-" && camera.tileScale > 1) {
        camera.tileScale -= 1;
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
