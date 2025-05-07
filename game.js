// game.js

// shared game state
const state = { day: 1, health: 100, food: 100 };

// Define variables
const day = document.getElementById('day');
const health = document.getElementById('health');
const food = document.getElementById('food');
const restBtn = document.getElementById('restBtn');
const huntBtn = document.getElementById('huntBtn');
const roundResult = document.getElementById('roundResult');
const sharedText = document.getElementById('eventText');    // for lightning/wolves
const localText  = document.getElementById('localEventText'); // for sprain/illness

// update the stats
function updateStatus() {
  day.textContent    = state.day;
  health.textContent = state.health;
  food.textContent   = state.food;
}

//  random events probability
const localEvents = [
  { weight: 1, text: "Someone sprains an ankle!",    apply: () => state.health = Math.max(0, state.health - 10) },
  { weight: 2, text: "You catch a fever.",            apply: () => { state.health = Math.max(0, state.health - 5); state.food = Math.max(0, state.food - 5); } }
];
function pickLocal() {
  const total = localEvents.reduce((s,e)=>s+e.weight,0);
  let r = Math.random()*total;
  for (let e of localEvents) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return null;
}

// open WebSocket
const socket = new WebSocket(
  'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
);
socket.onopen = () => { restBtn.disabled = huntBtn.disabled = false; };
socket.onerror = e => console.error(e);

// send the round result to AWS API
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action !== 'roundResult') return;

  // apply vote outcome
  roundResult.textContent = msg.result;
  if (msg.result.includes('rests')) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  } else if (msg.result.includes('hunts')) {
    state.food   -= 10;
    state.health -= 10;
  } else {
    state.food += 15; // tie 
  }

  // apply shared wagon event
  if (msg.sharedEvent) {
    sharedText.textContent = msg.sharedEvent.text;
    if (msg.sharedEvent.text.includes('Lose 20 health')) {
      state.health = Math.max(0, state.health - 20);
    } else {
      state.food = Math.max(0, state.food - 10);
    }
  } else {
    sharedText.textContent = '';
  }

  // write random local event on screen
  const le = pickLocal();
  if (le) {
    localText.textContent = le.text;
    le.apply();
  } else {
    localText.textContent = '';
  }

  // advance day & refresh
  state.day++;
  updateStatus();

  // disable voting until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear after 3s
  setTimeout(() => {
    roundResult.textContent = '';
    sharedText.textContent  = '';
    localText.textContent   = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
};

// send vote helper
function sendVote(vote) {
  restBtn.disabled = huntBtn.disabled = true;
  socket.send(JSON.stringify({ action: 'sendVote', vote }));
}

// wire up buttons
restBtn.addEventListener('click', () => sendVote('rest'));
huntBtn.addEventListener('click', () => sendVote('hunt'));

//Update the status initially
updateStatus();
