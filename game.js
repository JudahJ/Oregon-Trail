//game.js

// state
const state = { day: 1, health: 100, food: 100 };

// Variables
const dayElem         = document.getElementById("day");
const healthElem      = document.getElementById("health");
const foodElem        = document.getElementById("food");
const restBtn         = document.getElementById("restBtn");
const huntBtn         = document.getElementById("huntBtn");
const roundResultElem = document.getElementById("roundResult");
const localEventElem  = document.getElementById("localEventText");

// update display
function updateUI() {
  dayElem.textContent    = state.day;
  healthElem.textContent = state.health;
  foodElem.textContent   = state.food;
}

// per‐player events
const localEvents = [
  {
    weight: 1,
    text: "Sprained ankle! Lose 10 health.",
    apply: () => { state.health = Math.max(0, state.health - 10); }
  },
  {
    weight: 1,
    text: "Fell ill! Lose 5 health and 5 food.",
    apply: () => {
      state.health = Math.max(0, state.health - 5);
      state.food   = Math.max(0, state.food   - 5);
    }
  }
];

// weighted pick (or none)
function pickLocalEvent() {
  if (Math.random() > 0.5) return null;  // 50% no event
  const total = localEvents.reduce((sum,e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (let e of localEvents) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return null;
}

// open WebSocket
const socket = new WebSocket(
  "wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production"
);
socket.onopen = () => {
  restBtn.disabled = false;
  huntBtn.disabled = false;
};
socket.onerror = e => console.error("WebSocket error", e);

// handle broadcast
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action === "roundResult") {
    applyRound(msg.result);
  }
};

function applyRound(resultText) {
  roundResultElem.textContent = resultText;

  // apply the shared round result
  if (resultText.includes("rests")) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  }
  else if (resultText.includes("hunts")) {
    state.food   -= 10;
    state.health -= 10;
  }
  else if (resultText.includes("gains")) {
    state.food += 15;
  }
  else if (resultText.includes("loses")) {
    state.health -= 5;
  }

  // advance day
  state.day++;
  updateUI();

  // per‐player random event
  const evt = pickLocalEvent();
  if (evt) {
    evt.apply();
    localEventElem.textContent = evt.text;
    updateUI();
  } else {
    localEventElem.textContent = "";
  }

  // disable until next
  restBtn.disabled = huntBtn.disabled = true;

  // reset after 3s
  setTimeout(() => {
    roundResultElem.textContent = "";
    localEventElem.textContent  = "";
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
}

// send a vote
function sendVote(vote) {
  socket.send(JSON.stringify({ action: "sendVote", vote }));
  restBtn.disabled = huntBtn.disabled = true;
}

restBtn.addEventListener("click", () => sendVote("rest"));
huntBtn.addEventListener("click", () => sendVote("hunt"));

updateUI();
