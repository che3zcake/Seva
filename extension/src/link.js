/**
 * Runs only on Taiyaar's own pages.
 *
 * Copies the session id the site already keeps in localStorage into extension
 * storage, so the panel on a government portal can answer against the citizen's
 * real checklist instead of an empty one. Nothing else is read.
 */
(() => {
  const sessionId = localStorage.getItem('taiyaar.sessionId');
  if (!sessionId) return;
  chrome.runtime.sendMessage({ type: 'taiyaar:link', sessionId });
})();
