const DEFAULT_BLOCKED_SITES = ['youtube.com'];

const enabledToggle  = document.getElementById('enabled-toggle');
const durationSlider = document.getElementById('duration-slider');
const durationDisplay = document.getElementById('duration-display');
const sitesList      = document.getElementById('sites-list');
const addInput       = document.getElementById('add-input');
const addBtn         = document.getElementById('add-btn');

let settings = {
  blockedSites: DEFAULT_BLOCKED_SITES,
  enabled: true,
  cooldownSeconds: 30,
};

// --- Load settings ---
async function load() {
  settings = await chrome.storage.sync.get({
    blockedSites: DEFAULT_BLOCKED_SITES,
    enabled: true,
    cooldownSeconds: 30,
  });

  enabledToggle.checked = settings.enabled;
  durationSlider.value  = settings.cooldownSeconds;
  durationDisplay.textContent = formatDuration(settings.cooldownSeconds);
  renderSites();
}

// --- Save helpers ---
function save(patch) {
  Object.assign(settings, patch);
  chrome.storage.sync.set(patch);
}

// --- Render site list ---
function renderSites() {
  sitesList.innerHTML = '';
  settings.blockedSites.forEach(site => {
    const li = document.createElement('li');
    li.className = 'site-item';
    li.innerHTML = `
      <span title="${site}">${site}</span>
      <button data-site="${site}" title="Remove">×</button>
    `;
    li.querySelector('button').addEventListener('click', () => removeSite(site));
    sitesList.appendChild(li);
  });
}

function removeSite(site) {
  save({ blockedSites: settings.blockedSites.filter(s => s !== site) });
  renderSites();
}

function addSite() {
  const raw = addInput.value.trim().toLowerCase();
  if (!raw) return;

  // Strip protocol if pasted
  const site = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!site) return;

  if (settings.blockedSites.includes(site)) {
    addInput.select();
    return;
  }

  save({ blockedSites: [...settings.blockedSites, site] });
  renderSites();
  addInput.value = '';
}

function formatDuration(s) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

// --- Event listeners ---
enabledToggle.addEventListener('change', () => {
  save({ enabled: enabledToggle.checked });
});

durationSlider.addEventListener('input', () => {
  const val = Number(durationSlider.value);
  durationDisplay.textContent = formatDuration(val);
});

durationSlider.addEventListener('change', () => {
  save({ cooldownSeconds: Number(durationSlider.value) });
});

addBtn.addEventListener('click', addSite);

addInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addSite();
});

// --- Init ---
load();
