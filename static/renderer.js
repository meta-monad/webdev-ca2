function drawTile(context, camera, tile, spriteMap, row, col, canvasWidth, tileWidth, tileHeight) {
    const realX = 0.5 * (canvasWidth - tileWidth * camera.tileScale ) + 0.5 * (col - row) * tileWidth * camera.tileScale; 
    const realY = 0.5 * (col + row) * tileHeight * camera.tileScale;

    context.drawImage(
        spriteMap,
        tile.x, tile.y, tile.width, tile.height,
        realX, realY + (tile.displacement ?? 0) * camera.tileScale, tile.width * camera.tileScale, tile.height * camera.tileScale
    );
}

function drawMap(context, camera, gameMap, tileTranslation, spriteMap, tileWidth, tileHeight, canvasWidth) {
    for (let r = 0; r < gameMap.length; r+=1) {
        for (let c = 0; c < gameMap[r].length; c+=1) {
            let tile = tileTranslation[gameMap[r][c]];
            if (tile) {
                drawTile(context, camera, tile, spriteMap, r, c, canvasWidth, tileWidth, tileHeight);
            }
        }
    }
}

function drawEntities(context, camera, entities, tileWidth, tileHeight, canvasWidth) {
    for (const entity of entities) {
        switch (entity.type) {
            case "enemy":
                context.fillStyle = entity.drawInfo.fillColor;
                context.fillRect(
                    0.5 * ( canvasWidth - entity.drawInfo.width * camera.tileScale) + 0.5 * ( entity.position.y - entity.position.x ) * tileWidth * camera.tileScale,
                    0.5 * tileHeight * camera.tileScale + 0.5 * ( entity.position.y + entity.position.x ) * tileHeight * camera.tileScale - entity.drawInfo.height * camera.tileScale,
                    entity.drawInfo.width * camera.tileScale,
                    entity.drawInfo.height * camera.tileScale
                );
                break;
            default:
                console.warn(`unexpected type of entity: ${entity.type}`)
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
        camera.mouseX
        - 2 * camera.mouseY
        - (canvasWidth / 2)
        + (tileHeight * camera.tileScale) * (3/2)
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

function drawSelection(context, camera, gameMap, tileTranslation, spriteMap, cursorMode, canvasWidth, tileWidth, tileHeight) {

    let [r, c] = getMouseTile(camera, canvasWidth, tileWidth, tileHeight);

    // const realX = 0.5 * (canvasWidth - tileWidth * camera.tileScale) + 0.5 * (col - row) * tileWidth * camera.tileScale; 
    // const realY = 0.5 * (c + r) * tileHeight * camera.tileScale;

    let tile;
    switch (cursorMode) {
        case "Move":
            tile = tileTranslation[4];
            break;
        case "Info":
            tile = tileTranslation[5];
            break;
        case "Attack":
            tile = tileTranslation[6];
            break;
        default:
            console.warn("No interpret on selectionMode");
    }

    // if (r >= 0 && c >= 0&& r < gameMap.length && c < gameMap[r].length && tileTranslation[gameMap[r][c]])
    drawTile(context, camera, tile, spriteMap, r, c, canvasWidth, tileWidth, tileHeight);

    // debug: draw the mouse position
    //context.fillStyle = "yellow";
    //context.fillRect(
    //    camera.mouseX,
    //    camera.mouseY,
    //    1,
    //    1
    //);
    return (r, c);
}

function getTopCoords(originType, x, y, width, height, canvasWidth, canvasHeight) {
    let sourceX = 0, sourceY = 0;

    // origin goes from top to bottom, left to right, like so:
    // TL | TC | TR
    // ------------
    // CL | CC | CR
    // ------------
    // BL | BC | BR

    // this check ensures that the origin can always be interpreted
    if (!([
        "TL", "TC", "TR",
        "CL", "CC", "CR",
        "BL", "BC", "BR"
    ].includes(originType))) {
        console.warn(`Unable to process UI element's origin: ${originType}, defaulting to top-left`);
        originType = "TL";
    }

    switch (originType[0]) {
        case "T":
            sourceY = 0;
            break;
        case "C":
            sourceY = Math.round(canvasHeight / 2);
            break;
        case "B":
            sourceY = canvasHeight;
            break;
    }

    switch (originType[1]) {
        case "L":
            sourceX = 0;
            break;
        case "C":
            sourceX = Math.round(canvasWidth / 2);
            break;
        case "R":
            sourceX = canvasWidth;
            break;
    }
    
    let destX = sourceX;
    switch (originType[1]) {
        case "L":
            destX += x;
            break;
        case "C":
            destX += x - Math.round(width / 2);
            break;
        case "R":
            destX -= x + width;
            break;
    }

    let destY = sourceY;
    switch (originType[0]) {
        case "T":
            destY += y;
            break;
        case "C":
            destY += y - Math.round(height / 2);
            break;
        case "B":
            destY -= y + height;
            break;
    }

    return {
        x : destX,
        y : destY,
    };
}

function drawUI(context, UIElems, canvasWidth, canvasHeight) {
    for (let UIElement of UIElems) {
        switch (UIElement.type) {
            case "fill": {
                let width = UIElement.width;
                if (width === "fill") {
                    width = canvasWidth;
                }

                let height = UIElement.height;
                if (height === "fill") {
                    height = canvasWidth;
                }
                let {x, y} = getTopCoords(
                    UIElement.origin,
                    UIElement.x ?? 0,
                    UIElement.y ?? 0,
                    width,
                    height,
                    canvasWidth,
                    canvasHeight,
                );

                context.fillStyle = UIElement.color;
                context.fillRect(x, y, width, height);
                break;
            }
            case "text": {
                let {x, y} = getTopCoords(
                    UIElement.origin,
                    UIElement.x ?? 0,
                    UIElement.y ?? 0,
                    UIElement.referenceWidth,
                    UIElement.referenceHeight,
                    canvasWidth,
                    canvasHeight,
                );

                context.font = "12px sans-serif";
                context.fillStyle = UIElement.color;

                let words = UIElement.contents.split(' ');
                let currentLine = words.shift();
                let lineOffset = 12 + 2; // 16px line height, 2px line spacing
                let line = 0;

                while (words.length) {
                    let currentWord = words.shift();
                    if (context.measureText(currentLine + " " + currentWord).width < UIElement.referenceWidth) {
                        currentLine += " " + currentWord;
                    } else {
                        context.fillText(
                            currentLine,
                            x,
                            y + (line * lineOffset)
                        );
                        line += 1;
                        currentLine = currentWord;
                    }
                }
                // render the last remaining line
                context.fillText(
                    currentLine,
                    x,
                    y + (line * lineOffset)
                );

                break;
            }
            default:
                console.warn("Skipping unknown UI element type:", UIElement.type);
        }
    }
}

export { drawTile, drawMap, drawEntities, drawPlayer, getMouseTile, drawSelection, drawUI };
