// game.js
const state = { day:1, health:100, food:100 };
function updateStatusUI() {
  document.getElementById('day').textContent    = state.day;
  document.getElementById('health').textContent = state.health;
  document.getElementById('food').textContent   = state.food;
}

const socket = new WebSocket(
  'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
);
socket.onopen = () => {
  restBtn.disabled = huntBtn.disabled = false;
};
socket.onerror = e => console.error('WS error', e);

socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action === 'roundResult') {
    applyRoundResult(msg.result);
  }
};

function applyRoundResult(resultText) {
  roundResult.textContent = resultText;

  if (resultText.includes('rests')) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  } else if (resultText.includes('hunts')) {
    if (Math.random() < 0.5) state.food += 20;
    else                  state.health -= 10;
    state.food -= 10;
  } else {
    if (Math.random() < 0.5) state.food  += 15;
    else                    state.health -= 5;
    state.food -= 10;
  }

  state.day++;
  updateStatusUI();

  restBtn.disabled = huntBtn.disabled = true;

  setTimeout(() => {
    roundResult.textContent = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
}

const restBtn   = document.getElementById('restBtn');
const huntBtn   = document.getElementById('huntBtn');
const roundResult = document.getElementById('roundResult');

function sendVote(vote) {
  socket.send(JSON.stringify({ action:'sendVote', vote }));
  restBtn.disabled = huntBtn.disabled = true;
  console.log('voted')
}

restBtn.addEventListener('click', () => sendVote('rest'));
huntBtn.addEventListener('click', () => sendVote('hunt'));

updateStatusUI();
