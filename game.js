// game.js

// --- state ---
const state = { day: 1, health: 100, food: 100 };

// --- element refs ---
const dayEl        = document.getElementById("day");
const healthEl     = document.getElementById("health");
const foodEl       = document.getElementById("food");
const restBtn      = document.getElementById("restBtn");
const huntBtn      = document.getElementById("huntBtn");
const roundResult  = document.getElementById("roundResult");
const actionDesc   = document.getElementById("actionDescription");
const localDesc    = document.getElementById("localEventDescription");

// --- update the HUD ---
function updateUI() {
  dayEl.textContent    = state.day;
  healthEl.textContent = state.health;
  foodEl.textContent   = state.food;

  if (state.health <= 0) {
    roundResult.textContent = "You died!";
    restBtn.disabled = huntBtn.disabled = true;
  }
  if (state.food <= 0) {
    roundResult.textContent = "You starved!";
    restBtn.disabled = huntBtn.disabled = true;
  }
}

// --- per-player mishaps ---
const localEvents = [
  {
    text:  "Sprained ankle! Lose 10 health.",
    apply: () => { state.health = Math.max(0, state.health - 10); }
  },
  {
    text:  "Fell ill! Lose 5 health and 5 food.",
    apply: () => {
      state.health = Math.max(0, state.health - 5);
      state.food   = Math.max(0, state.food   - 5);
    }
  }
];

// --- 50% chance for a local event ---
function pickLocalEvent() {
  if (Math.random() > 0.5) return null;
  return localEvents[Math.floor(Math.random() * localEvents.length)];
}

// --- open WebSocket ---
const socket = new WebSocket(
  "wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production"
);

socket.onopen = () => {
  restBtn.disabled = false;
  huntBtn.disabled = false;
};
socket.onerror = e => console.error("WebSocket error:", e);

// --- handle server broadcast ---
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action !== "roundResult") return;

  // clear previous texts
  actionDesc.textContent = "";
  localDesc.textContent  = "";

  // show the high-level result
  roundResult.textContent = msg.result;

  // apply rest/hunt/tie logic
  if (msg.result.includes("rests")) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
    actionDesc.textContent = "You rested: +5 health, –5 lbs food.";
  }
  else if (msg.result.includes("hunts")) {
    // hunting cost + success or failure
    // cost of going out: –10 lbs
    // success: +20 lbs (net +10), failure: no gain
    state.food = Math.max(0, state.food - 10);
    if (Math.random() < 0.5) {
      state.food += 20;
      actionDesc.textContent = "You went hunting and found 20 lbs of food! (+10 net)";
    } else {
      actionDesc.textContent = "You went hunting and found nothing. (–10 lbs)";
    }
  }
  else { // tie case
    state.food += 15;
    actionDesc.textContent = "Tie—coin flip gave you 15 lbs of food.";
  }

  // advance day
  state.day++;
  updateUI();

  // local event
  const le = pickLocalEvent();
  if (le) {
    le.apply();
    localDesc.textContent = le.text;
    updateUI();
  }

  // lock buttons until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear & re-enable after 3 seconds
  setTimeout(() => {
    roundResult.textContent = "";
    actionDesc.textContent  = "";
    localDesc.textContent   = "";
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
};

// --- send a vote ---
function sendVote(vote) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "sendVote", vote }));
    restBtn.disabled = huntBtn.disabled = true;
  }
}

restBtn.addEventListener("click", () => sendVote("rest"));
huntBtn.addEventListener("click", () => sendVote("hunt"));

// initial render
updateUI();
