// game.js

// game state
const state = { day: 1, health: 100, food: 100 };

// DOM handles
const day       = document.getElementById("day");
const health    = document.getElementById("health");
const food      = document.getElementById("food");
const restBtn   = document.getElementById("restBtn");
const huntBtn   = document.getElementById("huntBtn");
const roundResult = document.getElementById("roundResult");
const eventText   = document.getElementById("eventText");
const localText   = document.getElementById("localEventText");

// update the on‑screen numbers
function updateUI() {
  day.textContent    = state.day;
  health.textContent = state.health;
  food.textContent   = state.food;
}

// per‑player events, client picks these
const localEvents = [
  { text: "Sprained ankle! Lose 10 health.",          apply: ()=> state.health = Math.max(0, state.health - 10) },
  { text: "Fell ill! Lose 5 health and 5 food.",      apply: ()=> {
      state.health = Math.max(0, state.health - 5);
      state.food   = Math.max(0, state.food   - 5);
    }
  }
];

// weighted pick helper
function pick(list) {
  const total = list.reduce((sum, e) => sum + (e.weight||1), 0);
  let r = Math.random() * total;
  for (const e of list) {
    const w = e.weight||1;
    if (r < w) return e;
    r -= w;
  }
}

// open WebSocket
const socket = new WebSocket(
  "wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production"
);

socket.onopen = () => {
  restBtn.disabled = huntBtn.disabled = false;
};

socket.onerror = e => console.error("WebSocket error", e);

// when the server broadcasts your round…
socket.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.action !== "roundResult") return;

  // show the main result
  roundResult.textContent = msg.result;

  // apply rest/hunt/tie
  if (msg.result.includes("rests")) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  } else if (msg.result.includes("hunts")) {
    state.food   -= 10;
    state.health -= 10;
  } else {
    // tie → coin flip treated by server text only
  }

  // apply the shared event the server sent
  if (msg.sharedEvent) {
    eventText.textContent = msg.sharedEvent.text;
    if (msg.sharedEvent.text.includes("Lightning")) {
      state.health = Math.max(0, state.health - 20);
    } else {
      // wolves
      state.food = Math.max(0, state.food - 10);
    }
  } else {
    eventText.textContent = "";
  }

  // pick & apply a local event
  if (Math.random() < 0.5) {
    const le = pick(localEvents);
    localText.textContent = le.text;
    le.apply();
  } else {
    localText.textContent = "";
  }

  // advance day & update display
  state.day++;
  updateUI();

  // lock buttons until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear everything & re‑enable after 3s
  setTimeout(() => {
    roundResult.textContent = "";
    eventText.textContent   = "";
    localText.textContent   = "";
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
};

// send your vote
function sendVote(vote) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({ action: "sendVote", vote }));
    restBtn.disabled = huntBtn.disabled = true;
  }
}

restBtn.addEventListener("click", () => sendVote("rest"));
huntBtn.addEventListener("click", () => sendVote("hunt"));

// initial UI
updateUI();
