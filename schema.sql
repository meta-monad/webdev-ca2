CREATE TABLE users (
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,

    PRIMARY KEY (username)
);

CREATE TABLE maps (
    map_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    creator INTEGER NOT NULL,

    PRIMARY KEY (map_id),
    FOREIGN KEY(creator) REFERENCES users(username)
);
