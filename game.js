const cv = document.getElementById("board"), cx = cv.getContext("2d");
const LEVEL = +cv.dataset.level;
let L, boxes, p, moves, T, won;

function load() {
  L = makeLevel(LEVEL); boxes = L.boxes.slice(); p = L.p; moves = 0; won = false;
  T = Math.floor(Math.min((innerWidth - 32) / L.w, (innerHeight - 140) / L.h, 56));
  cv.width = L.w * T; cv.height = L.h * T;
  document.getElementById("moves").textContent = 0;
  document.getElementById("win").hidden = true;
  draw();
}
const pos = i => [(i % L.w) * T, Math.floor(i / L.w) * T];

function brick(x, y) {
  cx.fillStyle = "#8c3b27"; cx.fillRect(x, y, T, T); cx.fillStyle = "#2a1008";
  for (let r = 0; r < 4; r++) {
    const ry = y + r * T / 4; cx.fillRect(x, ry, T, 2);
    (r % 2 ? [T / 4, 3 * T / 4] : [T / 2]).forEach(v => cx.fillRect(x + v, ry, 2, T / 4));
  }
}
function crate(x, y, on) {
  cx.fillStyle = on ? "#5a9bff" : "#2f6fd0"; cx.fillRect(x + 3, y + 3, T - 6, T - 6);
  cx.strokeStyle = "#173f85"; cx.lineWidth = 3; cx.strokeRect(x + 4, y + 4, T - 8, T - 8);
  cx.beginPath(); cx.moveTo(x + 4, y + 4); cx.lineTo(x + T - 4, y + T - 4);
  cx.moveTo(x + T - 4, y + 4); cx.lineTo(x + 4, y + T - 4); cx.stroke();
}
function worker(x, y) {
  cx.fillStyle = "#243b6b"; cx.fillRect(x + T * .32, y + T * .78, T * .36, T * .16);
  cx.fillStyle = "#e8741a"; cx.fillRect(x + T * .28, y + T * .5, T * .44, T * .3);
  cx.fillStyle = "#f0c18f"; cx.beginPath(); cx.arc(x + T / 2, y + T * .42, T * .14, 0, 7); cx.fill();
  cx.fillStyle = "#f2b705"; cx.beginPath(); cx.arc(x + T / 2, y + T * .38, T * .18, Math.PI, 0); cx.fill();
  cx.fillRect(x + T * .27, y + T * .37, T * .46, T * .05);
}
function draw() {
  cx.clearRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < L.w * L.h; i++) {
    const [x, y] = pos(i);
    if (L.wall[i]) brick(x, y); else { cx.fillStyle = "#17130f"; cx.fillRect(x, y, T, T); }
  }
  cx.strokeStyle = "#f2b705"; cx.lineWidth = 3;
  L.goals.forEach(g => { const [x, y] = pos(g); cx.strokeRect(x + T * .3, y + T * .3, T * .4, T * .4); });
  boxes.forEach(b => crate(...pos(b), L.goals.includes(b)));
  worker(...pos(p));
}

addEventListener("keydown", e => {
  const d = { ArrowUp: -L.w, ArrowDown: L.w, ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!d) return;
  e.preventDefault();
  if (won) return;
  const n = p + d;
  if (L.wall[n]) return;
  const bi = boxes.indexOf(n);
  if (bi >= 0) {
    const m = n + d;
    if (L.wall[m] || boxes.includes(m)) return;
    boxes[bi] = m;
  }
  p = n; moves++;
  document.getElementById("moves").textContent = moves;
  draw();
  if (boxes.every(b => L.goals.includes(b))) win();
});

async function win() {
  won = true;
  let next = LEVEL, done = false;
  try {
    const r = await fetch("/api/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: LEVEL, moves })
    });
    ({ next, done } = await r.json());
  } catch (e) {}
  document.getElementById("winText").textContent = "Finished in " + moves + " moves.";
  const btn = document.getElementById("next");
  btn.textContent = done ? "Back to dashboard" : "Next level";
  btn.onclick = () => location.href = done ? "/dashboard" : "/game?level=" + next;
  document.getElementById("win").hidden = false;
}
document.getElementById("restart").onclick = load;
addEventListener("resize", () => { if (!won) load(); });
load();