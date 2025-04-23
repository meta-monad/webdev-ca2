const empty = () => {};

async function makeRequest(url, data, successCallback, failCallback, method="POST") {
    fetch(url, {
        method: method,
        body : data
    })
    .then((response) => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error("Server error");
        }
    })
    .then((response) => {
        if (response.status != "success") {
            throw new Error("bad request", {
                cause : response.response
            });
        } else {
            successCallback(response.response);
        }
    })
    .catch((error) => {
        console.error("Could not update make request:", error.cause ?? error);
        failCallback(error);
    });
}

async function getServerUpdate(callback) {
    return makeRequest("./get_state", null, (responseJSON) => {
        callback(responseJSON);
    }, empty, "GET");
}

async function saveGameState(player) {
    let player_data = new FormData();
    player_data.append("x", player.position.x);
    player_data.append("y", player.position.y);
    player_data.append("HP", player.health);
    player_data.append("XP", player.experience);
    return makeRequest("./save_game", player_data, empty, empty);
}

export { makeRequest, getServerUpdate, saveGameState };
