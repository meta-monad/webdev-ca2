let canvas;
let context;

// game state information
let player = {
    position : {
        x: 1,
        y: 1
    },
    width : 8,
    height : 16,
};

const gameMap = [
        [1,1,2],
        [1,3,-1],
        [-1,1,3],
        [3,3,3]
];
const tileWidth = 32;
const tileHeight = 16;
const tileScale = 1;

// direction: 1 grows up, -1 grows down
const tileTranslation = [
    // 0
    {
        x : 0,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        direction : 1
    },
    // 1
    {
        x : 0,
        y: 16,
        width: tileWidth,
        height: tileHeight,
        direction : 1
    },
    // 2
    {
        x : 32,
        y: 32,
        width: tileWidth,
        height: tileHeight * 2,
        direction : 1
    },
    // 3
    {
        x : 0,
        y: 32,
        width: tileWidth,
        height: tileHeight * 2,
        direction : 0
    }
];

// fps
// let now;
let then = Date.now();
const fpsInterval = 1000 / 30; // 30 frames per 1000 milliseconds

// sprites
let spriteMap = new Image();

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    canvas = document.querySelector("canvas");
    context = canvas.getContext("2d");

    window.addEventListener("keyup", keyup, false);

    load_assets([
            {var : spriteMap, url : "static/spritemap.png"}
    ], draw);
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

    context.clearRect(0, 0, canvas.width, canvas.height);
    // background
    context.fillStyle = "#606060"; 
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < gameMap.length; r+=1) {
        for (let c = 0; c < gameMap[r].length; c+=1) {
            let tile = tileTranslation[gameMap[r][c]];
            if (tile) {
                const realX = 0.5 * canvas.width - 0.5 * tileWidth + 0.5 * (c - r) * tileWidth * tileScale; 
                const realY = 0.5 * (c + r) * tileHeight * tileScale;
                context.drawImage(
                    spriteMap,
                    tile.x, tile.y, tile.width, tile.height,
                    realX, realY + tile.direction * (tileHeight - tile.height), tile.width * tileScale, tile.height * tileScale
                );
            }
        }
    }

    // player
    context.fillStyle = "red";
    context.fillRect(
        0.5 * ( canvas.width - player.width) + 0.5 * ( player.position.x - player.position.y) * tileWidth * tileScale,
        0.5 * tileHeight + 0.5 * ( player.position.x + player.position.y ) * tileHeight * tileScale - player.height,
        player.width,
        player.height
    );
}

function keyup(event) {
    let key = event.key;
    event.preventDefault();
    if (key === "ArrowUp") {
        player.position.y -= 1;
    } else if (key === "ArrowDown") {
        player.position.y += 1;
    } else if (key === "ArrowLeft") {
        player.position.x -= 1;
    } else if (key === "ArrowRight") {
        player.position.x += 1;
    }
}

function load_assets(assets, callback) {
    let num_assets = assets.length;
    let loaded = function() {
        console.log("loaded asset")
        num_assets -= 1;
        if (num_assets === 0) {
            console.log("loaded all assets");
            callback();
        }
    }
    for (let asset of assets) {
        let element = asset.var;
        if (element instanceof HTMLImageElement) {
            console.log("image");
            element.addEventListener("load", loaded, false);
        } else if (element instanceof HTMLAudioElement) {
            console.log("audio");
            element.addEventListener("canplaythrough", loaded, false);
        } else {
            console.log("unknown type of asset, skipping");
        }
        element.src = asset.url;
    }
}
