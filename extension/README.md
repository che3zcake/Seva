# Taiyaar browser extension

Spots a government application form in the page you are already on, works out
which documents it asks for, and tells you which of them you have ready.

This is the shape the product is aiming at. The website is where you prepare;
this is where that preparation shows up — on the department's own page, at the
moment you would otherwise have started filling in a form you were not ready for.

## What it does

1. On every page, it reads the visible text and looks for document names near
   file inputs, enclosure lists and labels. **This happens entirely in your
   browser.**
2. If a page looks like an application form asking for two or more documents, a
   small pill appears in the corner. Nothing has been sent anywhere at this point.
3. Tapping it, then **Check my documents**, sends only the *list of document
   names it read* to `POST /api/readiness/from-page` — the same endpoint the
   website's own portal demo uses.
4. The panel shows ready / needs review / missing against your Taiyaar checklist,
   and links back to fix whatever is short.

It never reads the documents themselves. It never reads form values you have
typed. It sends document *names it found on the page*, and only when you ask it to.

## Install (unpacked)

1. Start Taiyaar: `npm run dev` from the repo root.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. **Load unpacked** → choose this `extension/` folder.
4. Visit <http://localhost:5173> once. That links the extension to your checklist
   (it copies the session id the site already stores locally).
5. Open <http://localhost:5173/demo/government-portal> — the pill appears.

Works in Chrome, Edge and any Chromium browser. Firefox needs a small manifest
change (`background.scripts` instead of `service_worker`).

## Pointing it at a deployed Taiyaar

Click the extension icon, enter the address, **Save**. A non-localhost address
triggers a Chrome permission prompt for that host; the extension ships with
permission for localhost only.

## Files

```
manifest.json      MV3 manifest
src/background.js  the only code that touches the network
src/content.js     detection + the panel, in a closed shadow root
src/link.js        runs on Taiyaar itself, copies the session id across
src/popup.html/js  address and link status
```

## Why the network call lives in the service worker

A `fetch` from a content script carries the *government portal's* origin. Doing
it in the service worker instead means the request is the extension's own, the
portal is never involved, and the portal's page can never see the response.

## Known limits

- Detection is a heuristic over visible text. It will miss documents named in
  ways the pattern does not cover, and it will occasionally pick up a heading
  that is not a requirement. It reports what it matched *and* what it could not,
  so a wrong guess is visible rather than silent.
- It assumes the income-certificate service. Choosing the service from the
  detected page content is the obvious next step.
- Pages that build their form after load may need a reload for the pill to appear.
