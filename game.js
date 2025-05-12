// game.js

// game state
const state = { day: 1, health: 100, food: 100 };

// DOM references
const dayElem      = document.getElementById("day");
const healthElem   = document.getElementById("health");
const foodElem     = document.getElementById("food");
const restBtn      = document.getElementById("restBtn");
const huntBtn      = document.getElementById("huntBtn");
const roundResult  = document.getElementById("roundResult");
const actionText   = document.getElementById("eventText");
const localText    = document.getElementById("localEventText");

// update the on‑screen stats
function updateUI() {
  dayElem.textContent    = state.day;
  healthElem.textContent = state.health;
  foodElem.textContent   = state.food;

  if (state.health <= 0) {
    roundResult.textContent = "You died!";
    restBtn.disabled = huntBtn.disabled = true;
  }
  if (state.food <= 0) {
    roundResult.textContent = "You starved!";
    restBtn.disabled = huntBtn.disabled = true;
  }
}

// per‑player random mishaps
const localEvents = [
  { text: "Sprained ankle! Lose 10 health.",
    apply: () => { state.health = Math.max(0, state.health - 10); } },
  { text: "Fell ill! Lose 5 health and 5 food.",
    apply: () => {
      state.health = Math.max(0, state.health - 5);
      state.food   = Math.max(0, state.food   - 5);
    }
  }
];

// pick one local event 50% of the time
function pickLocalEvent() {
  if (Math.random() > 0.5) return null;
  return localEvents[
    Math.floor(Math.random() * localEvents.length)
  ];
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

// handle server's roundResult
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action !== "roundResult") return;

  // show the round outcome
  roundResult.textContent = msg.result;

  // apply rest/hunt/tie mechanics + food changes
  if (msg.result.includes("rests")) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
    actionText.textContent = "You rested and regained 5 health, lost 5 pounds of food.";
  }
  else if (msg.result.includes("hunts")) {
    // hunting branch: success +20, failure -10
    if (Math.random() < 0.5) {
      state.food += 20;
      actionText.textContent = "You went hunting and found 20 lbs of food!";
    } else {
      state.food = Math.max(0, state.food - 10);
      actionText.textContent = "You went hunting and found nothing (lost 10 lbs of food).";
    }
  }
  else if (msg.result.includes("tie")) {
    // tie: you choose your own event or get 15 food
    state.food += 15;
    actionText.textContent = "It was a tie—coin flip gave you 15 lbs of food.";
  }

  // advance day and update UI
  state.day++;
  updateUI();

  // local mishap
  const evt = pickLocalEvent();
  localText.textContent = "";
  if (evt) {
    evt.apply();
    localText.textContent = evt.text;
    updateUI();
  }

  // disable buttons until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear messages & re-enable after 3s
  setTimeout(() => {
    roundResult.textContent = "";
    actionText.textContent  = "";
    localText.textContent   = "";
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
};

// send a vote to AWS
function sendVote(vote) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "sendVote", vote }));
    restBtn.disabled = huntBtn.disabled = true;
  }
}

restBtn.addEventListener("click", () => sendVote("rest"));
huntBtn.addEventListener("click", () => sendVote("hunt"));

// initial UI draw
updateUI();
