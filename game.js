// game.js

// game state
const state = { day: 1, health: 100, food: 100 };

// Variables 
const dayEl               = document.getElementById("day");
const healthEl            = document.getElementById("health");
const foodEl              = document.getElementById("food");
const restBtn             = document.getElementById("restBtn");
const huntBtn             = document.getElementById("huntBtn");
const roundResultEl       = document.getElementById("roundResult");
const actionDescriptionEl = document.getElementById("actionDescription");
const localDescriptionEl  = document.getElementById("localEventDescription");

// update the  players' stats
function updateUI() {
  dayEl.textContent    = state.day;
  healthEl.textContent = state.health;
  foodEl.textContent   = state.food;

  if (state.health <= 0) {
    roundResultEl.textContent = "You died!";
    restBtn.disabled = huntBtn.disabled = true;
  }
  if (state.food <= 0) {
    roundResultEl.textContent = "You starved!";
    restBtn.disabled = huntBtn.disabled = true;
  }
}

// Player events
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

// 50% chance for a local event
function pickLocalEvent() {
  if (Math.random() > 0.5) return null;
  return localEvents[Math.floor(Math.random() * localEvents.length)];
}

// open WebSocket
const socket = new WebSocket(
  "wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production"
);

socket.onopen = () => {
  restBtn.disabled = false;
  huntBtn.disabled = false;
};
socket.onerror = e => console.error("WebSocket error:", e);

// AWS sends a message
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action !== "roundResult") return;

  // clear texts
  actionDescriptionEl.textContent = "";
  localDescriptionEl.textContent  = "";

  // show the round result
  roundResultEl.textContent = msg.result;

  // apply rest/hunt/tie 
  if (msg.result.includes("rests")) {
    state.health = Math.min(100, state.health + 5);
    state.food   = Math.max(0, state.food - 5);
    actionDescriptionEl.textContent = "You rested: +5 health, –5 lbs food.";
  }
  else if (msg.result.includes("hunts")) {
    // cost to hunt: –10 lbs
    state.food = Math.max(0, state.food - 10);
    if (Math.random() < 0.5) {
      state.food += 20;
      actionDescriptionEl.textContent = "You went hunting and found 20 lbs of food!";
    } else {
      actionDescriptionEl.textContent = "You went hunting and found nothing (–10 lbs).";
    }
  }
  else {
    state.food += 15;
    actionDescriptionEl.textContent = "Tie—coin flip gave you 15 lbs of food.";
  }

  // next day
  state.day++;
  updateUI();

  // local event
  const evt = pickLocalEvent();
  if (evt) {
    evt.apply();
    localDescriptionEl.textContent = evt.text;
    updateUI();
  }

  // disable until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear and re‑enable after 3 s
  setTimeout(() => {
    roundResultEl.textContent       = "";
    actionDescriptionEl.textContent = "";
    localDescriptionEl.textContent  = "";
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
};

// send a vote
function sendVote(vote) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "sendVote", vote }));
    restBtn.disabled = huntBtn.disabled = true;
  }
}

restBtn.addEventListener("click", () => sendVote("rest"));
huntBtn.addEventListener("click", () => sendVote("hunt"));

// first status update
updateUI();
