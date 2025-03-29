from flask import Flask, render_template, request, session, redirect, url_for
from flask_session import Session

from gamestate import Player, make_response

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
    player = Player(player_name, 1, 2) # TODO: spawn positions
    if game_id not in gamesessions:
        # player starts new game
        gamesessions[game_id] = {
            "players" : [player]
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
