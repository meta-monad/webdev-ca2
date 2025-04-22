from flask import Flask, render_template, request, session, redirect, url_for, g
from forms import *
from werkzeug.security import generate_password_hash, check_password_hash
from flask_session import Session

from game import Player, make_response
from global_state import GlobalState
from database import get_db, close_db
from datetime import datetime
import json

app = Flask(__name__)
app.config["SECRET_KEY"] = "this-is-my-secret"
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

gamestate = GlobalState()

app.teardown_appcontext(close_db)

@app.before_request
def get_game_state():
    g.gamesessions = gamestate.get_data()

# @app.after_request
def save_game_state():
    gamestate.set_data(g.gamesessions)

def login_required(view):
    @wraps(view)
    def wrapped_view(*args, **kwargs):
        if not "user" in session:
            return redirect(url_for("login", next=request.full_path))
        return view(*args, **kwargs)
    return wrapped_view

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/instructions")
def instructions():
    return render_template("instructions.html", title="Guide")

@app.route("/register", methods=["GET", "POST"])
def register():
    form = registrationForm()
    if form.validate_on_submit():
        db = get_db()
        username = form.username.data
        password = form.password.data

        user_entry = db.execute("""
                                    SELECT *
                                    FROM users
                                    WHERE username = ?
                                """, (username,)).fetchone()
        if user_entry:
            form.username.errors.append("User already registered")
        else:
            db.execute("""
                        INSERT INTO users
                            (username, password_hash)
                        VALUES
                            (?, ?)
                       """, (username, generate_password_hash(password)))
            db.commit()
            return redirect(url_for('login'))
    return render_template("register.html", title="Registration", form=form)

@app.route("/login", methods=["GET", "POST"])
def login():
    form = loginForm()
    if form.validate_on_submit():
        db = get_db()
        username = form.username.data
        password = form.password.data
        user_entry = db.execute("""
                                    SELECT *
                                    FROM users
                                    WHERE username = ?
                                """, (username,)).fetchone()
        if not user_entry:
            form.username.errors.append("User doesn't exist")
        elif not check_password_hash(user_entry["password_hash"], password):
            form.password.errors.append("Password is incorrect")

        else:
            session.clear()
            session["user"] = dict(user_entry)
            session.modified = True
            if next_page := request.args.get("next"):
                return redirect(next_page)
            return redirect(url_for('index'))
    return render_template("login.html", title="Log in", form=form)

@app.route("/logout")
def logout():
    session.clear()
    session.modified = True
    return redirect(url_for('index'))

@app.route("/game")
def game():
    g.disabled = ""
    if "player" in session:
        g.disabled = "disabled"
        g.endurance = session["player"].endurance
        g.perception = session["player"].perception
        g.agility = session["player"].agility
    return render_template("game.html")

@app.route("/mapeditor")
def mapeditor():
    return render_template("mapeditor.html")

@app.route("/begin_session", methods=["POST"])
def begin_session():    
    user = session.get("user")

    if not user or user["username"] not in g.gamesessions:
        endurance = int(request.form["endurance"])
        perception = int(request.form["endurance"])
        agility = int(request.form["endurance"])
        if (endurance + perception + agility > 15):
            return make_response("error", "attibutes must sum to 15")
        player = Player(
                0, 0, 
                datetime.now(),
                endurance,
                perception,
                agility,
                endurance,
                endurance
        )
        new_game = {
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
        if user:
            g.gamesessions[user["username"]] = new_game
            session["player"] = player
            session.modified = True
            save_game_state()
        return make_response("success", new_game)

    else:
        session["player"] = g.gamesessions[user["username"]]["player"]
    session.modified = True
    save_game_state()

    return make_response("success", g.gamesessions[user["username"]])

@app.route("/end_session", methods=["GET"])
def end_session():
    return redirect(url_for('index'))

@app.route("/save_game", methods=["POST"])
def set_state():
    if "player" in session:
        x = int(request.form["x"])
        y = int(request.form["y"])
        hp = int(request.form["HP"])
        
        player = session["player"]
        player.update(x, y, hp) 
        session["player"] = player
        session.modified = True

        g.gamesessions[session["user"]["username"]]["player"] = player
        save_game_state()
        return make_response("success", None)
    else:
        return make_response("error", "player not in game")
