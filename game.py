import json
from datetime import datetime

def json_helper(obj):
    if isinstance(obj, Player):
        return vars(obj)
    else:
        return str(obj)

def make_tree(x, y):
    return {
            "constructor" : "idle",
            "position" : [x,y],
            "args" : {
                "name" : "oak tree",
                "description" : "a large oak tree. Its trunk gently swaying in the wind as it reaches up into the sky.",
                "drawX" : 16,
                "drawY" : 482,
                "drawHeight" : 30,
            }
        }

def make_crawler(x, y):
    return {
            "constructor" : "enemy",
            "position" : [x,y],
            "args" : {
                "name" : "crawler",
                "description" : "an ugly green blob with a hard cap covering its head.",
                "attackPoints" : 3,
                "drawX" : 8,
                "drawY" : 502,
                "drawHeight" : 10,
            }
    }

class Player:
    def __init__(self, x, y, last_update, endurance, perception, agility, health, maxHealth = 10, experience = 0):
        self.description = """You look at yourself. Standing all alone in this barren wasteland. Will you ever make it?"""
        self.x = x
        self.y = y
        self.last_update = last_update
        self.endurance = endurance
        self.perception = perception
        self.agility = agility
        self.health = health
        self.maxHealth = maxHealth
        self.experience = experience

    def update(self, x, y, health, experience):
        self.x = x
        self.y = y
        self.health = health
        self.experience = experience

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
