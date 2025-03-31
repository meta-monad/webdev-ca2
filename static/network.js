async function makeRequest(url, data) {
    // let xhttp = new XMLHttpRequest();
    // xhttp.addEventListener("readystatechange", readystatechange(xhttp, successCallback, failCallback), false);
    // xhttp.open("POST", url, true);
    // xhttp.send(data);
    const response = await fetch(url, {
        method: "POST",
        body : data
    });
    return response;
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

async function getServerUpdate() {
    // makeRequest();
}

export { makeRequest };
