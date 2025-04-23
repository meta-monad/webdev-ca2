from flask import Flask, render_template, request, session, redirect, url_for, g
from forms import *
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from flask_session import Session

from game import Player, make_response, make_tree, make_crawler
from global_state import GlobalState
from database import get_db, close_db
from datetime import datetime
import os.path
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
        g.gamemap = session["game-map"]
        g.endurance = session["player"].endurance
        g.perception = session["player"].perception
        g.agility = session["player"].agility
    return render_template("game.html")

@app.route("/mapeditor")
def mapeditor():
    return render_template("mapeditor.html")

@app.route("/save_map", methods=["POST"])
def save_map():
    if "user" not in session:
        return make_response("error", "you must log in for this")
    map_name = request.form["name"]
    map_raw = request.form["map"]
    # user_map = [ [ int(tile) for tile in line.split(' ') ] for line in map_raw.split('\n') ]

    db = get_db()
    clash = db.execute("""
        SELECT *
        FROM maps
        WHERE creator = ?
          AND title = ?
               """, (session["user"]["username"], map_name)).fetchone()
    if not clash:
        db.execute("""
                INSERT INTO maps
                    (creator, title)
                VALUES
                    (?, ?)
        """, (session["user"]["username"], map_name))
        db.commit()
        with open(f"./static/{session['user']['username']}-{map_name}.map", "w") as f:
            f.write("spawn\n0 0\n")
            f.write("map\n")
            f.write(map_raw)
        return make_response("success", {})
    else:
        return make_response("error", "A map with this name already exists.")

@app.route("/begin_session", methods=["POST"])
def begin_session():    
    user = session.get("user")
    desired_map = request.form["game-map"]

    safe_path = os.path.join("./static/", secure_filename(desired_map + ".map"))
    if not os.path.isfile(safe_path):

        return make_response("error", "map does not exist")
    with open(safe_path, "r") as f:
        lines = f.readlines()

    lookFor = ""
    spawn = [0, 0]
    game_map = []
    trees = []
    crawlers = []
    for line in lines:
        line = line.strip()
        if line == "end":
            lookFor = ""
        elif lookFor == "spawn":
            spawn = [int(pos) for pos in line.split(' ')]
            lookFor = ""
        elif lookFor == "map":
            row = [int(tile) for tile in line.split(' ')]
            game_map.append(row)
        elif lookFor == "trees":
            tree_pos = [int(pos) for pos in line.split(' ')]
            trees.append(tree_pos)
        elif lookFor == "crawlers":
            pos = [int(pos) for pos in line.split(' ')]
            crawlers.append(pos)
        elif line == "spawn":
            lookFor = "spawn"
        elif line == "trees":
            lookFor = "trees"
        elif line == "crawlers":
            lookFor = "crawlers"
        elif line == "map":
            lookFor = "map"

    if not user or user["username"] not in g.gamesessions:
        endurance = int(request.form["endurance"])
        perception = int(request.form["endurance"])
        agility = int(request.form["endurance"])
        if (endurance + perception + agility > 15):
            return make_response("error", "attibutes must sum to 15")
        if (
            endurance < 1 or endurance > 10 or
            perception < 1 or perception > 10 or
            agility < 1 or agility > 10
        ):
            return make_response("error", "attributes must be between 1 and 10 inclusive")
        player = Player(
                spawn[0], spawn[1], 
                datetime.now(),
                endurance,
                perception,
                agility,
                5 + endurance,
                5 + endurance
        )
        entities = []
        for tree_pos in trees:
            tree = make_tree(tree_pos[0], tree_pos[1])
            entities.append(tree)
        for crawler_pos in crawlers:
            crawler = make_crawler(crawler_pos[0], crawler_pos[1])
            entities.append(crawler)

        new_game = {
            "player" : player,
            "gameMap" : game_map,
            "entities" : entities,
        }
        if user:
            g.gamesessions[user["username"]] = new_game
            session["player"] = player
            session["game-map"] = desired_map
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
        xp = int(request.form["XP"])
        
        player = session["player"]
        player.update(x, y, hp, xp) 
        session["player"] = player
        session.modified = True

        g.gamesessions[session["user"]["username"]]["player"] = player
        save_game_state()
        return make_response("success", None)
    else:
        return make_response("error", "player not in game")
