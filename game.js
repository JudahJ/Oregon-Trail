// game.js

// state
const state = { day: 0, health: 100, food: 100 };

// UI refs
const day         = document.getElementById('day');
const health      = document.getElementById('health');
const food        = document.getElementById('food');
const restBtn     = document.getElementById('restBtn');
const huntBtn     = document.getElementById('huntBtn');
const roundResult = document.getElementById('roundResult');
const eventText   = document.getElementById('eventText');
const localText   = document.getElementById('localEventText');

// update stats display
function updateUI() {
  day.textContent    = state.day;
  health.textContent = state.health;
  food.textContent   = state.food;
}

// local personal events
const localEvents = [
  { weight:1, text:"Sprained ankle! Lose 10 health.",      apply:()=> state.health = Math.max(0, state.health-10) },
  { weight:1, text:"Fell ill! Lose 5 health and 5 food.",  apply:()=>{
    state.health = Math.max(0, state.health-5);
    state.food   = Math.max(0, state.food-5);
  }}
];

// pick one weighted event
function pickEvent(list) {
  const total = list.reduce((s,e)=>s+e.weight,0);
  let r = Math.random()*total;
  for (const e of list) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return null;
}

// open WebSocket
const socket = new WebSocket(
  'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
);
socket.onopen  = ()=> restBtn.disabled = huntBtn.disabled = false;
socket.onerror = e => console.error(e);

// handle round result from server
socket.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.action !== 'roundResult') return;

  // sync day
  state.day = msg.day;

  // show result
  roundResult.textContent = msg.result;

  // apply rest/hunt/tie
  if (msg.result.includes('rests')) {
    state.health = Math.min(100, state.health+5);
    state.food  -= 5;
  }
  else if (msg.result.includes('hunts')) {
    state.food   -= 10;
    state.health -= 10;
  }
  else {
    state.food += 15;
  }

  // apply shared event
  if (msg.sharedEvent) {
    eventText.textContent = msg.sharedEvent.text;
    state.health += msg.sharedEvent.healthDelta;
    state.food   += msg.sharedEvent.foodDelta;
  } else {
    eventText.textContent = '';
  }

  // pick & apply personal event
  if (Math.random() < 0.5) {
    const ev = pickEvent(localEvents);
    if (ev) {
      ev.apply();
      localText.textContent = ev.text;
    }
  } else {
    localText.textContent = '';
  }

  updateUI();

  // disable until next
  restBtn.disabled = huntBtn.disabled = true;

  // clear after 3s
  setTimeout(()=>{
    roundResult.textContent = '';
    eventText.textContent   = '';
    localText.textContent   = '';
    restBtn.disabled = huntBtn.disabled = false;
  }, 3000);
};

// send vote
function sendVote(vote) {
  restBtn.disabled = huntBtn.disabled = true;
  socket.send(JSON.stringify({ action:'sendVote', vote }));
}

restBtn.addEventListener('click', ()=> sendVote('rest'));
huntBtn.addEventListener('click', ()=> sendVote('hunt'));

updateUI();
