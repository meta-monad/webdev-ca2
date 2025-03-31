import { drawTile, drawMap, drawEntities, drawPlayer, getMouseTile, drawSelection } from "./renderer.js";
import { processCamera, generatePath } from "./game.js";
import { makeRequest, getServerUpdate, makeServerUpdate } from "./network.js";

let canvas;
let context;

// game state information
let player = {
    player_name : null,
    position : {
        x: null,
        y: null
    },
    width : 8,
    height : 16,
};
let entities = [];
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
        traversable : false
    },
    // 1
    {
        x : 0,
        y : 16,
        width : tileWidth,
        height : tileHeight,
        traversable : true
    },
    // 2
    {
        x : 32,
        y : 32,
        width : tileWidth,
        height : tileHeight * 2,
        displacement : -tileHeight,
        traversable : true
    },
    // 3
    {
        x : 0,
        y : 32,
        width : tileWidth,
        height : tileHeight * 2,
        traversable : true
    },
    // 4
    {
        x : 32,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    }
];

// fps
// let now;
let then = Date.now();
const fpsInterval = 1000 / 30; // 30 frames per 1000 milliseconds
let gameTickCounter = 0;

// sprites
let spriteMap = new Image();

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    let form = document.querySelector("form");
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        let player_name = document.getElementById("player_name").value;
        let game_id = document.getElementById("game_id").value;
        game_init(player_name, game_id);
    });
}

function game_init(player_name, game_id) {
    let data = new FormData();
    data.append("game_id", game_id);
    data.append("player_name", player_name);

    makeRequest("/begin_session", data, (response) => {
        console.log(response);
        player.position.x = response.x;
        player.position.y = response.y;
        player.player_name = response.player_name;

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

export function setcoords(x, y) {
    player.position.x = x;
    player.position.y = y;
}

globalThis.setcoords = setcoords;

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
    if (gameTickCounter % 3 === 0) { // 100ms
        getServerUpdate((gameState) => {
            entities = [];
            for (const {player_name, x, y} of gameState.players) {
                if (player_name === player.player_name) {
                    player.position.x = x;
                    player.position.y = y;
                } else {
                    entities.push({
                        type : "player",
                        position : {
                            x : x,
                            y : y
                        },
                        width: player.width,
                        height: player.height
                    })
                }
            }
            gameMap = gameState.gameMap;
        });
        if (path.length) {
            [player.position.x, player.position.y] = path.shift();
            makeServerUpdate(player);
        }
    }

    // background
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#707070"; 
    context.fillRect(0, 0, canvas.width, canvas.height);

    // camera displacement
    context.save()
    context.translate(camera.x, camera.y);

    // draw game map
    drawMap(context, camera, gameMap, tileTranslation, spriteMap, tileWidth, tileHeight, canvas.width,);

    // draw entities
    drawEntities(context, camera, entities, tileWidth, tileHeight, canvas.width);

    // tile selection
    drawSelection(context, camera, gameMap, tileTranslation, spriteMap, canvas.width, tileWidth, tileHeight);

    // player
    drawPlayer(context, camera, player, tileWidth, tileHeight, canvas.width);

    // navigated path
    const tile = tileTranslation[4];
    for (let [r, c] of path) {
        drawTile(context, camera, tile, spriteMap, r, c, canvas.width, tileWidth, tileHeight);
    }
    
    // camera
    processCamera(camera);

    context.restore();
}

function mousemove(event) {
    camera.mouseX = event.pageX - canvas.offsetLeft - camera.x;
    camera.mouseY = event.pageY - canvas.offsetTop - camera.y;
}

function click(event) {
    let dest = getMouseTile(camera, canvas.width, tileWidth, tileHeight);

    path = generatePath(
        gameMap,
        tileTranslation,
        [player.position.x, player.position.y],
        dest
    );
    path.push(dest);
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
