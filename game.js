// game.js

// Game state
const gameState = { day: 1, health: 100, food: 100 };

// Status variables
const day = document.getElementById('day');
const health = document.getElementById('health');
const food = document.getElementById('food');
const restBtn = document.getElementById('restBtn');
const huntBtn = document.getElementById('huntBtn');
const roundResult = document.getElementById('roundResult');
const eventText = document.getElementById('eventText');

// update the stats 
function updateStatusUI() {
  day.textContent    = gameState.day;
  health.textContent = gameState.health;
  food.textContent   = gameState.food;
}

// open WebSocket
const socket = new WebSocket(
  'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
);

socket.onopen = () => {
  restBtn.disabled = huntBtn.disabled = false;
};
socket.onerror = e => console.error('WebSocket error:', e);

// Send the round result to AWS API
socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action === 'roundResult') {
    applyRoundResult(msg.result, msg.event);
  }
};

// apply vote outcome and the shared event
function applyRoundResult(resultText, evt) {
  // show vote result
  roundResult.textContent = resultText;

  // rest/hunt/tie effects
  if (resultText.includes('rests')) {
    gameState.health = Math.min(100, gameState.health + 5);
    gameState.food  -= 5;
  } else if (resultText.includes('hunts')) {
    gameState.food   -= 10;
    gameState.health -= 10;
  } else { // tie case
    gameState.food += 15;
  }

  // shared events where it affects BOTH players
  if (evt && evt.text) {
    eventText.textContent = evt.text;
    if (evt.text.includes('Lose 20 health')) {
      gameState.health = Math.max(0, gameState.health - 20);
    } else if (evt.text.includes('Lose 10 food')) {
      gameState.food = Math.max(0, gameState.food - 10);

    }
  } else {
    eventText.textContent = '';
  }

  // update the day
  gameState.day++;
  updateStatusUI();

  // disable buttons until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear & re‑enable messages after 3 seconds or 3000 milliseconds
  setTimeout(() => {
    roundResult.textContent = '';
    eventText.textContent   = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
}

// send vote to AWS 
function sendVote(vote) {
  socket.send(JSON.stringify({ action: 'sendVote', vote }));
  restBtn.disabled = huntBtn.disabled = true;
}

// hook up buttons
restBtn.addEventListener('click', () => sendVote('rest'));
huntBtn.addEventListener('click', () => sendVote('hunt'));

// Update status the first time
updateStatusUI();
