from flask import Flask, render_template, request, session, redirect, url_for
from flask_session import Session

from gamestate import Player, make_response
from datetime import datetime, timedelta
import json

app = Flask(__name__)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

gamesessions = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game")
def game():
    return render_template("game.html")

@app.route("/begin_session", methods=["POST"])
def begin_session():
    game_id = int(request.form["game_id"])
    player_name = request.form["player_name"]
    player = Player(player_name, 2, 1) # TODO: spawn positions
    if game_id not in gamesessions:
        # player starts new game
        gamesessions[game_id] = {
            "players" : [player],
            "gameMap" : [
                            [1,1,2],
                            [1,3,-1],
                            [-1,1,3],
                            [3,3,3]
                        ],
        }
        
    else:
        # existing lobby
        if player_name in [player.player_name for player in gamesessions[game_id]["players"]]:
            return make_response("error", "player name already in use")
        else:
            gamesessions[game_id]["players"].append(player)
    # no premature return means success
    session["player"] = player
    session["game_id"] = game_id
    session.modified = True

    return make_response("success", vars(player))

@app.route("/end_session", methods=["GET"])
def end_session():
    if gid := session.get("game_id", None):
        gamesessions[gid]["players"].remove(session["player"])
        if not gamesessions[gid]["players"]:
            gamesessions.pop(gid)
    session.clear()
    session.modified = True
    return redirect(url_for('index'))

@app.route("/get_state", methods=["GET"])
def get_state():
    if "player" in session:
        return make_response("success", json.loads(json.dumps(gamesessions[session["game_id"]], default=vars))) # TODO: filter out extra data
    else:
        return make_response("error", "player not in game")

@app.route("/set_state", methods=["POST"])
def set_state():
    if "player" in session:
        gid = session["game_id"]
        player_index = gamesessions[gid]["players"].index(session["player"])
        player = gamesessions[gid]["players"].pop(player_index)
        x = int(request.form["x"])
        y = int(request.form["y"])
        if abs(player.x - x) + abs(player.y - y) <= 1 and (datetime.now() - datetime.fromisoformat(player.last_update)) >= timedelta(milliseconds=100):
            print("Player is moving")
            player.x = x
            player.y = y
            gamesessions[gid]["players"].append(player)
            session["player"] = player
            session.modified = True
            return make_response("success", None)
        else:
            gamesessions[gid]["players"].append(player)
            return make_response("error", "invalid game update")
    else:
        return make_response("error", "player not in game")