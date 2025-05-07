// game.js
document.addEventListener('DOMContentLoaded', () => {
  // Game state
  const state = { day: 1, health: 100, food: 100 };

  // Buttons and elements
  const dayEl         = document.getElementById('day');
  const healthEl      = document.getElementById('health');
  const foodEl        = document.getElementById('food');
  const restBtn       = document.getElementById('restBtn');
  const huntBtn       = document.getElementById('huntBtn');
  const roundResultEl = document.getElementById('roundResult');
  const eventTextEl   = document.getElementById('eventText');

  // Status updater
  function updateStatusUI() {
    dayEl.textContent    = state.day;
    healthEl.textContent = state.health;
    foodEl.textContent   = state.food;
  }

  // Weighted random events
  const randomEvents = [
    { weight:  5, text: "A bolt of lightning strikes your wagon! Lose 20 health.", apply: () => state.health = Math.max(0, state.health - 20) },
    { weight:  5, text: "A pack of wolves circles your camp! Lose 10 food.",        apply: () => state.food   = Math.max(0, state.food   - 10) },
    { weight: 10, text: "Someone sprained an ankle. Lose 10 health.",               apply: () => state.health = Math.max(0, state.health - 10) },
    { weight: 30, text: "You feel ill. Lose 5 health and 5 food.",                  apply: () => { state.health = Math.max(0, state.health - 5); state.food = Math.max(0, state.food - 5); } }
  ];

  function pickRandomEvent() {
    if (Math.random() > 0.5) return null; // 50% chance of no event
    const total = randomEvents.reduce((sum, e) => sum + e.weight, 0);
    let r = Math.random() * total;
    for (let e of randomEvents) {
      if (r < e.weight) return e;
      r -= e.weight;
    }
    return null;
  }

  // Open WebSocket
  const socket = new WebSocket(
    'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
  );
  socket.onopen = () => {
    restBtn.disabled = huntBtn.disabled = false;
  };
  socket.onerror = e => console.error('WebSocket error:', e);

  // When the server broadcasts the roundResult
  socket.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.action === 'roundResult') {
      applyRoundResult(msg.result);
    }
  };

  function applyRoundResult(resultText) {
    // 1) Show the server‑picked round result
    roundResultEl.textContent = resultText;

    // 2) Apply the exact “rest”, “hunt” or tie effects
    if (resultText.includes('rests')) {
      state.health = Math.min(100, state.health + 5);
      state.food   -= 5;
    } else if (resultText.includes('hunts')) {
      state.food   -= 10;
      state.health -= 10;
    } else if (resultText.includes('gains 15 food')) {
      state.food += 15;
    } else if (resultText.includes('loses 5 health')) {
      state.health -= 5;
    }

    // 3) Advance day & update UI
    state.day++;
    updateStatusUI();

    // 4) Roll your own random event client‑side
    const evt = pickRandomEvent();
    if (evt) {
      evt.apply();
      eventTextEl.textContent = evt.text;
      updateStatusUI();
    } else {
      eventTextEl.textContent = '';
    }

    // 5) Disable until next vote
    restBtn.disabled = huntBtn.disabled = true;

    // 6) Clear messages & re‑enable after 3s
    setTimeout(() => {
      roundResultEl.textContent = '';
      eventTextEl.textContent   = '';
      restBtn.disabled = huntBtn.disabled = false;
    }, 3000);
  }

  // Send your vote
  function sendVote(vote) {
    socket.send(JSON.stringify({ action: 'sendVote', vote }));
    restBtn.disabled = huntBtn.disabled = true;
    console.log('Voted:', vote);
  }

  // Wire up buttons
  restBtn.addEventListener('click', () => sendVote('rest'));
  huntBtn.addEventListener('click', () => sendVote('hunt'));

  // Initialize UI
  updateStatusUI();
});
