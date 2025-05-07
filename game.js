// game.js

// 1) Game state
const state = { day: 1, health: 100, food: 100 };

// 2) UI elements
const dayEl           = document.getElementById('day');
const healthEl        = document.getElementById('health');
const foodEl          = document.getElementById('food');
const restBtn         = document.getElementById('restBtn');
const huntBtn         = document.getElementById('huntBtn');
const roundResultEl   = document.getElementById('roundResult');
const sharedEventEl   = document.getElementById('eventText');
const localEventEl    = document.getElementById('localEventText');

// 3) Update the status display
function updateStatusUI() {
  dayEl.textContent    = state.day;
  healthEl.textContent = state.health;
  foodEl.textContent   = state.food;
}

// 4) Define your events

// Shared‐wagon events (both players)
const sharedEvents = [
  {
    weight: 1,  // relative weights
    text:   "A bolt of lightning strikes the wagon! Lose 20 health.",
    apply:  () => state.health = Math.max(0, state.health - 20)
  },
  {
    weight: 1,
    text:   "Wolves raid the food supplies! Lose 10 food.",
    apply:  () => state.food = Math.max(0, state.food - 10)
  }
];

// Local, per‐player events
const localEvents = [
  {
    weight: 1,
    text:   "Someone sprains an ankle. Lose 10 health.",
    apply:  () => state.health = Math.max(0, state.health - 10)
  },
  {
    weight: 1,
    text:   "You feel ill. Lose 5 health and 5 food.",
    apply:  () => {
      state.health = Math.max(0, state.health - 5);
      state.food   = Math.max(0, state.food - 5);
    }
  }
];

// Utility: pick one weighted event, or return null
function pickWeightedEvent(events) {
  const total = events.reduce((sum,e) => sum + e.weight, 0);
  let r = Math.random() * total;
  for (let e of events) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return null;
}

// 5) Open WebSocket
const socket = new WebSocket(
  'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
);

socket.onopen = () => {
  restBtn.disabled = huntBtn.disabled = false;
};
socket.onerror = e => console.error('WebSocket error', e);

// 6) When the server broadcasts the round result…
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action === 'roundResult') {
    applyRoundResult(msg.result);
  }
};

// 7) Apply broadcast + roll events
function applyRoundResult(resultText) {
  // a) Show the shared rest/hunt/tie text
  roundResultEl.textContent = resultText;

  // b) Apply its mechanical effect
  if (resultText.includes('rests')) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  } 
  else if (resultText.includes('hunts')) {
    state.food   -= 10;
    state.health -= 10;
  } 
  else if (resultText.includes('gains 15 food')) {
    state.food += 15;
  } 
  else if (resultText.includes('loses 5 health')) {
    state.health -= 5;
  }

  // c) Advance day
  state.day++;
  updateStatusUI();

  // d) Roll for a shared event 50% of the time
  let sharedEvent = null;
  if (Math.random() < 0.5) {
    sharedEvent = pickWeightedEvent(sharedEvents);
    sharedEvent.apply();
    sharedEventEl.textContent = sharedEvent.text;
    updateStatusUI();
  } else {
    sharedEventEl.textContent = '';
  }

  // e) Roll for a local event 50% of the time
  let localEvent = null;
  if (Math.random() < 0.5) {
    localEvent = pickWeightedEvent(localEvents);
    localEvent.apply();
    localEventEl.textContent = localEvent.text;
    updateStatusUI();
  } else {
    localEventEl.textContent = '';
  }

  // f) Disable voting until next round
  restBtn.disabled = huntBtn.disabled = true;

  // g) After 3s clear texts and re-enable voting
  setTimeout(() => {
    roundResultEl.textContent = '';
    sharedEventEl.textContent = '';
    localEventEl.textContent  = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
}

// 8) Send your vote to the server
function sendVote(vote) {
  socket.send(JSON.stringify({ action: 'sendVote', vote }));
  restBtn.disabled = huntBtn.disabled = true;
  console.log('Voted:', vote);
}

restBtn.addEventListener('click', () => sendVote('rest'));
huntBtn.addEventListener('click', () => sendVote('hunt'));

// 9) Initial UI
updateStatusUI();
