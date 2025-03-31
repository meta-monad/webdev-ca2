function drawTile(context, camera, tile, spriteMap, row, col, canvasWidth, tileWidth, tileHeight) {
    const realX = 0.5 * (canvasWidth - tileWidth * camera.tileScale ) + 0.5 * (col - row) * tileWidth * camera.tileScale; 
    const realY = 0.5 * (col + row) * tileHeight * camera.tileScale;

    context.drawImage(
        spriteMap,
        tile.x, tile.y, tile.width, tile.height,
        realX, realY + (tile.displacement ?? 0) * camera.tileScale, tile.width * camera.tileScale, tile.height * camera.tileScale
    );
}

function drawMap(context, camera, gameMap, tileTranslation, spriteMap, canvasWidth, tileWidth, tileHeight) {
    for (let r = 0; r < gameMap.length; r+=1) {
        for (let c = 0; c < gameMap[r].length; c+=1) {
            let tile = tileTranslation[gameMap[r][c]];
            if (tile) {
                drawTile(context, camera, tile, spriteMap, r, c, canvasWidth, tileWidth, tileHeight);
            }
        }
    }
}

function drawPlayer(context, camera, player, tileWidth, tileHeight, canvasWidth) {
    context.fillStyle = "red";
    context.fillRect(
        0.5 * ( canvasWidth - player.width * camera.tileScale) + 0.5 * ( player.position.y - player.position.x ) * tileWidth * camera.tileScale,
        0.5 * tileHeight * camera.tileScale + 0.5 * ( player.position.y + player.position.x ) * tileHeight * camera.tileScale - player.height * camera.tileScale,
        player.width * camera.tileScale,
        player.height * camera.tileScale
    );
}

function getMouseTile(camera, canvasWidth, tileWidth, tileHeight) {
    // math
    // realX = 0.5 * (canvas.width - tileWidth * camera.tileScale ) + 0.5 * (c - r) * tileWidth * camera.tileScale;
    // realX = 0.5 * (canvas.width - tileWidth * camera.tileScale + (c - r) * tileWidth * camera.tileScale)
    // (realX - 0.5 * (canvas.width - tileWidth * camera.tileScale)) / (tileWidth * camera.tileScale) =  c - r

    // realY = 0.5 * (c + r) * tileHeight * camera.tileScale;
    // (2 * realY) / (tileHeight * camera.tileScale) = c + r

    // to obtain c & r, we resolve the system of equations by summation/subtraction and dividing by 2/-2

    let r = (
        camera.mouseX - ((tileWidth * camera.tileScale ) / 2)
        - 0.5 * (canvasWidth - tileWidth * camera.tileScale)
        - 2 * camera.mouseY + (tileHeight * camera.tileScale)
    ) / (-2 * tileHeight * camera.tileScale);
    let c = (
        camera.mouseX
        + 2 * camera.mouseY
        - (canvasWidth / 2)
        - (tileHeight * camera.tileScale )
    ) / (2 * tileHeight * camera.tileScale);
    r = Math.round(r);
    c = Math.round(c);

    return [r, c];
}

function drawSelection(context, camera, gameMap, tileTranslation, spriteMap, canvasWidth, tileWidth, tileHeight) {

    let [r, c] = getMouseTile(camera, canvasWidth, tileWidth, tileHeight);

    // const realX = 0.5 * (canvasWidth - tileWidth * camera.tileScale) + 0.5 * (col - row) * tileWidth * camera.tileScale; 
    // const realY = 0.5 * (c + r) * tileHeight * camera.tileScale;

    const tile = tileTranslation[4];

    // if (r >= 0 && c >= 0&& r < gameMap.length && c < gameMap[r].length && tileTranslation[gameMap[r][c]])
    drawTile(context, camera, tile, spriteMap, r, c, canvasWidth, tileWidth, tileHeight);

    //context.fillStyle = "yellow";
    //context.fillRect(
    //    camera.mouseX,
    //    camera.mouseY,
    //    1,
    //    1
    //);
    return (r, c);
}

export { drawTile, drawMap, drawPlayer, getMouseTile, drawSelection };
