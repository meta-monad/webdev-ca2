import os.path
import json
import game

def json_helper(obj):
    if isinstance(obj, game.Player):
        return vars(obj)
    else:
        return str(obj)

class GlobalState():
    def __init__(self, fname="global_state.json"):
        fname = os.path.join(os.path.abspath(os.path.dirname(__file__)), fname)
        self.fname = fname
        if not os.path.exists(fname):
            with open(fname, "w") as f:
                json.dump({}, f)
    
    def get_data(self):
        with open(self.fname, "r") as f: 
            data = json.load(f)
        data = { int(game_id) : v for game_id, v in data.items() } # coerce back top-level game ids for dictionary
        for game_id in data.keys():
            players_raw = data[game_id]["players"]
            data[game_id]["players"] = [ game.Player(player["player_name"], player["x"], player["y"], player["last_update"]) for player in players_raw]
        return data
    
    def set_data(self, data):
        with open(self.fname, "w") as f:
            json.dump(data, f, default=json_helper, indent=2)