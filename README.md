# Seva — find the failure before the form does

An **application-preflight layer** for Indian public services, built as an
independent concept around the income-certificate journey reachable through
UMANG's Telangana MeeSeva services.

> **Independent prototype.** Not affiliated with, endorsed by, or connected to
> UMANG, MeeSeva, Telangana or any government body. The service rules, the
> DigiLocker account and its documents, the reading of an uploaded file and the
> submission are all synthetic demonstration data. No government system is ever
> contacted and nothing is submitted anywhere.

## 1. The 60-second path

Open the app and press **Start 60-second demo**. No account, no API key, no
extension, no file needed.

| | |
| --- | --- |
| 1 | *"Rahul needs an income certificate for a scholarship."* → **Start 60-second demo** |
| 2 | **"This simulated journey would first stop at income proof — At: Enclosures"** |
| 3 | **Fix this first** → adds the built-in synthetic salary slip |
| 4 | The name on it reads differently → **Confirm this is me** |
| 5 | **Fix this first** → adds the photograph → **No configured blocker remains** |
| 6 | **Continue to mock form** → already prefilled, documents already mapped |
| 7 | **Submit simulation** → a fictional reference, and *"No government system was contacted"* |
| 8 | **Reset demo** in the header returns to the start |

`server/src/__tests__/demoPath.test.ts` asserts every step of that. If it goes
red, the demo is showing something the build cannot do.

## 2. The problem, and the feature

A checklist tells you *what is required*. It cannot tell you *where your
documents will fail*. The expensive moment is discovering that after you have
started — at the enclosures step, nine screens in, with the wrong document.

**Rejection Autopsy** answers the question a checklist cannot:

> If you applied right now, where would this stop, at which step, and what is
> the shortest way past it?

`buildRejectionAutopsy(service, readiness)` in
`server/src/domain/rejectionAutopsy.ts` is a pure function projecting current
readiness onto the service's configured stops (`rejectionRules` in
`server/src/data/services.ts`). Its constraints, each with a test:

- Only requirements that are genuinely unsettled can produce a stop.
- Ordering comes from explicit `order` following the mock form, never array position.
- A rule naming an `issueCode` only fires when that issue is open, and beats the
  general rule for the same requirement.
- `clear` is taken from `readiness.readyToApply` — **never** inferred from an
  empty findings list, because empty can also mean the rules are incomplete.
- A requirement that is unsettled with **no configured rule** goes to
  `unmappedRequirementIds`, and the interface says the preview is unavailable.
  It never invents a stop and never turns green.
- Every response carries `simulated: true` and the ruleset version
  (`RULESET_VERSION`, shown on the card).

Readiness and the autopsy are built from **one** recomputation in
`sessionReadiness.ts`, so they cannot disagree inside a single response.

The language is deliberate throughout: *configured simulated blocker*, never
*predicted government rejection*.

### Adding a stop

Append a `RejectionRule` to that service's `rejectionRules`. Give it a
`mockStepId`/`mockStepTitle` from the service's own `applicationSteps`, an
`order`, a `simulatedMessage` for the missing case, and — for a requirement that
can be flagged rather than absent — a `reviewMessage`. No component changes.

## 3. Architecture

```
React + Vite (client)
      │  REST, same origin
      ▼
Express API (server)
      │
      ├── Readiness engine          ← deterministic, tested, no Express or AI
      ├── Document matcher          ← deterministic
      ├── Issue detector            ← deterministic
      ├── Mock DigiLocker service
      ├── Document analysis (mock)
      ├── Mock application service
      └── AI service ──► OpenAI Responses API (optional)
```

The important split:

| Deterministic system | AI system |
| --- | --- |
| What the service requires | Explaining a requirement in plain words |
| Which documents may satisfy a requirement | Explaining why a document was flagged |
| Whether a requirement is satisfied | Answering contextual questions |
| Readiness percentage and blocking issues | Translating bureaucratic language |
| Whether the application may start | — |

**A model can never introduce, remove or override a requirement.** Requirements
come from `server/src/data/services.ts`. The AI layer receives them as facts
and is instructed to explain only what it is given. The UI labels an AI answer
as *"AI explanation"* and a deterministic one as *"Explanation"*, so the two
are never confused with the requirement itself.

**A model never sees a citizen's name.** When a document is flagged, the text
the citizen reads quotes both names — theirs and the one printed on the
document — because that is the whole point of the warning. What goes to the
model is built from the issue *code* instead, so the explanation is written
without anyone's name in it. `blindness.test.ts` enforces this, and the UI has a
*"What was sent to the AI"* expander showing the literal prompt, because a
privacy claim nobody can check is a slogan. See
[docs/blind-courier.md](docs/blind-courier.md) for where this is going.

### Layout

```
shared/    TypeScript types used by both sides — one definition, no drift
server/    Express API, domain logic, mock services, tests
client/    React app
```

```
server/src/
  domain/        readinessEngine.ts · documentMatcher.ts · issueDetector.ts
  services/      aiService.ts · openaiService.ts · digilockerService.ts ·
                 documentAnalysis.ts · applicationService.ts
  repositories/  sessionRepository.ts  (in-memory, behind an interface)
  data/          services.ts · digilockerDocuments.ts · demoCitizen.ts
  routes/        one file per resource
client/src/
  features/      documents · digilocker · assistant
  pages/         one per screen
  components/ui/ the small design system
```

## 4. Install

```bash
npm install
```

Node 20 or newer. npm workspaces — one install covers all three packages.

## 5. Run both sides

```bash
npm run dev
```

- API on <http://localhost:4000>
- App on <http://localhost:5173>

Vite proxies `/api` to the API, so the client is same-origin in development and
in production. There is no CORS configuration to think about.

## 6. Run them separately

```bash
npm run dev -w server     # API only, with reload
npm run dev -w client     # Vite only (needs the API for anything to work)
```

For a single-port demo, build first and let the API serve the built client:

```bash
npm run build
npm start                 # everything on http://localhost:4000
```

## 7. Environment variables

Copy `.env.example` to `server/.env`. Every variable is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | *(unset)* | Enables model-written explanations |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model used for those explanations |
| `PORT` | `4000` | API port |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowlist for the dev server |

The key is read by the server only. It is never exposed to the browser, and
there is no `VITE_`-prefixed variable anywhere in this project.

## 8. How the mock DigiLocker works

`server/src/services/digilockerService.ts` returns fixtures from
`server/src/data/digilockerDocuments.ts`. No network request is made. The
900 ms delay exists so the loading state is exercised in the demo, not to
imitate a real call.

The locker holds five invented records — Aadhaar, PAN, driving licence, Class 10
certificate, electricity bill — each with deliberately malformed reference
numbers (`XXXX-XXXX-0000 (synthetic)`) so they cannot be mistaken for real
identifiers. Issuers are fictional (`Demo Transport Authority (fictional)`).
Selecting a document copies it into the session; it never leaves the process.

Two of the fixtures carry the long form of the citizen's name. That is
deliberate: it is what makes the mismatch detection demonstrate something real
rather than staged.

## 9. How the OpenAI integration works

`AIService` (in `services/aiService.ts`) is an interface with three methods:
`explainRequirement`, `explainDocumentIssue`, `answerContextualQuestion`.

Two implementations:

- **`MockAIService`** — assembles answers from the same service data the
  checklist uses, plus a keyword router for common questions. Not a stub: it is
  the default, and the whole demo runs on it.
- **`OpenAIService`** — calls the OpenAI **Responses API** with a `FACTS` block
  built from the service definition and a system prompt that forbids inventing
  requirements. On any error it falls back to `MockAIService` silently.

`getAIService()` picks one at startup based on whether `OPENAI_API_KEY` is set,
and logs which. Nothing outside these two files imports the OpenAI SDK.

## 10. What is simulated

Everything touching government infrastructure:

- The service and its requirements (`data/services.ts`) — written for this demo
- The DigiLocker account, its documents, and the consent flow
- Document reading — no OCR runs; the "extracted" name is derived from what the
  citizen typed, so the mismatch demo works for any name
- The application, its reference number, and its submission
- All identifiers, issuers and metadata

Not simulated: the readiness engine, the document matcher and the issue
detector are real logic with real tests.

Uploaded files are held in memory for the length of one request and then
discarded. Nothing is written to disk.

## 11. What production would need

| Area | Prototype | Production |
| --- | --- | --- |
| Requirements | Hand-written demo data | Sourced from and versioned with the issuing department |
| DigiLocker | Fixtures | Real API, partner onboarding, consent artefacts |
| Documents | Filename and category only | Real OCR, storage with encryption at rest and a retention policy |
| Identity | None | Real authentication, consent records, audit log |
| Sessions | In-memory `Map` | A database behind the existing `SessionRepository` interface |
| Submission | Simulated | Department integration, payments, acknowledgements |
| Legal | "may satisfy in this prototype" | Reviewed statements about what is actually accepted |

The wording throughout is deliberately careful — *"may satisfy this requirement
in this prototype"*, never *"the government will accept this"*. That distinction
should survive into production.

## 12. Adding another service

It is a data exercise, not a rewrite. Add one object to the `SERVICES` array in
`server/src/data/services.ts`:

```ts
{
  id: 'ration-card',
  name: 'Ration Card',
  shortDescription: '…',
  category: 'Welfare',
  jurisdiction: 'State (simulated)',
  prototypeNotice: PROTOTYPE_NOTICE,
  status: 'available',
  estimatedMinutes: 15,
  requirements: [ /* document and information requirements */ ],
  applicationSteps: [ /* fields, documents, review */ ],
}
```

The service picker, checklist, readiness engine, matcher, issue detector,
assistant and mock form all read from that shape. No component changes.

Two things to get right in a new service:

- `acceptableDocumentTypes` — which `DocumentType`s may satisfy each document
  requirement. Add new types to `shared/src/types/document.ts` if needed.
- `prefillFrom` on application fields — links a form field to a prepared
  answer, which is what makes the form arrive pre-filled.

## 13. The browser extension

`extension/` holds a Chrome MV3 extension — see [extension/README.md](extension/README.md)
for install steps. It is the shape the product is aiming at: the website is
where you prepare, and the extension is where that preparation shows up on the
department's own page, at the moment you would otherwise have started a form you
were not ready for.

What it does:

1. Reads the visible text of any page you are on, looking for document names
   near file inputs, enclosure lists and labels. **This runs entirely in your
   browser.**
2. If a page looks like an application form asking for two or more documents, a
   small pill appears. Nothing has been sent anywhere yet.
3. Tapping **Check my documents** sends only *the document names it read* to
   `POST /api/readiness/from-page` — the same endpoint the in-app portal demo
   uses. Never the page's contents, never what you have typed, never a document.
4. The panel shows ready / needs review / missing against your checklist, and is
   honest about requirements it does not cover.

The network call lives in the service worker rather than the content script, so
the request carries the extension's own origin and the government portal is
never involved in it.

`src/link.js` runs only on Seva's own pages and copies the session id the
site already stores locally, so the panel answers against your real checklist.
Seva's own pages are skipped via a `<meta name="seva-app">` marker — apart
from `/demo/government-portal`, which exists to be helped.

The backend hook it uses:

```
POST /api/readiness/from-page
{ "serviceId": "income-certificate",
  "detectedRequirements": [{ "label": "Income proof" }] }
```

It returns the full readiness result plus per-label matches and a list of
labels it could not match. The intended flow:

```
Government portal → extension reads visible requirements
                  → POST /api/readiness/from-page
                  → readiness result rendered in an overlay
```

`/demo/government-portal` shows the same thing without installing anything, so a
demo never depends on someone loading an unpacked extension. The website works
fully without the extension; the extension is useless without the website.

## 14. Scripts

```bash
npm run dev         # API + client together
npm run build       # production client build, then a full typecheck
npm start           # serve the built client from the API on one port
npm test            # domain and API tests
npm run typecheck   # strict TypeScript across all three packages
```

## 15. Tests

```bash
npm test
```

84 tests covering the parts where being wrong actually costs something:

- **Readiness engine** — missing/needs-review/ready transitions, information
  requirements blocking readiness, the resolved-issue path, the 100% case
- **Document matcher** — acceptable types, invalid documents, per-requirement
  upload scoping, preference between candidates
- **Issue detector** — exact / variant / different names, PIN-code address
  comparison, resolved flags surviving a recompute
- **API** — validation, readable error bodies, the refusal to start or submit
  early, upload rejection, the extension endpoint, and one test that walks the
  entire journey from empty session to simulated submission
- **Rejection Autopsy** (`rejectionAutopsy.test.ts`) — stop ordering, issue-specific
  rules beating general ones, the all-clear coming only from readiness, and the
  refusal to invent a stop for an unmapped requirement
- **The demo path** (`demoPath.test.ts`) — the whole 60-second storyboard, end to end
- **Blindness** (`blindness.test.ts`) — asserts that a citizen's name and the
  name printed on their document appear in the copy they read on their own
  screen and *never* in anything sent to the model. Verified to fail against the
  commit before the fix, so it tests something real. Also covers Devanagari,
  Tamil and Bengali names
- **Regressions** (`regressions.test.ts`) — one test per bug that shipped once:
  a confirmation leaking onto a different comparison, an initial being read as a
  different person, an unconfigured service reporting itself ready, a stale
  attachment surviving submission, and an oversized upload becoming a 500

The readiness engine is pure and testable without Express or React.

## 16. Accessibility

Native `<dialog>` for every sheet (modal semantics, Escape, focus containment
without hand-rolled traps), visible focus rings, 48 px minimum touch targets,
labelled fields with `aria-describedby`, status communicated by icon *and*
written label rather than colour alone, a skip link, and
`prefers-reduced-motion` respected.

Mobile-first: single column, sticky primary action, bottom sheets, no
horizontal scrolling.
