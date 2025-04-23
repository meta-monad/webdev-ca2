const tileWidth = 32;
const tileHeight = 16;
// displacement goes down
const tileTranslation = [
    // 0
    {
        name : "void",
        x : 0,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false,
        description : "An empty void. You stare into it, and it stares back.",
    },
    // 1
    {
        name : "land1",
        x : 0,
        y : 16,
        width : tileWidth,
        height : tileHeight,
        traversable : true,
        description : "Flat land. Nothing out of the ordinary.",
    },
    // 2
    {
        name : "land2",
        x : 32,
        y : 16,
        width : tileWidth,
        height : tileHeight,
        traversable : true,
        description : "Flat land. Nothing out of the ordinary.",
    },
    // 3
    {
        name : "land3",
        x : 64,
        y : 16,
        width : tileWidth,
        height : tileHeight,
        traversable : true,
        description : "Flat land. Nothing out of the ordinary.",
    },
    // 4
    {
        name : "water-edge-horizontal",
        x : 0,
        y : 32,
        width : tileWidth,
        height : tileHeight,
        traversable : false,
        description : "Edge of the water. It is lined with a thick carpet of algae... Or something similar.",
    },
    // 5
    {
        name : "water-edge-vertical",
        x : 32,
        y : 32,
        width : tileWidth,
        height : tileHeight,
        traversable : false,
        description : "Edge of the water. It is lined with a thick carpet of algae... Or something similar.",
    },
    // 6
    {
        name : "water-edge-corner",
        x : 64,
        y : 32,
        width : tileWidth,
        height : tileHeight,
        traversable : false,
        description : "Edge of the water. It is lined with a thick carpet of algae... Or something similar.",
    },
    // 7
    {
        name : "water",
        x : 96,
        y : 32,
        width : tileWidth,
        height : tileHeight,
        traversable : false,
        description : "The surface of a pond. Its surface is slightly swirling. You wonder what's beneath.",
    },
    // 8
    {
        name : "selection1",
        x : 32,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    },
    // 9
    {
        name : "selection2",
        x : 64,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    },
    // 10
    {
        name : "selection3",
        x : 96,
        y : 0,
        width : tileWidth,
        height : tileHeight,
        traversable : false
    },
    // 11
    {
        name : "wall-horizontal",
        x : 0,
        y : 48,
        width : tileWidth,
        height : tileHeight * 2,
        displacement : -tileHeight,
        traversable : true,
        description : "A wooden frame nearing collapse. It might be good cover.",
    },
    // 12
    {
        name : "tank",
        x : 32,
        y : 48,
        width : tileWidth,
        height : tileHeight * 2,
        displacement : -tileHeight,
        traversable : false,
        description : "Seemingly a tank that used to store some something that warrants a warning label.",
    },
    // 13
    {
        name : "tower-tall",
        x: 0,
        y: 80,
        width: tileWidth,
        height : tileHeight * 3,
        displacement : -2 * tileHeight,
        traversable : false,
        description : "A towering steel truss that has been erroded. Flaskes of rust and peeled off painting surround the structure. You how much longer will it last."
    },

];

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

function drawEntities(context, camera, spriteMap, entities, tileWidth, tileHeight, canvasWidth) {
    for (const entity of entities) {
        switch (entity.type) {
            case "enemy":
            case "idle":
                context.drawImage(
                    spriteMap,
                    entity.drawInfo.x, entity.drawInfo.y, entity.drawInfo.width, entity.drawInfo.height,
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

function drawPlayer(context, camera, spriteMap, player, tileWidth, tileHeight, canvasWidth) {
    context.drawImage(
        spriteMap,
        player.drawInfo.x, player.drawInfo.y, player.drawInfo.width, player.drawInfo.height,
        0.5 * ( canvasWidth - player.drawInfo.width * camera.tileScale) + 0.5 * ( player.position.y - player.position.x ) * tileWidth * camera.tileScale,
        0.5 * tileHeight * camera.tileScale + 0.5 * ( player.position.y + player.position.x ) * tileHeight * camera.tileScale - player.drawInfo.height * camera.tileScale,
        player.drawInfo.width * camera.tileScale,
        player.drawInfo.height * camera.tileScale
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
            tile = tileTranslation[8];
            break;
        case "Info":
            tile = tileTranslation[9];
            break;
        case "Attack":
            tile = tileTranslation[10];
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
        let x, y;
        switch (UIElement.type) {
            case "fill":
                let width = UIElement.width;
                if (width === "fill") {
                    width = canvasWidth;
                }

                let height = UIElement.height;
                if (height === "fill") {
                    height = canvasWidth;
                }
                ({x, y} = getTopCoords(
                    UIElement.origin,
                    UIElement.x ?? 0,
                    UIElement.y ?? 0,
                    width,
                    height,
                    canvasWidth,
                    canvasHeight,
                ));

                context.fillStyle = UIElement.color;
                context.fillRect(x, y, width, height);
                break;
            case "text":
                ({x, y} = getTopCoords(
                    UIElement.origin,
                    UIElement.x ?? 0,
                    UIElement.y ?? 0,
                    UIElement.referenceWidth,
                    UIElement.referenceHeight,
                    canvasWidth,
                    canvasHeight,
                ));

                context.font = "12px \"CourierPrime\"";
                context.fillStyle = UIElement.color;

                // some UI text might reflect a dynamic variable
                let renderedText;
                if (typeof UIElement.contents === "string") {
                    renderedText = UIElement.contents;
                } else if (typeof UIElement.contents === "function") {
                    renderedText = UIElement.contents();
                }

                let words = renderedText.split(' ');
                let currentLine = words.shift();
                let lineOffset = 12 + 2; // 16px line height, 2px line spacing
                let line = 0;

                while (words.length) {
                    let lineEnd = false;
                    let currentWord = words.shift();
                    if (currentWord.includes('\n')) {
                        let newWords = currentWord.split('\n');
                        currentWord = newWords[0];
                        words.unshift(...newWords.splice(1));
                        lineEnd = true;
                    }
                    if (context.measureText(currentLine + " " + currentWord).width < UIElement.referenceWidth) {
                        currentLine += " " + currentWord;
                    } else {
                        context.fillText(
                            currentLine,
                            x,
                            y + (line * lineOffset)
                        );
                        lineEnd = true;
                        currentLine = currentWord;
                    }

                    if (lineEnd) {
                        line += 1;
                    }
                }
                // render the last remaining line
                context.fillText(
                    currentLine,
                    x,
                    y + (line * lineOffset)
                );

                break;
            default:
                console.warn("Skipping unknown UI element type:", UIElement.type);
        }
    }
}

export { tileWidth, tileHeight, tileTranslation, drawTile, drawMap, drawEntities, drawPlayer, getMouseTile, drawSelection, drawUI };
