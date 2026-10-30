import pymysql
from flask import Flask, render_template, request, redirect, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "palitan-mo-ito"
MAX_LEVEL = 50


def q(sql, args=(), one=False):
    con = pymysql.connect(host="localhost", user="root", password="", database="sokoban",
                          cursorclass=pymysql.cursors.DictCursor, autocommit=True)
    try:
        with con.cursor() as cur:
            cur.execute(sql, args)
            return cur.fetchone() if one else cur.fetchall()
    finally:
        con.close()


def unlocked(uid):
    r = q("SELECT COALESCE(MAX(level),0) AS m FROM progress WHERE user_id=%s", (uid,), True)
    return min(r["m"] + 1, MAX_LEVEL)


@app.route("/")
def home():
    return redirect("/dashboard" if "uid" in session else "/login")


@app.route("/register", methods=["GET", "POST"])
def register():
    err = None
    if request.method == "POST":
        u, p = request.form["username"].strip(), request.form["password"]
        if len(u) < 3 or len(p) < 6:
            err = "Username needs 3+ characters and password needs 6+."
        elif q("SELECT id FROM users WHERE username=%s", (u,), True):
            err = "That username is taken."
        else:
            q("INSERT INTO users(username,password_hash) VALUES(%s,%s)", (u, generate_password_hash(p)))
            return redirect("/login")
    return render_template("register.html", err=err)


@app.route("/login", methods=["GET", "POST"])
def login():
    err = None
    if request.method == "POST":
        row = q("SELECT * FROM users WHERE username=%s", (request.form["username"].strip(),), True)
        if row and check_password_hash(row["password_hash"], request.form["password"]):
            session["uid"], session["user"] = row["id"], row["username"]
            return redirect("/dashboard")
        err = "Wrong username or password."
    return render_template("login.html", err=err)


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")


@app.route("/dashboard")
def dashboard():
    if "uid" not in session:
        return redirect("/login")
    board = q("""SELECT u.username, COUNT(*) AS levels, SUM(p.moves) AS moves
                 FROM progress p JOIN users u ON u.id=p.user_id
                 GROUP BY u.id ORDER BY levels DESC, moves ASC LIMIT 10""")
    return render_template("dashboard.html", user=session["user"], level=unlocked(session["uid"]), board=board)


@app.route("/game")
def game():
    if "uid" not in session:
        return redirect("/login")
    top = unlocked(session["uid"])
    lv = request.args.get("level", top, type=int)
    if not 1 <= lv <= top:
        return redirect("/dashboard")
    return render_template("game.html", level=lv)


@app.post("/api/complete")
def complete():
    if "uid" not in session:
        return jsonify(error="login"), 401
    d = request.get_json(force=True)
    lv, mv = int(d["level"]), int(d["moves"])
    if not 1 <= lv <= unlocked(session["uid"]) or mv < 1:
        return jsonify(error="invalid"), 400
    q("""INSERT INTO progress(user_id,level,moves) VALUES(%s,%s,%s)
         ON DUPLICATE KEY UPDATE moves=LEAST(moves, VALUES(moves))""", (session["uid"], lv, mv))
    return jsonify(next=min(lv + 1, MAX_LEVEL), done=lv >= MAX_LEVEL)


if __name__ == "__main__":
    app.run(debug=True)