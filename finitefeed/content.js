const PLACEHOLDER_ID = 'finite-feed-placeholder';

function createPlaceholder() {
  const el = document.createElement('div');
  el.id = PLACEHOLDER_ID;
  el.style.cssText = [
    'display: flex',
    'flex-direction: column',
    'align-items: center',
    'justify-content: center',
    'height: 60vh',
    'gap: 12px',
    'color: #aaa',
    'font-family: Roboto, Arial, sans-serif',
  ].join(';');

  el.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke="#aaa" stroke-width="2"/>
      <line x1="10" y1="10" x2="38" y2="38" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>
      <path d="M19 16l13 8-13 8V16z" fill="#aaa"/>
    </svg>
    <p style="margin:0;font-size:18px;font-weight:500">search for something</p>
    <p style="margin:0;font-size:14px;color:#777">algorithmic recommendations are hidden by finite feed</p>
  `;
  return el;
}

function removePlaceholder() {
  document.getElementById(PLACEHOLDER_ID)?.remove();
}

function onNavigate() {
  removePlaceholder();

  if (location.pathname !== '/') return;

  // Wait for the home page mount point to appear in the DOM
  const interval = setInterval(() => {
    const browse = document.querySelector('ytd-browse[page-subtype="home"]');
    if (!browse) return;

    clearInterval(interval);

    if (!document.getElementById(PLACEHOLDER_ID)) {
      browse.appendChild(createPlaceholder());
    }
  }, 100);
}

document.addEventListener('yt-navigate-finish', onNavigate);
onNavigate();
