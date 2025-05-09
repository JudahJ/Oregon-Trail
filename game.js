// game.js

// state and UI refs (unchanged)
const state = { day:1, health:100, food:100 };
const day        = document.getElementById('day');
const health     = document.getElementById('health');
const food       = document.getElementById('food');
const restBtn    = document.getElementById('restBtn');
const huntBtn    = document.getElementById('huntBtn');
const roundResult= document.getElementById('roundResult');
const eventText  = document.getElementById('eventText');
const localText  = document.getElementById('localEventText');

function updateUI() {
  day.textContent = state.day;
  health.textContent = state.health;
  food.textContent = state.food;
}

const socket = new WebSocket('wss://…your‑url…');
socket.onopen  = () => restBtn.disabled = huntBtn.disabled = false;
socket.onerror = e => console.error(e);

socket.onmessage = ev => {
  const msg = JSON.parse(ev.data);
  if (msg.action !== 'roundResult') return;
  applyRound(msg.result, msg.sharedEvent);
};

function applyRound(text, sharedEvt) {
  // show vote result
  roundResult.textContent = text;

  // apply rest/hunt/tie
  if (text.includes('rests')) {
    state.health = Math.min(100, state.health + 5);
    state.food  -= 5;
  }
  else if (text.includes('hunts')) {
    state.food   -= 10;
    state.health -= 10;
  }
  else {
    state.food += 15;  // tie outcome text includes "gains 15"
  }

  // apply the server‑picked shared event
  if (sharedEvt) {
    eventText.textContent = sharedEvt.text;
    state.health += sharedEvt.healthDelta;
    state.food   += sharedEvt.foodDelta;
  } else {
    eventText.textContent = '';
  }

  // now roll only the per‑player events locally
  // (optional code for localEvents here)

  // advance day and update
  state.day++;
  updateUI();

  // disable voting
  restBtn.disabled = huntBtn.disabled = true;

  // Disable voting for 3 seconds
  setTimeout(()=>{
    roundResult.textContent = '';
    eventText.textContent   = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 10000);
}

function sendVote(v) {
  socket.send(JSON.stringify({ action:'sendVote', vote:v }));
  restBtn.disabled = huntBtn.disabled = true;
}

restBtn.addEventListener('click', ()=> sendVote('rest'));
huntBtn.addEventListener('click', ()=> sendVote('hunt'));

updateUI();
