import json
from datetime import datetime

class Player:
    def __init__(self, player_name, x, y, last_update):
       self.player_name = player_name
       self.x = x
       self.y = y
       self.last_update = last_update

    # needed for .remove to work
    def __eq__(self, other):
        return self.player_name == other.player_name
    
    def __str__(self):
        return str(vars(self))

def make_response(status, extra):
    return json.dumps(
            {
                "status" : status,
                "response" : extra
            }
    )
