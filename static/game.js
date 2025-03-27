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

export { processCamera }; 