// game.js

document.addEventListener('DOMContentLoaded', () => {
  //Game state
  const state = { day: 1, health: 100, food: 100 };

  // Buttons and elements
  const dayEl        = document.getElementById('day');
  const healthEl     = document.getElementById('health');
  const foodEl       = document.getElementById('food');
  const restBtn      = document.getElementById('restBtn');
  const huntBtn      = document.getElementById('huntBtn');
  const roundResultEl = document.getElementById('roundResult');
  const eventTextEl  = document.getElementById('eventText');

  // Status updater
  function updateStatusUI() {
    dayEl.textContent    = state.day;
    healthEl.textContent = state.health;
    foodEl.textContent   = state.food;
  }

  //Open WebSocket to my AWS API
  const socket = new WebSocket(
    'wss://kr3dp8jyic.execute-api.us-east-1.amazonaws.com/production'
  );

  socket.onopen = () => {
    restBtn.disabled = huntBtn.disabled = false;
  };
  socket.onerror = e => console.error('WebSocket error:', e);

  //Handle Result returned from AWS
  socket.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.action === 'roundResult') {
      applyRoundResult(
        msg.result,
        msg.eventText,
        msg.healthDelta,
        msg.foodDelta
      );
    }
  };

  //Apply the round result and then roll a random event
  function applyRoundResult(resultText, eventText, healthDelta, foodDelta) {
    // 8a) Show the round result
    roundResultEl.textContent = resultText;

    //Apply Rest, Hunt or Tie effects exactly as the server decided
    if (resultText.includes('rests')) {
      state.health = Math.min(100, state.health + 5);
      state.food  -= 5;
    }
    else if (resultText.includes('hunts')) {
      state.food   -= 10;  // cost
      state.health -= 10;  // risk
    }
    else if (resultText.includes('gains 15 food')) {
      state.food += 15;
    }
    else if (resultText.includes('loses 5 health')) {
      state.health -= 5;
    }

    //Update the day & update status
    state.day++;
    updateStatusUI();

    // Display & apply the server‑picked random event
    if (eventText) {
      eventTextEl.textContent = eventText;
      state.health += healthDelta;
      state.food   += foodDelta;
    } else {
      eventTextEl.textContent = '';
    }

    // Refresh status after event
    updateStatusUI();

    // Disable voting until next round
    restBtn.disabled = huntBtn.disabled = true;

    //Clear messages and re-enable after 3 seconds(3000 milliseconds)
    setTimeout(() => {
      roundResultEl.textContent = '';
      eventTextEl.textContent   = '';
      restBtn.disabled = huntBtn.disabled = false;
    }, 3000);
  }

  // Send vote 
  function sendVote(vote) {
    socket.send(JSON.stringify({ action: 'sendVote', vote }));
    restBtn.disabled = huntBtn.disabled = true;
    console.log('Voted:', vote);
  }

  //Hook up button events
  restBtn.addEventListener('click', () => sendVote('rest'));
  huntBtn.addEventListener('click', () => sendVote('hunt'));

  //Update the status
  updateStatusUI();
});
