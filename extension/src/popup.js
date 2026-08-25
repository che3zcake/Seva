const DEFAULT_API = 'http://localhost:4000';

const api = document.getElementById('api');
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const saved = document.getElementById('saved');

chrome.storage.local.get(['apiBase', 'sessionId']).then((stored) => {
  api.value = stored.apiBase || DEFAULT_API;
  if (stored.sessionId) {
    dot.className = 'dot on';
    statusText.textContent = 'Linked to your checklist';
  }
});

document.getElementById('save').addEventListener('click', async () => {
  const value = (api.value || DEFAULT_API).trim().replace(/\/+$/, '');

  // A non-localhost address needs permission for that host before the service
  // worker can reach it, so ask for it here rather than failing silently later.
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(value)) {
    const granted = await chrome.permissions.request({ origins: [`${value}/*`] }).catch(() => false);
    if (!granted) {
      statusText.textContent = 'Permission for that address was declined';
      dot.className = 'dot off';
      return;
    }
  }

  await chrome.storage.local.set({ apiBase: value });
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1800);
});
