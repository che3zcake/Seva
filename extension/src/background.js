/**
 * The only part of the extension that talks to the network.
 *
 * Content scripts run in the page's origin, so a fetch from there would be a
 * cross-origin request to the Seva API. Doing it here instead means the
 * request carries the extension's host permissions and never involves the
 * government portal's origin at all.
 */

const DEFAULT_API = 'http://localhost:4000';

async function settings() {
  const stored = await chrome.storage.local.get(['apiBase', 'sessionId']);
  return {
    apiBase: (stored.apiBase || DEFAULT_API).replace(/\/+$/, ''),
    sessionId: stored.sessionId || null,
  };
}

async function checkPage(detectedRequirements) {
  const { apiBase, sessionId } = await settings();

  const response = await fetch(`${apiBase}/api/readiness/from-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionId ? { 'x-session-id': sessionId } : {}),
    },
    body: JSON.stringify({ serviceId: 'income-certificate', detectedRequirements }),
  });

  if (!response.ok) {
    let message = 'Seva could not check this page.';
    let action = 'Make sure Seva is running, then try again.';
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
      if (body?.error?.action) action = body.error.action;
    } catch {
      // Non-JSON body: the server is probably not the one we expect.
    }
    return { ok: false, message, action };
  }

  return { ok: true, data: await response.json(), apiBase, linked: Boolean(sessionId) };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'seva:check') {
    checkPage(message.detectedRequirements)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          ok: false,
          message: 'Seva is not reachable.',
          action: `Start it with "npm run dev", or set the address in the extension popup. (${error.message})`,
        }),
      );
    return true; // keep the channel open for the async reply
  }

  if (message?.type === 'seva:link') {
    chrome.storage.local.set({ sessionId: message.sessionId }).then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});
