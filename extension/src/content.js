/**
 * Runs on every page, does almost nothing on nearly all of them.
 *
 * The scan below is pure local DOM reading. Nothing is sent anywhere until the
 * citizen taps "Check my documents" - which matters, because this script has
 * permission to run on any site they visit.
 */
(() => {
  if (window.__sevaLoaded) return;
  window.__sevaLoaded = true;

  // Seva's own pages already are the checklist. The portal demo is the one
  // exception - it exists precisely to be helped.
  const isOwnApp = document.querySelector('meta[name="seva-app"]') !== null;
  if (isOwnApp && !location.pathname.startsWith('/demo/')) return;

  const DOC_PATTERN =
    /\b(aadhaar|aadhar|pan\s*card|voter\s*id|ration\s*card|driving\s*licen[cs]e|passport|birth\s*certificate|marks?\s*sheet|marksheet|transfer\s*certificate|caste\s*certificate|income\s*certificate|domicile|residence\s*proof|address\s*proof|identity\s*proof|id\s*proof|age\s*proof|date\s*of\s*birth\s*proof|photograph|passport[-\s]?size|salary\s*slip|pay\s*slip|payslip|bank\s*statement|passbook|income\s*tax\s*return|self[-\s]?declaration|affidavit|enclosure|supporting\s*document)\b/i;

  const normalise = (text) => text.replace(/\s+/g, ' ').trim().toLowerCase();

  const tidy = (text) => (text || '').replace(/\s+/g, ' ').trim();

  /**
   * An element's own text, ignoring child elements.
   *
   * Government forms overwhelmingly write `<label>Income proof<span>Attach a
   * scanned copy</span></label>`. textContent glues those together into
   * "Income proofAttach a scanned copy"; the direct text nodes give us the
   * requirement on its own.
   */
  function ownText(element) {
    return tidy(
      [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(' '),
    );
  }

  /** innerText rather than textContent: it respects rendering, so inline and
   *  block children come back separated instead of run together. */
  const visibleText = (element) => tidy(element.innerText || element.textContent);

  /** The visible text that names a file input, tried in order of reliability. */
  function labelForInput(input) {
    const label = input.labels?.[0];
    if (label) {
      const own = ownText(label);
      if (own.length >= 3) return own;
      const full = visibleText(label);
      if (full) return full;
    }

    const aria = input.getAttribute('aria-label') || input.getAttribute('title');
    if (aria?.trim()) return aria;

    const row = input.closest('tr, li, .form-group, .field, div');
    if (row) {
      const own = ownText(row);
      if (own.length >= 3) return own;
      const full = visibleText(row);
      if (full) return full;
    }
    return null;
  }

  function detectRequirements() {
    const found = new Map();

    /**
     * Keeps the most precise wording when the same requirement is found twice.
     * A file input gives us "Income proof"; the row around it often gives us
     * "Income proofAttach a scanned copy", because adjacent inline elements
     * render with no space between them. The shorter one is the requirement.
     */
    const add = (raw, source) => {
      if (!raw) return;
      const label = tidy(raw).replace(/^[*•\-–\d.\s]+/, '').slice(0, 120);
      if (label.length < 3) return;
      const key = normalise(label);

      for (const existing of [...found.keys()]) {
        if (existing === key) return;
        if (key.includes(existing)) return; // what we already have is tighter
        if (existing.includes(key)) found.delete(existing); // ours is tighter
      }
      found.set(key, { label, source });
    };

    // A file input is the strongest signal a document is being asked for.
    document.querySelectorAll('input[type="file"]').forEach((input) => {
      add(labelForInput(input), 'file-input');
    });

    // Then anything that reads like a document name and has no block children
    // of its own, so we capture the leaf label rather than a whole section.
    document
      .querySelectorAll('label, li, td, th, dt, dd, p, h3, h4, h5, span, strong, b')
      .forEach((element) => {
        const text = element.textContent;
        if (!text || text.length > 140) return;
        if (!DOC_PATTERN.test(text)) return;
        if (element.querySelector('div, p, li, table, ul, ol, section')) return;
        const own = ownText(element);
        add(own.length >= 3 && DOC_PATTERN.test(own) ? own : visibleText(element), 'label');
      });

    return [...found.values()].slice(0, 40);
  }

  /** Cheap check for "this looks like an application form". */
  function looksLikeApplication(requirements) {
    if (requirements.length < 2) return false;
    const fields = document.querySelectorAll('input, select, textarea').length;
    const hasFileInput = document.querySelector('input[type="file"]') !== null;
    const body = document.body?.innerText?.slice(0, 6000) ?? '';
    const applyish = /\b(appl(y|ication|icant)|registration|enrol|enclosure|upload|attach|submit)\b/i.test(body);
    return (fields >= 3 || hasFileInput) && applyish;
  }

  const requirements = detectRequirements();
  if (!looksLikeApplication(requirements)) return;

  // ---------------------------------------------------------------- UI ----
  // Everything lives in a shadow root so the host page's CSS cannot reach it,
  // and ours cannot leak out and break their form.
  const host = document.createElement('div');
  host.id = 'seva-root';
  host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;bottom:16px;right:16px;';
  const root = host.attachShadow({ mode: 'closed' });
  document.documentElement.appendChild(host);

  root.innerHTML = `
    <style>
      :host, * { box-sizing: border-box; }
      .wrap {
        font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        color: #16211e;
      }
      button { font: inherit; cursor: pointer; border: 0; }
      .pill {
        display: flex; align-items: center; gap: 8px;
        background: #0f5c4e; color: #fff;
        padding: 11px 15px; border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,.22);
        max-width: 300px; text-align: left;
      }
      .pill:hover { background: #0b463b; }
      .pill .dot { width: 8px; height: 8px; border-radius: 50%; background: #7fd4b8; flex: none; }
      .panel {
        width: min(340px, calc(100vw - 32px));
        background: #fff; border: 1px solid #e3e1da; border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,.24); overflow: hidden;
      }
      .head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px; background: #0f5c4e; color: #fff; padding: 12px 14px;
      }
      .head strong { font-weight: 600; font-size: 14px; }
      .x { background: transparent; color: #fff; font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 6px; }
      .x:hover { background: rgba(255,255,255,.16); }
      .body { padding: 14px; max-height: 60vh; overflow-y: auto; }
      .muted { color: #5b6b66; }
      .small { font-size: 13px; }
      .row { display: flex; gap: 9px; align-items: flex-start; padding: 7px 0; }
      .row + .row { border-top: 1px solid #f0efea; }
      .ico { width: 18px; height: 18px; border-radius: 50%; flex: none; margin-top: 2px;
             display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
      .ready   { background: #e6f3ee; color: #0f7b5f; }
      .review  { background: #fbf0dd; color: #8a5200; }
      .missing { background: #faeae7; color: #a33325; }
      .unknown { background: #f2f1ec; color: #5b6b66; }
      .name { font-weight: 500; }
      .cta {
        width: 100%; background: #0f5c4e; color: #fff;
        padding: 11px; border-radius: 10px; font-weight: 500; margin-top: 12px;
      }
      .cta:hover { background: #0b463b; }
      .ghost { background: #fff; color: #0f5c4e; border: 1px solid #cfccc2; }
      .ghost:hover { border-color: #0f5c4e; }
      .note { background: #faf9f6; border-radius: 10px; padding: 10px; font-size: 12px; color: #5b6b66; margin-top: 12px; }
      .err { background: #faeae7; border-radius: 10px; padding: 11px; }
      .err b { color: #a33325; display: block; }
      .hidden { display: none; }
      .sr-only {
        position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
        overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
      }
      .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid #cfccc2;
              border-top-color: #0f5c4e; border-radius: 50%; animation: s .8s linear infinite; }
      @keyframes s { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spin { animation-duration: 3s; } }
    </style>

    <div class="wrap">
      <button class="pill" id="pill" aria-label="Seva can help with this form">
        <span class="dot"></span>
        <span><strong>Seva</strong> can help with this form — ${requirements.length} documents asked for</span>
      </button>

      <div class="panel hidden" id="panel" role="dialog" aria-label="Application readiness">
        <div class="head">
          <strong>Application Readiness</strong>
          <button class="x" id="close" aria-label="Close">×</button>
        </div>
        <div class="body" id="body"></div>
      </div>
    </div>
  `;

  const $ = (id) => root.getElementById(id);
  const pill = $('pill');
  const panel = $('panel');
  const body = $('body');

  const escape = (text) =>
    text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function show(html) {
    body.innerHTML = html;
  }

  function intro() {
    show(`
      <p>This page asks for <strong>${requirements.length} documents</strong>.</p>
      <p class="muted small" style="margin-top:8px">
        Seva can tell you which ones you already have before you start filling this in.
      </p>
      <button class="cta" id="check">Check my documents</button>
      <div class="note">
        Nothing has left this page. The list above was read here in your browser, and it is only
        sent to Seva when you tap the button.
        <br><br><strong>Independent prototype.</strong> Seva is not affiliated with this website or
        with any government body, and its checklist is synthetic demonstration data.
      </div>
    `);
    $('check').addEventListener('click', check);
  }

  function check() {
    show('<p class="muted"><span class="spin"></span> &nbsp;Checking against what you have prepared…</p>');

    chrome.runtime.sendMessage({ type: 'seva:check', detectedRequirements: requirements }, (reply) => {
      if (chrome.runtime.lastError || !reply) {
        return show(`
          <div class="err">
            <b>Seva is not reachable.</b>
            <span class="small">Start it, or set its address from the extension icon.</span>
          </div>
          <button class="cta ghost" id="retry" style="margin-top:10px">Try again</button>
        `), $('retry').addEventListener('click', check);
      }

      if (!reply.ok) {
        show(`
          <div class="err"><b>${escape(reply.message)}</b><span class="small">${escape(reply.action)}</span></div>
          <button class="cta ghost" id="retry" style="margin-top:10px">Try again</button>
        `);
        $('retry').addEventListener('click', check);
        return;
      }

      render(reply);
    });
  }

  function render(reply) {
    const { matched, readiness } = reply.data;
    const known = matched.filter((m) => m.item);
    const ready = known.filter((m) => m.item.status === 'ready').length;

    const rows = matched
      .map(({ detected, item }) => {
        const status = item?.status ?? 'unknown';
        const cls = status === 'needs-review' ? 'review' : status;
        const mark = status === 'ready' ? '✓' : status === 'needs-review' ? '!' : status === 'missing' ? '○' : '?';
        const why = item ? item.reason : 'Seva does not cover this one yet.';
        return `
          <div class="row">
            <span class="ico ${cls}" aria-hidden="true">${mark}</span>
            <span>
              <span class="name">${escape(detected)}</span>
              <span class="sr-only">${status === 'needs-review' ? 'needs review' : status}</span>
              <br><span class="muted small">${escape(why)}</span>
            </span>
          </div>`;
      })
      .join('');

    const uncovered = matched.length - known.length;
    show(`
      <p><strong>${ready} of ${matched.length}</strong> documents this page asks for are ready.${
        uncovered > 0
          ? ` <span class="muted small">${uncovered} ${uncovered === 1 ? 'is' : 'are'} not covered by this prototype's checklist.</span>`
          : ''
      }</p>
      <div style="margin-top:10px">${rows}</div>
      <button class="cta" id="open">${readiness.readyToApply ? 'Open my checklist' : 'Fix what is missing'}</button>
      <div class="note">
        <strong>Independent prototype.</strong> This verdict comes from Seva's own synthetic
        checklist, not from this website and not from any government system. Seva is not affiliated
        with either. It never reads the documents themselves — only which of them exist and what
        each one is for.
        ${reply.linked ? '' : '<br><br><strong>Not linked yet.</strong> Open Seva once and this panel will use your real checklist.'}
      </div>
    `);

    $('open').addEventListener('click', () => {
      window.open(`${reply.apiBase.replace(':4000', ':5173')}/prepare/income-certificate/documents`, '_blank', 'noopener');
    });
  }

  pill.addEventListener('click', () => {
    pill.classList.add('hidden');
    panel.classList.remove('hidden');
    intro();
  });

  $('close').addEventListener('click', () => {
    panel.classList.add('hidden');
    pill.classList.remove('hidden');
  });
})();
