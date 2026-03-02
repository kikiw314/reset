const DEFAULT_BLOCKED_SITES = ['youtube.com'];

async function getSettings() {
  return chrome.storage.sync.get({
    blockedSites: DEFAULT_BLOCKED_SITES,
    enabled: true,
    cooldownSeconds: 30,
  });
}

function matchesSite(hostname, site) {
  const cleanSite = site.replace(/^www\./, '').toLowerCase().trim();
  const cleanHostname = hostname.replace(/^www\./, '').toLowerCase();
  return cleanHostname === cleanSite || cleanHostname.endsWith('.' + cleanSite);
}

async function isApproved(hostname) {
  try {
    const result = await chrome.storage.session.get('approvedSites');
    const approvedSites = result.approvedSites || {};
    const key = hostname.replace(/^www\./, '');
    const entry = approvedSites[key];
    return entry && Date.now() < entry.expiresAt;
  } catch {
    return false;
  }
}

async function approveHostname(hostname, durationMs) {
  const result = await chrome.storage.session.get('approvedSites');
  const approvedSites = result.approvedSites || {};
  const key = hostname.replace(/^www\./, '');
  approvedSites[key] = { expiresAt: Date.now() + durationMs };
  await chrome.storage.session.set({ approvedSites });

  // Replace any existing alarm for this host with a fresh one
  const alarmName = 'session_expire:' + key;
  await chrome.alarms.clear(alarmName);
  chrome.alarms.create(alarmName, { delayInMinutes: durationMs / 60000 });
}

// When the alarm fires, clear the approval and kick the user out of any open tabs
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('session_expire:')) return;
  const key = alarm.name.slice('session_expire:'.length);

  const result = await chrome.storage.session.get('approvedSites');
  const approvedSites = result.approvedSites || {};
  delete approvedSites[key];
  await chrome.storage.session.set({ approvedSites });

  const { blockedSites, enabled } = await getSettings();
  if (!enabled) return;

  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (!tab.url) continue;
    try {
      const url = new URL(tab.url);
      if (blockedSites.some(site => matchesSite(url.hostname, site))) {
        const cooldownUrl =
          chrome.runtime.getURL('cooldown.html') +
          '?url=' + encodeURIComponent(tab.url);
        chrome.tabs.update(tab.id, { url: cooldownUrl });
      }
    } catch { /* skip invalid URLs */ }
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!details.url) return;

  if (
    details.url.startsWith('chrome-extension://') ||
    details.url.startsWith('chrome://') ||
    details.url.startsWith('about:')
  ) return;

  // Skip the single navigation initiated by the proceed button
  if (details.initiator && details.initiator.startsWith('chrome-extension://')) return;

  let url;
  try {
    url = new URL(details.url);
  } catch {
    return;
  }

  const { blockedSites, enabled } = await getSettings();
  if (!enabled) return;

  const isBlocked = blockedSites.some(site => matchesSite(url.hostname, site));
  if (!isBlocked) return;

  if (await isApproved(url.hostname)) return;

  const cooldownUrl =
    chrome.runtime.getURL('cooldown.html') +
    '?url=' + encodeURIComponent(details.url);

  chrome.tabs.update(details.tabId, { url: cooldownUrl });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'APPROVE_SITE') {
    approveHostname(message.hostname, message.durationMs)
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    getSettings().then(settings => sendResponse(settings));
    return true;
  }
});
