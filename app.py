from flask import Flask, render_template, request, session
from flask_session import Session

app = Flask(__name__)
Session(app)

gamesessions = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/begin_session", methods=["POST"])
def begin_session():
    print(gamesessions)
    game_id = int(request.form["game_id"])
    player_name = request.form["player_name"]
    if game_id not in gamesessions:
        print("new game")
        gamesessions[game_id] = {
            "players" : [player_name]
        }
        
    else:
        print("existing lobby")
        if player_name in gamesessions[game_id]["players"]:
            return "error"
        else:
            gamesessions[game_id]["players"].append(player_name)
    # no premature return means success
    session["player_name"] = player_name
    session["game_id"] = game_id
    session.modified = True
    return "success"

@app.route("/end_session", methods=["POST"])
def end_sessions():
    session.clear()
    session.modified = True
    return "success"