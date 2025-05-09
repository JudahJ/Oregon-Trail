// game.js
document.addEventListener('DOMContentLoaded', () => {
  // game state
  const state = { day: 0, health: 100, food: 100 };

  // UI refs
  const day        = document.getElementById('day');
  const health     = document.getElementById('health');
  const food       = document.getElementById('food');
  const restBtn    = document.getElementById('restBtn');
  const huntBtn    = document.getElementById('huntBtn');
  const roundResult= document.getElementById('roundResult');
  const eventText  = document.getElementById('eventText');
  const localText  = document.getElementById('localEventText');

  // update stats on screen
  function updateUI() {
    day.textContent    = state.day;
    health.textContent = state.health;
    food.textContent   = state.food;
  }

  // personal events
  const localEvents = [
    { weight:1, text:"Sprained ankle! Lose 10 health.",     apply:()=> state.health = Math.max(0, state.health-10) },
    { weight:1, text:"Fell ill! Lose 5 health and 5 food.", apply:()=>{
        state.health = Math.max(0, state.health-5);
        state.food   = Math.max(0, state.food-5);
      }}
  ];

  // choose one by weight
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
  console.log("Connecting WebSocket…");
  const socket = new WebSocket(
    'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
  );
  socket.onopen = () => {
    console.log("WebSocket OPEN");
    restBtn.disabled = huntBtn.disabled = false;
  };
  socket.onerror = (err) => {
    console.error("WebSocket ERROR", err);
  };
  socket.onclose = () => {
    console.log("WebSocket CLOSED");
    restBtn.disabled = huntBtn.disabled = true;
  };

  // handle server message
  socket.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.action !== 'roundResult') return;
    console.log("Received roundResult:", msg);

    // sync day
    state.day = msg.day ?? state.day + 1;

    // show and apply vote result
    roundResult.textContent = msg.result;
    if (msg.result.includes('rests')) {
      state.health = Math.min(100, state.health+5);
      state.food  -= 5;
    } else if (msg.result.includes('hunts')) {
      state.food   -= 10;
      state.health -= 10;
    } else {
      state.food += 15;
    }

    // apply shared event (from server)
    if (msg.sharedEvent) {
      console.log("Applying sharedEvent", msg.sharedEvent);
      eventText.textContent = msg.sharedEvent.text;
      state.health += msg.sharedEvent.healthDelta || 0;
      state.food   += msg.sharedEvent.foodDelta   || 0;
    } else {
      eventText.textContent = '';
    }

    // apply a local random event
    if (Math.random() < 0.5) {
      const evnt = pickEvent(localEvents);
      console.log("Applying localEvent", evnt);
      evnt.apply();
      localText.textContent = evnt.text;
    } else {
      localText.textContent = '';
    }

    updateUI();

    // disable until next
    restBtn.disabled = huntBtn.disabled = true;

    // clear & re-enable
    setTimeout(() => {
      roundResult.textContent = '';
      eventText.textContent   = '';
      localText.textContent   = '';
      restBtn.disabled = huntBtn.disabled = false;
    }, 3000);
  };

  // send vote
  function sendVote(vote) {
    console.log("Attempting to send vote:", vote, "socket.readyState=", socket.readyState);
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn("Socket not open; vote not sent");
      return;
    }
    socket.send(JSON.stringify({ action: 'sendVote', vote }));
    restBtn.disabled = huntBtn.disabled = true;
  }

  restBtn.addEventListener('click', () => sendVote('rest'));
  huntBtn.addEventListener('click', () => sendVote('hunt'));

  // initial draw
  updateUI();
});
