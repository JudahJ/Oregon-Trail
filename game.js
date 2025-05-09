// game.js

// game state
const state = { day: 1, health: 100, food: 100 };

// Variables
const day      = document.getElementById("day");
const health   = document.getElementById("health");
const food     = document.getElementById("food");
const restBtn  = document.getElementById("restBtn");
const huntBtn  = document.getElementById("huntBtn");
const roundResult     = document.getElementById("roundResult");
const eventText       = document.getElementById("eventText");
const localEventText  = document.getElementById("localEventText");

// update player stats
function updateStatusUI() {
  day.textContent    = state.day;
  health.textContent = state.health;
  food.textContent   = state.food;
}

// shared events (affect both players)
const sharedEvents = [
  { weight: 1, text: "Lightning strikes! You all lose 20 health.", 
    apply: () => state.health = Math.max(0, state.health - 20) },
  { weight: 1, text: "Wolves raid supplies! you all lose 10 food.",
    apply: () => state.food   = Math.max(0, state.food   - 10) }
];

// local events (only this player)
const localEvents = [
  { weight: 1, text: "Sprained ankle! You lose 10 health.", apply: () => 
    state.health = Math.max(0, state.health - 10) },
  { weight: 1, text: "Fell ill! You lose 5 health and 5 food.",apply: () => {
      state.health = Math.max(0, state.health - 5);
      state.food   = Math.max(0, state.food   - 5);
    }
  }
];

// pick one weighted event or nothing
function pickEvent(list) {
  const total = list.reduce((sum, e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (const e of list) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return null;
}

// open websocket
const socket = new WebSocket(
  "wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production"
);

socket.addEventListener("open", () => {
  restBtn.disabled = false;
  huntBtn.disabled = false;
});

socket.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.action === "roundResult") {
    applyRoundResult(msg.result);
  }
});

// apply server result, then apply random events
function applyRoundResult(text) {
  roundResult.textContent = text;

  // apply rest/hunt/tie outcome
  if (text.includes("rests")) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  } else if (text.includes("hunts")) {
    state.food   -= 10;
    state.health -= 10;
  } else if (text.includes("gains")) {
    state.food += 15;
  } else if (text.includes("loses")) {
    state.health -= 5;
  }

  // next day
  state.day++;
  updateStatusUI();

  // 50% chance for a shared event
  if (Math.random() < 0.5) {
    const evt = pickEvent(sharedEvents);
    evt.apply();
    eventText.textContent = evt.text;
    updateStatusUI();
  } else {
    eventText.textContent = "";
  }

  // 50% chance for a local event
  if (Math.random() < 0.5) {
    const evt = pickEvent(localEvents);
    evt.apply();
    localEventText.textContent = evt.text;
    updateStatusUI();
  } else {
    localEventText.textContent = "";
  }

  // disable buttons until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear texts and re-enable after 3 seconds
  setTimeout(() => {
    roundResult.textContent   = "";
    eventText.textContent     = "";
    localEventText.textContent= "";
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
}

// send your vote
function sendVote(vote) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "sendVote", vote }));
    restBtn.disabled = huntBtn.disabled = true;
  } else {
    console.warn("WebSocket not open:", socket.readyState);
  }
}

restBtn.addEventListener("click", () => sendVote("rest"));
huntBtn.addEventListener("click", () => sendVote("hunt"));

// initial render
updateStatusUI();
