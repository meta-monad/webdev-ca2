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
        return data
    
    def set_data(self, data):
        with open(self.fname, "w") as f:
            json.dump(data, f, default=json_helper, indent=4)