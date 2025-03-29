function eq_coord(a, b) {
    return a.every((elem, index) => { return b[index] === elem });
}

function processCamera(camera) {
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
}

function generatePath(gameMap, tileTranslation, origin, dest) {
    console.log("called generatePath");
    // naive BFS
    let q = [origin];

    // maps vertices to previous node in search
    let visited = gameMap.map((row) => { return new Array(row.length).fill(null) });

    while (q.length) {
        let [vx, vy] = q.shift();
        if (eq_coord([vx, vy], dest)) {
            break;
        }
        let neighbors = [
            [vx-1, vy  ],
            [vx+1, vy  ],
            [vx,   vy-1],
            [vx,   vy+1],
        ];
        for (let [row, col] of neighbors) {
            if (row >= 0 && col >= 0 && row < visited.length && col < visited[row].length ) {
                // valid coordinate
                // TODO: check if tile is traversable
                if (!visited[row][col]) {
                    visited[row][col] = [vx, vy]; // set previous node
                    q.push([row, col]);
                }
            }
        }
    }

    let path = [];
    let v = dest;
    while (!eq_coord(v, origin)) {
        path.unshift(visited[v[0]][v[1]]);
        v = visited[v[0]][v[1]];
    }
    return path;
}

export { processCamera, generatePath }; 
