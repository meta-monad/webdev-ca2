const empty = () => {};

async function makeRequest(url, data, successCallback, failCallback, method="POST") {
    // let xhttp = new XMLHttpRequest();
    // xhttp.addEventListener("readystatechange", readystatechange(xhttp, successCallback, failCallback), false);
    // xhttp.open("POST", url, true);
    // xhttp.send(data);
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
        console.error(`Could not update make request: ${error.cause ?? error}`);
        failCallback(error);
    });
}

function readystatechange(xhttp, successCallback, failCallback) {
    return () => {
        if (xhttp.readyState === 4) {
            if (xhttp.status === 200) {
                successCallback(xhttp.responseText);
            } else {
                failCallback();
            }
        }
    }
}

async function getServerUpdate(callback) {
    makeRequest("./get_state", null, (responseJSON) => {
        callback(responseJSON);
    }, empty, "GET");
}

async function makeServerUpdate(player) {
    let player_data = new FormData();
    player_data.append("x", player.position.x);
    player_data.append("y", player.position.y);
    makeRequest("./set_state", player_data, empty, empty);
}

export { makeRequest, getServerUpdate, makeServerUpdate };
