(async () => {
  const CIRCUMFERENCE = 282.74; // 2π × 45

  const MESSAGES = [
    'are you sure you want to be here?',
    'maybe read, doodle, clean, write',
    'solve a crossword or text your friends !',
    'okay, fine if you really want to be here...',
    'maybe you need to do something important',
  ];

  const params = new URLSearchParams(window.location.search);
  const targetUrl = params.get('url') || '';

  let hostname = '';
  try {
    hostname = new URL(targetUrl).hostname;
  } catch { /* invalid url */ }

  // --- Fetch settings ---
  let cooldown = 30;
  try {
    const settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (settings && settings.cooldownSeconds) {
      cooldown = settings.cooldownSeconds;
    }
  } catch { /* use default */ }

  // --- DOM refs ---
  const siteNameEl    = document.getElementById('site-name');
  const timerNumEl    = document.getElementById('timer-num');
  const ringFillEl    = document.getElementById('ring-fill');
  const messageEl     = document.getElementById('message');
  const proceedBtn    = document.getElementById('proceed-btn');
  const backBtn       = document.getElementById('back-btn');
  const durationInput = document.getElementById('duration-input');
  const minutesInput  = document.getElementById('session-minutes');

  siteNameEl.textContent = hostname || targetUrl || 'this site';
  timerNumEl.textContent = cooldown;
  messageEl.textContent  = MESSAGES[0];

  // --- Timer logic ---
  let timeLeft = cooldown;
  let msgIndex = 0;
  const msgInterval = Math.max(Math.floor(cooldown / MESSAGES.length), 5);

  function updateRing() {
    const fraction = timeLeft / cooldown; // 1 → 0
    // offset shrinks as time passes (circle fills up)
    ringFillEl.style.strokeDashoffset = (CIRCUMFERENCE * fraction).toFixed(2);
  }

  function cycleMessage() {
    messageEl.classList.add('fade');
    setTimeout(() => {
      msgIndex = Math.min(msgIndex + 1, MESSAGES.length - 1);
      messageEl.textContent = MESSAGES[msgIndex];
      messageEl.classList.remove('fade');
    }, 400);
  }

  updateRing();

  const ticker = setInterval(() => {
    timeLeft--;
    timerNumEl.textContent = Math.max(timeLeft, 0);
    updateRing();

    // Rotate message every msgInterval seconds
    if (timeLeft > 0 && timeLeft % msgInterval === 0) {
      cycleMessage();
    }

    if (timeLeft <= 0) {
      clearInterval(ticker);
      timerNumEl.textContent = '✓';
      messageEl.textContent = 'how long do you want to be here?';
      durationInput.classList.add('visible');
      proceedBtn.classList.add('ready');
      proceedBtn.disabled = false;
    }
  }, 1000);

  // --- Proceed ---
  proceedBtn.addEventListener('click', async () => {
    if (!targetUrl) return;
    proceedBtn.disabled = true;
    proceedBtn.textContent = 'going…';

    const raw = parseInt(minutesInput.value, 10);
    const minutes = Math.min(Math.max(isNaN(raw) ? 10 : raw, 1), 30);
    try {
      await chrome.runtime.sendMessage({ type: 'APPROVE_SITE', hostname, durationMs: minutes * 60 * 1000 });
    } catch { /* initiator check still allows navigation */ }

    window.location.href = targetUrl;
  });

  // --- Go back ---
  backBtn.addEventListener('click', () => {
    if (history.length > 1) {
      history.back();
    } else {
      // No history: open new tab page
      chrome.tabs.update({ url: 'chrome://newtab/' });
    }
  });
})();
