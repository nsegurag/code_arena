from flask import Flask, render_template, jsonify
import json
import os

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/questions")
def get_questions():
    questions_path = os.path.join(BASE_DIR, "data", "questions.json")

    with open(questions_path, "r", encoding="utf-8") as file:
        questions = json.load(file)

    return jsonify(questions)


if __name__ == "__main__":
    app.run(debug=True)