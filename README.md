# Taiyaar — a government application readiness layer

**Know what you need before you start.**

Taiyaar is a preparation layer that sits *before* a government application form.
It tells a citizen what the application will ask for, checks which documents
they already have, finds what is missing, flags problems, and only then lets
them open the form.

> **This is a prototype for demonstration.** Government services, documents,
> accounts and DigiLocker data shown here are simulated using synthetic data.
> Taiyaar is an independent demonstration project, not affiliated with,
> endorsed by, or connected to any government body. Nothing is submitted
> anywhere.

---

## 1. What it does

A judge can open the app and walk this in about two minutes:

1. Choose a service (Income Certificate).
2. Answer six questions about themselves.
3. Connect a simulated DigiLocker and pick documents from it.
4. See that three of five documents are covered and two are not.
5. Upload a synthetic income document.
6. Watch the simulated reader flag a name that does not match.
7. Confirm it, upload a photograph, and reach **"You're ready to apply."**
8. Go through a four-step mock form that is already pre-filled.
9. Attach the prepared documents in one tap each.
10. Submit — simulated — and get a fake reference number.

## 2. The problem

People start long government forms without knowing what they need. Halfway in
they hit a question requiring a document they do not have. They stop, go get
it, come back, and often start over. The time is not lost to *filling* the
form — it is lost to *discovering the requirement too late*.

```
Today                          With Taiyaar
─────                          ────────────
Find service                   Choose service
Start huge form                Understand requirements
Discover required document     Check existing documents
Stop                           Retrieve what is available
Obtain document                Identify missing items
Return                         Resolve problems
Continue (or start over)       READY → start application
```

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

## 13. Adding a browser extension later

The backend hook already exists:

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

`/demo/government-portal` shows exactly this against a fictional portal page,
using the same endpoint an extension would call. No extension is needed to see
it, and the website works fully without one.

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

40 tests covering the parts where being wrong actually costs something:

- **Readiness engine** — missing/needs-review/ready transitions, information
  requirements blocking readiness, the resolved-issue path, the 100% case
- **Document matcher** — acceptable types, invalid documents, per-requirement
  upload scoping, preference between candidates
- **Issue detector** — exact / variant / different names, PIN-code address
  comparison, resolved flags surviving a recompute
- **API** — validation, readable error bodies, the refusal to start or submit
  early, upload rejection, the extension endpoint, and one test that walks the
  entire journey from empty session to simulated submission

The readiness engine is pure and testable without Express or React.

## 16. Accessibility

Native `<dialog>` for every sheet (modal semantics, Escape, focus containment
without hand-rolled traps), visible focus rings, 48 px minimum touch targets,
labelled fields with `aria-describedby`, status communicated by icon *and*
written label rather than colour alone, a skip link, and
`prefers-reduced-motion` respected.

Mobile-first: single column, sticky primary action, bottom sheets, no
horizontal scrolling.
