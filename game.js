// game.js

// state
const state = { day: 1, health: 100, food: 100 };

// Stat variables
const day        = document.getElementById('day');
const health     = document.getElementById('health');
const food       = document.getElementById('food');
const restBtn    = document.getElementById('restBtn');
const huntBtn    = document.getElementById('huntBtn');
const roundResult= document.getElementById('roundResult');
const eventText  = document.getElementById('eventText');
const localText  = document.getElementById('localEventText');

// update status display
function updateUI() {
  day.textContent    = state.day;
  health.textContent = state.health;
  food.textContent   = state.food;
}

// shared wagon events
const sharedEvents = [
  { weight:1, text:"Lightning strikes! Lose 20 health.",
    apply:()=> state.health = Math.max(0, state.health-20)},
  { weight:1, text:"Wolves raid supplies! Lose 10 food.",
    apply:()=> state.food   = Math.max(0, state.food-10)}
];

// per-player events
const localEvents = [
  { weight:1, text:"Sprained ankle! Lose 10 health.",
    apply:()=> state.health = Math.max(0, state.health-10)},
  { weight:1, text:"Fell ill! Lose 5 health and 5 food.",      apply:()=> {
      state.health = Math.max(0, state.health-5);
      state.food   = Math.max(0, state.food-5);
    }
  }
];

// this will choose one weighted event or 50% chance of nothing happening
function pickEvent(list) {
  const total = list.reduce((sum,e)=>sum+e.weight,0);
  let r = Math.random()*total;
  for (let e of list) {
    if (r < e.weight) return e;
    r -= e.weight;
  }
  return null;
}

// open the AWS WebSocket
const socket = new WebSocket('wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production');
socket.onopen  = ()=> restBtn.disabled = huntBtn.disabled = false;
socket.onerror = e => console.error(e);

// Send round result to AWS
socket.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.action === 'roundResult') {
    applyRound(msg.result);
  }
};

function applyRound(text) {
  roundResult.textContent = text;

  // apply rest/hunt/tie
  if (text.includes('rests')) {
    state.health = Math.min(100, state.health+5);
    state.food  -= 5;
  }
  else if (text.includes('hunts')) {
    state.food   -= 10;
    state.health -= 10;
  }
  else if (text.includes('gains')) {
    state.food += 15;
  }
  else if (text.includes('loses')) {
    state.health -= 5;
  }

  // next day
  state.day++;
  updateUI();

// shared event 50%
if (Math.random() < 0.5) {
  // pick one of the shared events (lightning or wolves),
  // apply its effect to the shared state, and show its text
  const se = pickEvent(sharedEvents);
  se.apply();
  eventText.textContent = se.text;
  updateUI();
} else {
  // nothing happens this time
  eventText.textContent = '';
}

// local event 50%
if (Math.random() < 0.5) {
  // pick one of the personal events (sprain or illness),
  // apply its effect only to this player’s state, and show its text
  const le = pickEvent(localEvents);
  le.apply();
  localText.textContent = le.text;
  updateUI();
} else {
  // no personal mishap this round
  localText.textContent = '';
}
  // disable until next round
  restBtn.disabled = huntBtn.disabled = true;

  // clear messages and re-enable after 3s or 3000 milliseconds
  setTimeout(()=>{
    roundResult.textContent = '';
    eventText.textContent   = '';
    localText.textContent   = '';
    restBtn.disabled = huntBtn.disabled = false;
  },3000);
}

// send vote to AWS
function sendVote(v) {
  socket.send(JSON.stringify({ action:'sendVote', vote:v }));
  restBtn.disabled = huntBtn.disabled = true;
}

restBtn.addEventListener('click', ()=> sendVote('rest'));
huntBtn.addEventListener('click', ()=> sendVote('hunt'));

// update the stats
updateUI();
