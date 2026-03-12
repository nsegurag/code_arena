from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit, join_room
import json
import os
import random
import string

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "code-arena-secret")

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

rooms = {}


CHARACTER_CONFIGS = {
    "mage": {
        "className": "Programador",
        "emoji": "🧙‍♂️",
        "health": 100,
        "attack": 20,
        "skillName": "Código Crítico",
        "skillBonus": 15,
        "healUses": 3,
        "skillUses": 2,
    },
    "tank": {
        "className": "Ingeniero",
        "emoji": "🛡️",
        "health": 120,
        "attack": 15,
        "skillName": "Escudo de Kernel",
        "skillBonus": 12,
        "healUses": 4,
        "skillUses": 2,
    },
    "assassin": {
        "className": "Hacker",
        "emoji": "⚡",
        "health": 85,
        "attack": 25,
        "skillName": "Inyección Rápida",
        "skillBonus": 18,
        "healUses": 2,
        "skillUses": 3,
    },
}


def generate_room_code(length=5):
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=length))
        if code not in rooms:
            return code


def build_player_state(name, character_key, sid):
    config = CHARACTER_CONFIGS.get(character_key, CHARACTER_CONFIGS["mage"])
    return {
        "sid": sid,
        "name": name,
        "character": character_key,
        "className": config["className"],
        "emoji": config["emoji"],
        "health": config["health"],
        "maxHealth": config["health"],
        "attack": config["attack"],
        "level": 1,
        "exp": 0,
        "isDefending": False,
        "healUses": config["healUses"],
        "skillUses": config["skillUses"],
        "skillName": config["skillName"],
        "skillBonus": config["skillBonus"],
    }


def get_public_players(room_code):
    room = rooms[room_code]
    result = []

    for player in room["players"]:
        result.append(
            {
                "sid": player["sid"],
                "name": player["name"],
                "character": player["character"],
                "className": CHARACTER_CONFIGS.get(
                    player["character"], CHARACTER_CONFIGS["mage"]
                )["className"],
                "is_host": player["sid"] == room["host_sid"],
            }
        )

    return result


def find_opponent_sid(room, sid):
    for player_sid in room["game_state"]["players"]:
        if player_sid != sid:
            return player_sid
    return None


def get_next_turn_sid(room, current_sid):
    players = list(room["game_state"]["players"].keys())
    if len(players) < 2:
        return current_sid

    for sid in players:
        if sid != current_sid:
            return sid

    return current_sid


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/api/questions")
def get_questions():
    questions_path = os.path.join(BASE_DIR, "data", "questions.json")

    with open(questions_path, "r", encoding="utf-8") as file:
        questions = json.load(file)

    return jsonify(questions)


@socketio.on("create_room")
def handle_create_room(data):
    player_name = (data.get("playerName") or "").strip()
    character = data.get("character") or "mage"

    if not player_name:
        emit("room_error", {"message": "Debes escribir un nombre."})
        return

    room_code = generate_room_code()

    rooms[room_code] = {
        "players": [
            {
                "sid": request.sid,
                "name": player_name,
                "character": character,
            }
        ],
        "host_sid": request.sid,
        "game_started": False,
        "game_state": None,
    }

    join_room(room_code)

    emit(
        "room_created",
        {
            "roomCode": room_code,
            "players": get_public_players(room_code),
            "isHost": True,
        },
    )


@socketio.on("join_room_request")
def handle_join_room(data):
    player_name = (data.get("playerName") or "").strip()
    room_code = (data.get("roomCode") or "").strip().upper()
    character = data.get("character") or "mage"

    if not player_name:
        emit("room_error", {"message": "Debes escribir un nombre."})
        return

    if not room_code:
        emit("room_error", {"message": "Debes escribir un código de sala."})
        return

    if room_code not in rooms:
        emit("room_error", {"message": "La sala no existe."})
        return

    room = rooms[room_code]

    if room["game_started"]:
        emit("room_error", {"message": "La partida ya empezó en esa sala."})
        return

    if len(room["players"]) >= 2:
        emit("room_error", {"message": "La sala ya está llena."})
        return

    room["players"].append(
        {
            "sid": request.sid,
            "name": player_name,
            "character": character,
        }
    )

    join_room(room_code)

    emit(
        "room_joined",
        {
            "roomCode": room_code,
            "players": get_public_players(room_code),
            "isHost": False,
        },
    )

    socketio.emit(
        "room_updated",
        {
            "roomCode": room_code,
            "players": get_public_players(room_code),
            "ready": len(room["players"]) == 2,
        },
        to=room_code,
    )


@socketio.on("start_multiplayer_game")
def handle_start_multiplayer_game(data):
    room_code = (data.get("roomCode") or "").strip().upper()

    if room_code not in rooms:
        emit("room_error", {"message": "La sala no existe."})
        return

    room = rooms[room_code]

    if request.sid != room["host_sid"]:
        emit("room_error", {"message": "Solo el host puede iniciar la partida."})
        return

    if len(room["players"]) < 2:
        emit("room_error", {"message": "Faltan jugadores para iniciar."})
        return

    player_states = {}
    for player in room["players"]:
        player_states[player["sid"]] = build_player_state(
            player["name"], player["character"], player["sid"]
        )

    first_player = random.choice(room["players"])

    room["game_started"] = True
    room["game_state"] = {
        "players": player_states,
        "turnSid": first_player["sid"],
        "round": 1,
        "finished": False,
        "winnerSid": None,
        "lastActionMessage": "La partida comenzó.",
    }

    socketio.emit(
        "multiplayer_game_started",
        {
            "roomCode": room_code,
            "players": get_public_players(room_code),
            "firstTurnSid": first_player["sid"],
        },
        to=room_code,
    )

    socketio.emit(
        "multiplayer_state_update",
        {
            "state": room["game_state"],
            "hitTarget": None,
        },
        to=room_code,
    )


@socketio.on("multiplayer_action")
def handle_multiplayer_action(data):
    room_code = (data.get("roomCode") or "").strip().upper()
    action = data.get("action")
    success = bool(data.get("success"))

    if room_code not in rooms:
        emit("room_error", {"message": "La sala no existe."})
        return

    room = rooms[room_code]

    if not room["game_started"] or not room["game_state"]:
        emit("room_error", {"message": "La partida no ha iniciado."})
        return

    state = room["game_state"]

    if state["finished"]:
        emit("room_error", {"message": "La partida ya terminó."})
        return

    if request.sid != state["turnSid"]:
        emit("room_error", {"message": "No es tu turno."})
        return

    if request.sid not in state["players"]:
        emit("room_error", {"message": "No perteneces a esta partida."})
        return

    actor = state["players"][request.sid]
    opponent_sid = find_opponent_sid(room, request.sid)

    if not opponent_sid or opponent_sid not in state["players"]:
        emit("room_error", {"message": "No hay rival disponible."})
        return

    opponent = state["players"][opponent_sid]
    hit_target = None
    message = ""
    next_turn_sid = get_next_turn_sid(room, request.sid)

    if action == "attack":
        if success:
            damage = actor["attack"]
            if opponent["isDefending"]:
                damage = max(1, damage // 2)
                opponent["isDefending"] = False

            opponent["health"] = max(0, opponent["health"] - damage)
            actor["exp"] += 10
            message = f"{actor['name']} acertó y causó {damage} de daño a {opponent['name']}."
            hit_target = "enemy"
        else:
            message = f"{actor['name']} falló la pregunta y perdió el turno."

    elif action == "skill":
        if actor["skillUses"] <= 0:
            emit("room_error", {"message": "Ya no te quedan habilidades."})
            return

        if success:
            damage = actor["attack"] + actor["skillBonus"]
            if opponent["isDefending"]:
                damage = max(1, damage // 2)
                opponent["isDefending"] = False

            opponent["health"] = max(0, opponent["health"] - damage)
            actor["exp"] += 15
            actor["skillUses"] -= 1
            message = f"{actor['name']} usó {actor['skillName']} e hizo {damage} de daño."
            hit_target = "enemy"
        else:
            actor["skillUses"] -= 1
            message = f"{actor['name']} falló su habilidad especial y perdió el turno."

    elif action == "heal":
        if actor["healUses"] <= 0:
            emit("room_error", {"message": "Ya no te quedan curaciones."})
            return

        actor["healUses"] -= 1

        if success:
            heal_amount = 25
            actor["health"] = min(actor["maxHealth"], actor["health"] + heal_amount)
            message = f"{actor['name']} se curó {heal_amount} puntos de vida."
        else:
            message = f"{actor['name']} falló la curación y perdió el turno."

    elif action == "defend":
        actor["isDefending"] = True
        message = f"{actor['name']} activó defensa para reducir el próximo daño."

    else:
        emit("room_error", {"message": "Acción inválida."})
        return

    if actor["exp"] >= 30:
        actor["level"] += 1
        actor["maxHealth"] += 20
        actor["health"] = min(actor["maxHealth"], actor["health"] + 20)
        actor["attack"] += 5
        actor["exp"] = 0
        message += f" {actor['name']} subió a nivel {actor['level']}."

    if opponent["health"] <= 0:
        state["finished"] = True
        state["winnerSid"] = request.sid
        state["lastActionMessage"] = f"{message} {actor['name']} ganó la partida."
        state["turnSid"] = None
    else:
        state["turnSid"] = next_turn_sid
        state["round"] += 1
        state["lastActionMessage"] = message

    socketio.emit(
        "multiplayer_state_update",
        {
            "state": state,
            "hitTarget": hit_target,
        },
        to=room_code,
    )


@socketio.on("disconnect")
def handle_disconnect():
    room_to_delete = None

    for room_code, room in list(rooms.items()):
        player_to_remove = None

        for player in room["players"]:
            if player["sid"] == request.sid:
                player_to_remove = player
                break

        if player_to_remove:
            room["players"].remove(player_to_remove)

            if room.get("game_state") and request.sid in room["game_state"]["players"]:
                del room["game_state"]["players"][request.sid]

                if not room["game_state"]["finished"]:
                    remaining_sids = list(room["game_state"]["players"].keys())
                    if remaining_sids:
                        room["game_state"]["finished"] = True
                        room["game_state"]["winnerSid"] = remaining_sids[0]
                        room["game_state"]["turnSid"] = None
                        room["game_state"]["lastActionMessage"] = (
                            f"{player_to_remove['name']} salió de la partida. El rival gana."
                        )

                        socketio.emit(
                            "multiplayer_state_update",
                            {
                                "state": room["game_state"],
                                "hitTarget": None,
                            },
                            to=room_code,
                        )

            socketio.emit(
                "player_left",
                {
                    "roomCode": room_code,
                    "message": f"{player_to_remove['name']} salió de la sala."
                },
                to=room_code,
            )

            if len(room["players"]) == 0:
                room_to_delete = room_code
            else:
                if room["host_sid"] == request.sid:
                    room["host_sid"] = room["players"][0]["sid"]

                socketio.emit(
                    "room_updated",
                    {
                        "roomCode": room_code,
                        "players": get_public_players(room_code),
                        "ready": len(room["players"]) == 2 and not room["game_started"],
                    },
                    to=room_code,
                )

    if room_to_delete:
        del rooms[room_to_delete]


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    socketio.run(
        app,
        host="0.0.0.0",
        port=port,
        debug=debug_mode,
        allow_unsafe_werkzeug=True
    )