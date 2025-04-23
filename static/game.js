function enemyConstructor(args, position) {
    // check for the existence of required fields
    if (!("name" in args) ||
        !("drawX" in args) ||
        !("drawY" in args) ||
        !("attackPoints" in args) ||
        position.length !== 2
       ) {
        return false;
    }

    return {
        name : args.name,
        type : args.type ?? "enemy",
        drawInfo : {
            x : args.drawX,
            y : args.drawY,
            originY : args.drawY,
            width : args.drawWidth ?? 8,
            height : args.drawHeight ?? 14,
        },
        description : args.description ?? "An unknown creature.",
        position : pos_array_to_obj(position),
        weapon : {
            type : "weapon", // compatibility's sake
            name : "claw",
            falloff : 1,
            range : 1,
            criticalChance : 0.05,
            baseDamage : 2,
        },
        attributes : {
            perception : 3,
            agility: 2,
        },
        internalState : {
            engaged : args.engaged ?? false,
            health : args.health ?? 10,
            maxHealth : args.maxHealth ?? 10,
            alive : args.alive ?? true,
        },
        makeEngaged : makeEngaged,
        updateFunction : enemyUpdate,
    }
}
function idleConstructor(args, position) {
    if (!("name" in args) ||
        !("drawX" in args) ||
        !("drawY" in args) ||
        position.length !== 2
    ) {
        return false;
    }

    return {
        name : args.name,
        type : args.type ?? "idle",
        drawInfo : {
            x : args.drawX,
            y : args.drawY,
            originY : args.drawY,
            width : args.drawWidth ?? 8,
            height : args.drawHeight ?? 14,
        },
        description: args.description ?? "You can't quite make out what it is.", 
        position : pos_array_to_obj(position),
        internalState : {
            engaged : false,
            alive : true,
        },
        updateFunction : () => false,
    };
}

function makeEngaged() {
    this.internalState.engaged = true;
    this.drawInfo.y = this.drawInfo.originY - this.drawInfo.height;
    console.log(this.name + " has been engaged");
}

function enemyUpdate(gameMap, tileTranslation, entities, gameCycle, player, tickCount) {
    if (this.internalState.health <= 0 && this.internalState.alive) {
        this.internalState.alive = false;
        this.internalState.engaged = false;
        this.drawInfo.y = this.drawInfo.originY - (2 * this.drawInfo.height);
        return;
    }
    if (!this.internalState.alive) {
        return;
    }
    if (this.internalState.engaged) {
        // return is meaningless here
        let dist = distance_pos(this.position, player.position);
        if (dist === 1 || Math.random() < 0.10) { // 10% chance of randomly attacking the air
            gameCycle.queue.push({
                actionType : "entityAttack",
                target: player,
                entity : this,
                weapon : this.weapon,
            });
        } else {
            let path = generatePath(
                gameMap,
                tileTranslation,
                entities,
                [this.position.x, this.position.y],
                [player.position.x, player.position.y],
            ).slice(0, -1); // last element of path is player
            gameCycle.queue.push(...path.map((pathNode) => {
                return {
                    actionType : "entityMove",
                    position : pathNode,
                    entity : this,
                }
            }).slice(0,getGameTurns(this)));

            // close enough for attack
            if (path.length <= (getGameTurns(this) - 2)) {
                gameCycle.queue.push({
                    actionType : "entityAttack",
                    target: player,
                    entity : this,
                    weapon : this.weapon,
                });
            }
        }
    } else {
        if (
            this.internalState.alive && 
            distance(
                [this.position.x, this.position.y],
                [player.position.x, player.position.y]
            ) <= 3
        ) {
            // start of engagement
            this.makeEngaged();
            return true;
        }
        return false; // never engaging
    }
}

function generateEntityCombatScore(entity) {
    return entity.attributes.perception;
}

function generatePlayerCombatScore(player) {
    return player.attributes.perception;
}

function getGameTurns(entity) { // also applies to player
    return 3 + Math.floor(entity.attributes.agility / 2);
}

function missChance(perception, distance) {
    // magic numbers
    return (distance**2) / (10 * perception);
}

function combatTurn(attacker, attackerWeapon, defender) {
    let dist = distance_pos(attacker.position, defender.position);
    if (Math.random() <= missChance(
        attacker.attributes.perception,
        dist * attackerWeapon.falloff
    )) {
        return "miss";
    }
    if (attackerWeapon.range && attackerWeapon.range < dist) {
        // used for melee combat
        return "out-of-range";
    }
    // 5% chance of a 'critical hit' to spice up combat
    if (Math.random() <= 0.05 + attackerWeapon.criticalChance) {
        return "critical";
    }
    return "hit";
}

function pos_array_to_obj(arr) {
    return {
        x : arr[0],
        y : arr[1],
    };
}

function distance_pos(a, b) {
    // takes in position objects
    return distance(
        [a.x, a.y],
        [b.x, b.y]
    );
}

function distance(a, b) {
    // taxicab metric function for this grid
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function eq_coord(a, b) {
    return a.every(
        (elem, index) => {
            return b[index] === elem
    });
}

function canTraverse(gameMap, tileTranslation, entities, row, col) {
    return (
        row >= 0
        && col >= 0
        && row < gameMap.length
        && col < gameMap[row].length
        && (tileTranslation[gameMap[row][col]]?.traversable ?? false)
        && entities.every(e => {
            return ((row != e.position.x) || (col != e.position.y)) && e.internalState.alive;
        })
    );
}

function processCamera(camera) {
    if (camera.moveLeft) {
        camera.x += camera.speed;
        camera.mouseX -= camera.speed;
    } else if (camera.moveRight) {
        camera.x -= camera.speed;
        camera.mouseX += camera.speed;
    } else if (camera.moveUp) {
        camera.y += camera.speed;
        camera.mouseY -= camera.speed;
    } else if (camera.moveDown) {
        camera.y -= camera.speed;
        camera.mouseY += camera.speed;
    }
}

function generatePath(gameMap, tileTranslation, entities, origin, dest) {
    if (!canTraverse(gameMap, tileTranslation, entities, dest[0], dest[1])) {
        // there is no point in exploring the entire map if the destination node isn't valid
        return [];
    }

    // naive BFS
    let q = [origin];
    let explored = 1; // counter for debugging purposes

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
            // check if neighbor is valid
            if (canTraverse(gameMap, tileTranslation, entities, row, col)) {
                if (!visited[row][col]) {
                    visited[row][col] = [vx, vy]; // set previous node
                    explored += 1;
                    q.push([row, col]);
                }
            }
        }
    }

    let v = dest;
    let path = [dest];
    while (!eq_coord(visited[v[0]][v[1]], origin)) {
        path.unshift(visited[v[0]][v[1]]);
        v = visited[v[0]][v[1]];
    }
    console.debug(`Found path by exploring ${explored} nodes`);
    return path;
}

export {
    processCamera,
    generatePath,
    eq_coord,
    enemyConstructor,
    idleConstructor,
    generateEntityCombatScore,
    generatePlayerCombatScore,
    getGameTurns,
    combatTurn
};
