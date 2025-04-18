from flask import Flask, render_template, request, session, redirect, url_for, g
from flask_session import Session

from game import Player, make_response
from global_state import GlobalState
from datetime import datetime
import json

app = Flask(__name__)
app.config["SECRET_KEY"] = "this-is-my-secret"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

gamestate = GlobalState()

@app.before_request
def get_game_state():
    g.gamesessions = gamestate.get_data()

# @app.after_request
def save_game_state():
    gamestate.set_data(g.gamesessions)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/game")
def game():
    return render_template("game.html")

@app.route("/begin_session", methods=["POST"])
def begin_session():    
    player_name = request.form["player_name"]
    
    if not len(player_name.strip()):
        return make_response("error", "empty username")

    if player_name not in g.gamesessions and len(player_name):
        # player starts new game
        player = Player(2, 1, datetime.now()) # TODO: spawn positions
        g.gamesessions[player_name] = {
            "player" : player,
            "gameMap" : [
                            [1,1,2],
                            [1,3,-1],
                            [-1,1,3],
                            [1,1,1],
                            [1,1,1],
                            [1,1,1],
                            [3,3,3],
                        ],
            "entities" : [
                    {
                        "constructor" : "enemy",
                        "position" : [5,0],
                        "args" : {
                            "name" : "boogoo",
                            "attackPoints" : 5
                        }
                    }
            ]
        }

        session["player"] = player
    else:
        session["player"] = g.gamesessions[player_name]["player"]
    session["player_name"] = player_name
    session.modified = True
    save_game_state()

    return make_response("success", g.gamesessions[player_name])

@app.route("/end_session", methods=["GET"])
def end_session():
    session.clear()
    session.modified = True
    save_game_state()
    return redirect(url_for('index'))

@app.route("/save_game", methods=["POST"])
def set_state():
    if "player" in session:

        x = int(request.form["x"])
        y = int(request.form["y"])
        
        player = Player(x, y, datetime.now())
        session["player"] = player
        session.modified = True

        g.gamesessions[session["player_name"]]["player"] = player
        save_game_state()
        return make_response("success", None)
    else:
        return make_response("error", "player not in game")
