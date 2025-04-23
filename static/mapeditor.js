import { tileWidth, tileHeight, tileTranslation, drawTile, drawMap, getMouseTile, drawSelection, drawUI } from "./renderer.js";
import { processCamera } from "./game.js";
import { makeRequest } from "./network.js";

let canvas;
let context;

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

let gameMap = [];
let tile = -1;

// fps
// let now;
let then = Date.now();
const fpsInterval = 1000 / 30; // 30 frames per 1000 milliseconds

// remote assets
let spriteMap = new Image();
let displayFont = new FontFace(
    "CourierPrime",
    "url(static/CourierPrime-Regular.ttf)"
);

document.addEventListener("DOMContentLoaded", init, false);

function init() {
    let form = document.querySelector("form");
    document.fonts.add(displayFont);
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        let width = Number(document.getElementById("width").value);
        let height = Number(document.getElementById("height").value);
        game_init(width, height);
    });
}

function game_init(width, height) {
    if (width <= 0 || height <= 0) {
        document.getElementById("error").innerText = "Map width and height must be positive"; 
        return;
    }

    for (let row = 0; row < height; row += 1) {
        gameMap[row] = [];
        for (let col = 0; col < height; col += 1) {
            gameMap[row][col] = [1,2,3][Math.floor(Math.random() * 3)];
        }
    }

    let exportArea = document.getElementById("export-area");
    exportArea.cols = width * 2;
    exportArea.rows = height;
    // gameMap = Array(height).fill(undefined).map(() => {
    //         return Array(width).fill([1,2,3][Math.floor(Math.random() * 3)])
    //     }
    // );

    let tileSelector = document.getElementById("tile-selector");
    for (let tile_index = -1; tile_index < tileTranslation.length; tile_index += 1) {
        let option = document.createElement("option");
        option.value = tile_index;
        if (tile_index !== -1) {
            option.text= tileTranslation[tile_index].name;
        } else {
            option.text = "empty"
        }
        tileSelector.appendChild(option);
    }
    let exportButton = document.getElementById("export-button");
    let importButton = document.getElementById("import-button");

    document.getElementById("game_area").hidden = false;
    document.getElementById("create_form").hidden = true;

    canvas = document.querySelector("canvas");
    context = canvas.getContext("2d");

    context.imageSmoothingEnabled = false;

    // "click" event only registers primary button
    tileSelector.addEventListener("change", change, false);
    canvas.addEventListener("click", click, false);
    exportButton.addEventListener("click", exportMap, false);
    importButton.addEventListener("click", importMap, false);
    window.addEventListener("mousemove", mousemove, false);
    window.addEventListener("keyup", keyup, false);
    window.addEventListener("keydown", keydown, false);

    load_assets([
        {var : spriteMap, url : "static/spritemap.png"}
    ], draw);
    /*
    */
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
    drawSelection(context, camera, gameMap, tileTranslation, spriteMap, "Info", canvas.width, tileWidth, tileHeight);

    context.restore();
    
    // camera
    processCamera(camera);
}

function mousemove(event) {
    camera.mouseX = event.pageX - canvas.offsetLeft - camera.x;
    camera.mouseY = event.pageY - canvas.offsetTop - camera.y;
}

function change(event) {
    tile = Number(event.target.value);
}

function click(event) {
    event.preventDefault();
    let coords = getMouseTile(camera, canvas.width, tileWidth, tileHeight);
    console.debug(`Clicked at the tile at: ${coords}`);
    try {
        gameMap[coords[0]][coords[1]] = tile;
    } catch {
        // out of bound
        console.warn("out of bounds click");
    }
}

function exportMap(event) {
    let raw_map = gameMap.map(row => row.join(' ')).join('\n');
    document.getElementById("export-area").value = raw_map;

    let data = new FormData();
    data.append("name", document.getElementById("map-name").value);
    data.append("map", raw_map);
    makeRequest("./save_map", data, () => alert("Success!"), (error) => alert(error.cause ?? error));
}

function importMap(event) {
    gameMap = document.getElementById("export-area").value.split('\n').map(line => line.split(' ').map(tile => Number(tile)));
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
