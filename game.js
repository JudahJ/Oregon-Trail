// game.js

// 1) Game state
const state = { day: 1, health: 100, food: 100 };
function updateStatusUI() {
  document.getElementById('day').textContent    = state.day;
  document.getElementById('health').textContent = state.health;
  document.getElementById('food').textContent   = state.food;
}

// 2) Wire up DOM elements
const restBtn     = document.getElementById('restBtn');
const huntBtn     = document.getElementById('huntBtn');
const roundResult = document.getElementById('roundResult');

// 3) Open WebSocket
const socket = new WebSocket(
  'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
);
socket.onopen = () => {
  restBtn.disabled = huntBtn.disabled = false;
};
socket.onerror = e => console.error('WS error', e);

// 4) Handle server‐side broadcasted result
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action === 'roundResult') {
    applyRoundResult(msg.result);
  }
};

function applyRoundResult(resultText) {
  // 4a) Show the text
  roundResult.textContent = resultText;

  // 4b) Apply effects *exactly* as the server decided
  if (resultText.includes('rests')) {
    // Server told us everyone rests
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  }
  else if (resultText.includes('hunts')) {
    // Server told us everyone hunts
    state.food   -= 10;  // cost of travel/shot
    state.health -= 10;  // risk penalty
    // and perhaps server gave bonus: we could parse more if needed
  }
  else if (resultText.includes('gains 15 food')) {
    // Tie and lucky flip
    state.food += 15;
  }
  else if (resultText.includes('loses 5 health')) {
    // Tie and unlucky flip
    state.health -= 5;
  }

  // 4c) Advance the day + UI
  state.day++;
  updateStatusUI();

  // 4d) Disable until next vote
  restBtn.disabled = huntBtn.disabled = true;

  // 4e) Clear result + re-enable after 3s
  setTimeout(() => {
    roundResult.textContent = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
}

// 5) Send vote helper
function sendVote(vote) {
  socket.send(JSON.stringify({ action: 'sendVote', vote }));
  restBtn.disabled = huntBtn.disabled = true;
  console.log('Voted:', vote);
}

// 6) Hook up buttons
restBtn.addEventListener('click', () => sendVote('rest'));
huntBtn.addEventListener('click', () => sendVote('hunt'));

// 7) Initialize UI
updateStatusUI();
