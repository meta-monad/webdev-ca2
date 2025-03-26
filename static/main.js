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
    speed : 10,
    tileScale : 1,
    mouseX : null,
    mouseY : null,
};

const gameMap = [
        [1,1,2],
        [1,3,-1],
        [-1,1,3],
        [3,3,3]
];
const tileWidth = 32;
const tileHeight = 16;

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
        y : 16,
        width : tileWidth,
        height : tileHeight,
    },
    // 2
    {
        x : 32,
        y : 32,
        width : tileWidth,
        height : tileHeight * 2,
        displacement : -tileHeight
    },
    // 3
    {
        x : 0,
        y : 32,
        width : tileWidth,
        height : tileHeight * 2
    },
    // 4
    {
        x : 32,
        y : 0,
        width : tileWidth,
        height : tileHeight
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

    context.imageSmoothingEnabled = false;

    window.addEventListener("mousemove", mousemove, false);
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
    context.fillStyle = "#707070"; 
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save()
    context.translate(camera.x, camera.y);
    for (let r = 0; r < gameMap.length; r+=1) {
        for (let c = 0; c < gameMap[r].length; c+=1) {
            let tile = tileTranslation[gameMap[r][c]];
            if (tile) {
                const realX = 0.5 * (canvas.width - tileWidth * camera.tileScale ) + 0.5 * (c - r) * tileWidth * camera.tileScale; 
                const realY = 0.5 * (c + r) * tileHeight * camera.tileScale;

                context.drawImage(
                    spriteMap,
                    tile.x, tile.y, tile.width, tile.height,
                    realX, realY + (tile.displacement ?? 0) * camera.tileScale, tile.width * camera.tileScale, tile.height * camera.tileScale
                );
            }
        }
    }

    // tile selection

    // realX = 0.5 * (canvas.width - tileWidth * camera.tileScale ) + 0.5 * (c - r) * tileWidth * camera.tileScale;
    // realX = 0.5 * (canvas.width - tileWidth * camera.tileScale + (c - r) * tileWidth * camera.tileScale)
    // (2 * realX - canvas.width - tileWidth * camera.tileScale) / (tileWidth * camera.tileScale) =  c - r

    // realY = 0.5 * (c + r) * tileHeight * camera.tileScale;
    // (2 * realY) / (tileHeight * camera.tileScale) = c + r

    // const c = (2 * realX - canvas.width - tileWidth * camera.tileScale + 2 * realY) / (tileHeight * camera.tileScale)

    const tile = tileTranslation[4];
    // context.fillStyle = "yellow";
    // context.fillRect(
    //     camera.mouseX,
    //     camera.mouseY,
    //     1,
    //     1
    // );
    context.drawImage(
        spriteMap,
        tile.x, tile.y, tile.width, tile.height,
        camera.mouseX - ((camera.mouseX + tileWidth / 2) % (tileWidth * camera.tileScale)),
        camera.mouseY - (camera.mouseY % (tileHeight * camera.tileScale)) + (tile.displacement ?? 0) * camera.tileScale, tile.width * camera.tileScale, tile.height * camera.tileScale
    );

    // player
    context.fillStyle = "red";
    context.fillRect(
        0.5 * ( canvas.width - player.width * camera.tileScale) + 0.5 * ( player.position.x - player.position.y) * tileWidth * camera.tileScale,
        0.5 * tileHeight * camera.tileScale + 0.5 * ( player.position.x + player.position.y ) * (tileHeight - player.height) * camera.tileScale,
        player.width * camera.tileScale,
        player.height * camera.tileScale
    );
    
    // camera
    if (camera.moveLeft) {
        camera.x -= camera.speed;
        camera.mouseX += camera.speed;
    } else if (camera.moveRight) {
        camera.x += camera.speed;
        camera.mouseX -= camera.speed;
    } else if (camera.moveUp) {
        camera.y += camera.speed;
        camera.mouseY -= camera.speed;
    } else if (camera.moveDown) {
        camera.y -= camera.speed;
        camera.mouseY += camera.speed;
    }

    context.restore();

}

function mousemove(event) {
    camera.mouseX = event.clientX - canvas.offsetLeft - camera.x;
    camera.mouseY = event.clientY - canvas.offsetTop - camera.y;
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
