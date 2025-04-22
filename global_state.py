import os.path
import json
import game

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
        for player_name in data.keys():
            player_raw = data[player_name]["player"]
            data[player_name]["player"] = game.Player(player_raw["x"], player_raw["y"], player_raw["last_update"], player_raw["health"], player_raw["maxHealth"])
        return data
    
    def set_data(self, data):
        with open(self.fname, "w") as f:
            json.dump(data, f, default=game.json_helper, indent=2)
