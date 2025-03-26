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
let camera = {
    x : 0,
    y : 0,
    moveLeft : false,
    moveRight : false,
    moveUp : false,
    moveDown : false,
    speed : 10
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
    },
    // 1
    {
        x : 0,
        y: 16,
        width: tileWidth,
        height: tileHeight,
    },
    // 2
    {
        x : 32,
        y: 32,
        width: tileWidth,
        height: tileHeight * 2,
        displacement : -tileHeight
    },
    // 3
    {
        x : 0,
        y: 32,
        width: tileWidth,
        height: tileHeight * 2,
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
    window.addEventListener("keydown", keydown, false);

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
                let realX = 0.5 * (canvas.width - tileWidth ) + 0.5 * (c - r) * tileWidth * tileScale; 
                let realY = 0.5 * (c + r) * tileHeight * tileScale;

                // offset for camera
                realX += camera.x;
                realY += camera.y;

                tile.displacement ??= 0;
                context.drawImage(
                    spriteMap,
                    tile.x, tile.y, tile.width, tile.height,
                    realX, realY + tile.displacement, tile.width * tileScale, tile.height * tileScale
                );
            }
        }
    }

    // player
    context.fillStyle = "red";
    context.fillRect(
        0.5 * ( canvas.width - player.width) + 0.5 * ( player.position.x - player.position.y) * tileWidth * tileScale + camera.x,
        0.5 * tileHeight + 0.5 * ( player.position.x + player.position.y ) * tileHeight * tileScale - player.height + camera.y,
        player.width,
        player.height
    );
    
    // camera
    if (camera.moveLeft) {
        camera.x -= camera.speed;
    } else if (camera.moveRight) {
        camera.x += camera.speed;
    } else if (camera.moveUp) {
        camera.y += camera.speed;
    } else if (camera.moveDown) {
        camera.y -= camera.speed;
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
