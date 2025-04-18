import json
from datetime import datetime

def json_helper(obj):
    if isinstance(obj, Player):
        return vars(obj)
    else:
        return str(obj)

class Player:
    def __init__(self, x, y, last_update):
        self.description = """You look at yourself. Standing all alone in this barren wasteland. Will you ever make it?"""
        self.x = x
        self.y = y
        self.last_update = last_update

    def __eq__(self, other):
        return self.player_name == other.player_name
    
    def __str__(self):
        return str(vars(self))

def make_response(status, extra):
    return json.dumps(
            {
                "status" : status,
                "response" : extra
            },
            default=json_helper
    )
