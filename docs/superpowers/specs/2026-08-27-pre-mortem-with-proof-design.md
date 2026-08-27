# Seva Pre-Mortem with Proof

**Status:** Superseded for the hackathon time box by `2026-08-27-umang-application-preflight-design.md`
**Date:** 2026-08-27  
**Time box:** Post-submission roadmap
**Product line:** Fail here, not at the government counter—and see exactly what Seva handled.

> The official builder brief and organizer video changed the 24-hour cut line.
> Rejection Autopsy remains the core idea; Privacy X-ray, signed receipts, QR,
> and the verifier move to the post-submission roadmap so the first-round build
> can maximize citizen clarity, platform specificity, deployment reliability,
> and demo quality.

## 1. Decision

Turn Seva's current preparation journey into one memorable, defensible demo with four connected capabilities:

1. **Form Rejection Autopsy** shows the first exact *configured simulated* point at which the fictional application would stop and the shortest deterministic recovery path.
2. **Privacy X-ray** records an enum-only trace of instrumented Seva route events and states what data class crossed which boundary. It is an application trace, not a packet capture or cryptographic proof.
3. **Seva Readiness Receipt** gives a ready citizen a short-lived, tamper-evident, citizen-held record of the deterministic check without identity or document data.
4. **Requirement Drift Refusal** prevents the browser integration from showing green when the observed page contains an unknown required document or omits a configured required document.

These capabilities use the existing deterministic readiness engine as their only decision source. AI may explain a result, but it never creates an autopsy finding, readiness state, receipt claim, or portal verdict.

## 2. Outcome and success criteria

The judge should be able to repeat this sentence after the demo:

> Seva safely rehearses a rejection before the real form, helps the citizen fix it, shows the data path, and produces a privacy-safe receipt of the check.

The implementation succeeds when the following 90–120 second journey works without developer narration:

1. Open the fictional government portal and ask Seva to check the page.
2. See **“This simulated form would first stop at Income proof”** with a concrete recovery action.
3. Open Seva, add the missing document, resolve the configured name variant, and add the photograph.
4. Return to readiness and see that the simulated rejection path is clear.
5. Open Privacy X-ray and see the real instrumented boundaries: simulated locker metadata, upload bytes in request memory, deterministic processing inside Seva, and an external AI event only when AI is configured and invoked.
6. Create a Readiness Receipt, then open the fictional verifier and confirm the signature, freshness, and current ruleset.
7. Demonstrate a required unknown page label and watch Seva refuse to show green rather than pretend its rules cover the changed page.

Measurable acceptance criteria:

- Autopsy output is deterministic, versioned, recomputed from current session state, and contains a visible simulation disclaimer.
- No autopsy output is invented for a service without configured rejection rules.
- Privacy events contain only enum fields, timestamps, sequence numbers, and generated IDs—never arbitrary user text or raw values.
- Serialized privacy events contain no profile value, filename, document reference, detected page label, question, prompt, model output, or session ID.
- A receipt cannot be issued unless readiness is recomputed as ready at issuance time.
- Receipt payloads contain no session, profile, document, issue-detail, page-URL, or raw page-label data.
- Altered, expired, malformed, unknown-key, and stale-ruleset receipts never display “current readiness verified.”
- A required unknown portal label or missing configured required document forces a manual-review verdict.
- The existing citizen journey, deterministic fallback, accessibility basics, and prototype disclosures continue to work.

## 3. Scope

### P0: must ship

- Pure Rejection Autopsy domain projection and configured rules for Income Certificate.
- Autopsy card on the readiness screen and first-failure summary in both portal panels.
- Enum-only Privacy X-ray event model, bounded in-memory session trace, API, and global sheet.
- Truthful capture for profile save, simulated locker connect/select, upload receipt/handler completion, readiness evaluation, portal-label receipt, AI attempt/outcome, and simulated submission.
- Correction of privacy wording that currently overstates upload, extension, AI, or submission boundaries.
- Ruleset version and fingerprint.
- Ed25519-signed, 30-minute, ready-only Readiness Receipt.
- Fictional receipt verifier with valid-current, expired, rules-changed, and invalid states.
- Requirement-coverage verdict for `/readiness/from-page` and a refusal state in the web demo and extension.
- Unit, API, regression, build, typecheck, accessibility, and manual demo verification.

### P1: polish after P0 is green

- QR rendering for the raw receipt token using `react-qr-code`.
- Receipt copy/download affordances and browser-local convenience storage.
- Collapsible full autopsy timeline after the first failure.
- Extension copy and visual polish for manual review versus not ready.
- README architecture/demo updates and a short presenter script.

### Non-goals

- Real DigiLocker, government submission, government acceptance prediction, or official eligibility.
- OCR, document-content analysis, client-side encryption, zero-knowledge proofs, blockchain, or durable audit storage.
- Authentication, receipt revocation, long-lived credentials, key rotation UI, or production key management.
- A generalized policy engine for every government service.
- Automatic discovery of the correct service from an arbitrary portal.
- Claiming secure erasure, exact upload-deletion time, complete network observation, or hostile-portal isolation.
- Translating the product or adding more services before the core demo is complete.

## 4. Product principles

1. **Pre-mortem, not prediction.** All rejection language is a configured simulation tied to the fictional portal. UI and API carry `simulated: true`.
2. **Decision logic stays deterministic.** Existing service data, document matcher, issue detector, and readiness engine remain authoritative.
3. **Trace what happened; do not decorate a claim.** Privacy X-ray events are emitted only by code paths that performed the operation.
4. **Enum-only telemetry.** The trace schema structurally cannot accept arbitrary text or user values.
5. **Integrity is not authority.** A receipt signature proves that the token was issued by this running Seva prototype and was not altered. It does not prove identity, document possession, eligibility, or government acceptance.
6. **Refuse uncertainty.** Unknown required portal requirements prevent a green verdict.
7. **The happy path stays short.** New evidence is progressive disclosure; it must not turn the two-minute citizen journey into a compliance dashboard.

## 5. Architecture

```text
Government portal / Seva client / extension
                    │
                    │ existing REST calls
                    ▼
              Express route layer
        ┌───────────┼─────────────┐
        │           │             │
        ▼           ▼             ▼
 readinessFor()  privacy trace  receipt service
        │           │             │
        ▼           ▼             ▼
 deterministic   bounded enum   ruleset fingerprint
 readiness       event list     + Ed25519 signature
        │
        ▼
 rejectionAutopsy(service, readiness)
        │
        ├── readiness screen
        └── portal coverage verdict
```

No new database is introduced. Session state remains an in-memory prototype store. Receipts are returned to the citizen and are not persisted by the server.

## 6. Domain model

### 6.1 Rejection Autopsy

Add these shared concepts:

```ts
type DocumentIssueCode = DocumentIssue['code'];

interface RejectionRule {
  id: string;
  requirementId: string;
  issueCode?: DocumentIssueCode;
  portalStepId: string;
  portalStepTitle: string;
  order: number;
  simulatedMessage: string;
}

interface RejectionFinding {
  ruleId: string;
  requirementId: string;
  requirementTitle: string;
  requirementType: 'document' | 'information';
  portalStepId: string;
  portalStepTitle: string;
  simulatedMessage: string;
  readinessStatus: 'missing' | 'needs-review';
  recovery: string[];
}

interface RejectionAutopsy {
  simulated: true;
  firstFailure: RejectionFinding | null;
  findings: RejectionFinding[];
  clear: boolean;
  disclaimer: string;
}
```

`ServiceDefinition` gains:

- `rulesetVersion: string`, initially `income-certificate.demo.1`.
- `rejectionRules?: RejectionRule[]`; the coming-soon services may omit them.

`buildRejectionAutopsy(service, readiness)` is a new pure domain function. It:

1. Selects only readiness items with `missing` or `needs-review`.
2. Joins them to explicit service rules.
3. Uses issue-code-specific rules only when the current unresolved issue code matches.
4. Sorts by the explicit simulated portal order, never incidental array order.
5. Copies existing deterministic guidance into the recovery steps.
6. Returns no invented finding when no rule is configured.

`clear` is exactly `readiness.readyToApply`; it is never inferred from an empty
`findings` array. A not-ready service with no matching configured rule therefore
returns `clear: false`, `firstFailure: null`, and an unavailable-preview state in
the UI rather than a false all-clear.

The normal readiness endpoint returns `{ readiness, autopsy, session }`. `/readiness/from-page` returns the same autopsy so the portal overlay can show the current first failure without running a second decision path.

### 6.2 Privacy X-ray

Add a `PrivacyEvent` with no free-form fields:

```ts
type PrivacyEventKind =
  | 'session_started'
  | 'profile_fields_saved'
  | 'simulated_locker_connected'
  | 'synthetic_locker_documents_selected'
  | 'upload_bytes_received'
  | 'upload_handler_finished'
  | 'readiness_evaluated'
  | 'portal_labels_received'
  | 'model_request_attempted'
  | 'model_response_received'
  | 'deterministic_explanation_used'
  | 'simulated_application_submitted';

type PrivacyDataClass =
  | 'profile_fields'
  | 'synthetic_account_metadata'
  | 'synthetic_document_metadata'
  | 'upload_bytes'
  | 'upload_metadata'
  | 'portal_derived_labels'
  | 'service_checklist'
  | 'readiness_summary'
  | 'free_text_question'
  | 'simulated_application_values';

interface PrivacyEvent {
  id: string;
  sequence: number;
  occurredAt: string;
  kind: PrivacyEventKind;
  boundary: 'browser_to_seva' | 'inside_seva' | 'seva_to_openai' | 'simulated_only';
  destination: 'seva_api' | 'openai' | 'none';
  dataClasses: PrivacyDataClass[];
  retention: 'request_memory' | 'demo_session_memory' | 'not_retained_by_seva';
  assurance: 'code_path_observed' | 'simulated';
  outcome: 'completed' | 'attempted' | 'failed';
}
```

`SessionState` gains `privacyEvents: PrivacyEvent[]`. Repository helpers append allowlisted events, assign sequence numbers, and retain at most 50. Reset removes the trace; restarting the server removes all sessions. `GET /api/privacy/events` returns the trace and does not emit another event.

Route capture rules:

| Code path | Event truthfully recorded |
| --- | --- |
| Session bootstrap | A transient prototype session started. |
| Profile patch | Profile field values moved browser → Seva and remain in demo session memory. No values enter the trace. |
| Mock DigiLocker connect/select | Synthetic account/document metadata was generated or copied inside the prototype; no real DigiLocker network call occurred. |
| Upload accepted | Raw bytes reached Multer request memory. The application analyzer did not parse the buffer and no application code wrote it to disk. |
| Upload handler completed | The handler released its buffer reference. The UI must not call this secure deletion or claim an exact erasure time. Upload metadata remains in session memory. |
| Readiness evaluation | Profile and document metadata were processed inside Seva by deterministic code. |
| Portal check | Derived requirement labels, required/optional flags, service ID, and the bearer session header reached Seva after the explicit user action. Full page text, field values, and files were not selected by the extension request code. |
| AI explanation | If configured, record an external transfer attempt before the model call and success/failure afterward. If fallback is used without an external call, record deterministic explanation only. |
| Submission | Application values stayed in the prototype and no government endpoint was called. |

Privacy X-ray is described as “a trace of instrumented Seva code paths.” It never claims to observe all browser, extension, operating-system, proxy, provider, or hostile-page traffic.

The free-text assistant warning must say that a question typed by the citizen can be sent to OpenAI when AI is enabled. The existing guarantee is narrowed to the tested claim: **Seva-generated issue facts omit the profile and document names.** The UI continues to show the literal successful model prompt when one exists.

### 6.3 Readiness Receipt

The receipt is a compact JWS-shaped token signed with Node's built-in Ed25519 implementation.

Header:

```json
{
  "alg": "EdDSA",
  "typ": "seva-readiness-receipt",
  "kid": "<configured-or-ephemeral-demo-key-id>"
}
```

Payload:

```ts
interface ReadinessReceiptPayload {
  v: 1;
  iss: 'seva-demo';
  jti: string;
  iat: string;
  exp: string;
  engine: { id: 'seva-readiness'; version: '1' };
  service: {
    id: string;
    name: string;
    jurisdiction: string;
    rulesetVersion: string;
    rulesetHash: string;
  };
  outcome: 'ready';
  checks: Array<{
    ruleId: string;
    title: string;
    type: 'document' | 'information';
    required: boolean;
    state: 'ready';
  }>;
  disclosure: 'Prototype preparation record; not government approval.';
}
```

Explicitly excluded: session ID; profile values; name; date of birth; address; income; document IDs, names, types, filenames, issuers, references, and metadata; issue IDs and text; portal URL; raw portal labels; prompts and questions.

Key behavior:

- `RECEIPT_SIGNING_KEY_PKCS8_BASE64` and `RECEIPT_SIGNING_KEY_ID` may configure a stable demo key.
- With no configured key, the server generates an ephemeral Ed25519 key pair at process start so the repository still runs with zero setup. UI and API label this `ephemeral-demo`; those receipts stop verifying after restart.
- Default TTL is 30 minutes and is capped server-side at two hours.
- Tokens are not stored in `SessionState` or any server registry.
- The client may store the current token locally only after the citizen explicitly creates it.
- QR encodes the raw token, not a URL, preventing token leakage through history, referrers, and server access logs.

`rulesetFingerprint(service)` hashes a canonically sorted, policy-relevant projection of service ID, ruleset version, requirement IDs/titles/types/required flags/categories/accepted document types or information-field metadata, plus rejection-rule IDs, issue codes, order, portal stage, and simulated messages. It never hashes citizen state. Arrays whose ordering is not semantically meaningful are sorted before serialization; explicit rejection order is preserved.

APIs:

- `POST /api/receipts` with `{ serviceId }`: recompute readiness, reject with `409 not_ready` unless ready, create and return `{ token, receipt, keyMode }`, and never persist the token.
- `POST /api/receipts/verify` with `{ token }`: requires no session header and returns one of `verified-current`, `expired`, `rules-changed`, or `invalid`, plus safe parsed claims only when the signature is authentic.

The verifier never uses words such as “government verified,” “eligible,” “accepted,” or “identity confirmed.” It says “Seva signature valid,” “recorded demo check,” and “fresh check required.”

There is intentionally no revocation. Removing a document after issuance does not alter the citizen-held token, which is why the TTL is short and the verifier describes it as a historic record rather than live state.

### 6.4 Requirement Drift Refusal

`DetectedRequirement` gains `required?: boolean`, defaulting to `true`. The controlled mock portal supplies the flag directly. The extension uses a conservative local hint heuristic: text containing “optional” or “if applicable” becomes `required: false`; everything else is required. Before sending, the extension strips its internal detection-source tag and sends only `label` and `required` objects, service ID, and the linked bearer session header.

`/readiness/from-page` adds:

```ts
interface PortalCoverage {
  matched: Array<{ detected: string; required: boolean; item: ReadinessItem | null }>;
  unknownRequired: string[];
  unknownOptional: string[];
  missingConfiguredRequiredRuleIds: string[];
  exactRequiredCoverage: boolean;
}

interface PortalVerdict {
  status: 'ready' | 'not-ready' | 'manual-review';
  safeToProceed: boolean;
  reason: string;
}
```

Rules:

- Any unknown required label or configured required document absent from the observed page produces `manual-review` and `safeToProceed: false`.
- Unknown optional labels remain visible but do not by themselves block a green verdict.
- Exact coverage plus `readiness.readyToApply` produces `ready`.
- Exact coverage plus an incomplete Seva checklist produces `not-ready` and includes the autopsy's first failure.
- The response does not claim the page was official, complete, or semantically interpreted beyond the submitted labels.

## 7. UI design

### Readiness screen

- When not ready, place a prominent **“If you applied now”** Autopsy card directly after the heading.
- Show the first configured simulated portal step/message, one primary recovery action, the number of later findings, and an always-visible simulation disclaimer.
- “Fix this first” routes to Details for an information requirement and Documents for a document requirement.
- A collapsed “See every simulated stop” list reveals the remaining ordered findings.
- When ready, replace the warning with a compact green **“No configured simulated stop remains”** state.
- Below the verdict, show a Readiness Receipt card. Receipt creation is optional and never blocks starting the application.

### Privacy X-ray

- Add a “Data trace” button in the normal Seva header that opens a sheet.
- Render events chronologically as sealed relays with fixed UI copy derived from enums.
- Every relay shows “What happened,” “What Seva handled,” and “Where it went or stayed.”
- Chips distinguish `observed`, `simulated`, and `external AI`.
- Include this standing disclosure:

> This demo trace contains event categories, not document contents, names, questions, or prompts. It remains in this demo session's server memory and disappears when you reset the session or the demo server restarts. Upload bytes are received in request memory for the upload request; this trace does not prove a precise deletion time or secure erasure.

### Readiness Receipt and verifier

- Before creation, disclose that the token reveals the service and checklist result to anyone who receives it.
- After creation, show QR, copy, expiry, ruleset version, key mode, and the phrases “prototype” and “not government approval.”
- `/demo/receipt-verifier` is explicitly fictional. It accepts paste, can load the current browser-local receipt for the staged demo, and displays signature/freshness/ruleset as separate rows.
- Never place the token in a URL.

### Government portal and extension

- Lead the panel with the portal verdict, not a percentage.
- `not-ready`: show the Autopsy's first configured simulated stop and “Fix this first.”
- `manual-review`: amber refusal stating which required labels are outside coverage or absent.
- `ready`: green only when required coverage is exact and the Seva checklist is ready.
- Unknown optional items are listed separately as not assessed.
- Keep the explicit action boundary: local page detection occurs first; nothing is sent until “Check my documents.”

## 8. Data flows

### Portal pre-mortem

```text
Extension scans visible page locally
  → citizen taps Check
  → extension sends derived labels + required flags + service/session identifiers
  → server recomputes readiness
  → pure Autopsy projects configured failures
  → coverage comparison produces ready / not-ready / manual-review
  → panel renders verdict and first failure
```

### Privacy trace

```text
Instrumented route performs operation
  → fixed factory emits enum-only event after/before the truthful boundary
  → repository appends and caps at 50
  → GET /privacy/events returns categories only
  → client maps enums to fixed explanatory copy
```

### Receipt

```text
Citizen explicitly requests receipt
  → server recomputes readiness
  → server canonicalizes ruleset and safe ready-only claims
  → Ed25519 signs compact token
  → token returns to citizen; server does not persist it
  → fictional verifier checks signature, expiry, engine, and current ruleset
```

## 9. Error handling

- **Autopsy rules missing:** show “No simulated rejection preview is configured,” never infer a message.
- **Autopsy/readiness mismatch:** treat readiness as authoritative, omit the unmatched finding, and cover the invariant with tests.
- **Privacy trace unavailable:** the citizen journey continues; the sheet shows a retryable error.
- **Trace full:** discard oldest events and preserve monotonic sequence numbers.
- **AI request fails:** record attempt then failure, return the deterministic fallback as today, and never block the checklist.
- **Receipt requested while not ready:** return `409 not_ready` with a direct action to fix the first Autopsy finding.
- **No configured receipt key:** use the visible ephemeral-demo mode; never silently imply persistence across restarts.
- **Malformed or oversized token:** return `400 invalid_receipt` without reflecting token contents or parser internals.
- **Authentic but expired/stale receipt:** show historic claims only with “fresh check required”; never show current-ready styling.
- **Portal coverage uncertain:** fail closed to `manual-review`; the application itself remains untouched.
- **Extension/API unreachable:** preserve the existing retry guidance and never replace the host page.

## 10. Testing and verification

Implementation follows red-green-refactor for each pure domain/service slice.

### Unit tests

- `rejectionAutopsy.test.ts`: ordered missing findings, issue-code variants, issue resolution, full-ready state, and unconfigured rules.
- `privacyTrace.test.ts`: enum-only factories, bounded ordering, no arbitrary data path, and reset lifecycle.
- `rulesetFingerprint.test.ts`: deterministic digest and changes for policy-relevant mutations.
- `readinessReceiptService.test.ts`: valid signature; tampered header/payload/signature; expiration; future issuance; wrong key; ruleset change; oversized token; and safe-claim allowlist.

### API tests

- Readiness responses include Autopsy matching the same freshly computed result.
- Portal checks cover ready, not-ready, unknown required, unknown optional, and missing configured required document states.
- Full journey emits the expected privacy-event kinds in order while serialized trace excludes sentinel values.
- Both AI-enabled attempt/failure and deterministic-only paths record truthful destinations.
- Receipt issuance rejects not-ready state and never trusts client-provided readiness.
- Receipt verification is sessionless and returns all four verifier states.
- Existing upload limits, issue resolution, application gating, and submission tests remain green.

### Build and manual verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- Run the production single-port build and complete the full two-minute journey.
- Inspect desktop and narrow-phone layouts, keyboard focus, screen-reader labels, contrast, and reduced motion.
- Load the unpacked extension against the fictional portal and verify all three portal verdict states.
- Inspect DevTools Network for extension payload, receipt payload, and absence of receipt tokens in URLs.
- Verify the Privacy X-ray copy matches actual network behavior with AI off and, when a key is available, AI on.

## 11. File impact

Expected new files:

- `shared/src/types/privacy.ts`
- `shared/src/types/receipt.ts`
- `server/src/domain/rejectionAutopsy.ts`
- `server/src/domain/rulesetFingerprint.ts`
- `server/src/services/privacyTrace.ts`
- `server/src/services/readinessReceiptService.ts`
- `server/src/routes/privacy.ts`
- `server/src/routes/receipts.ts`
- `server/src/__tests__/rejectionAutopsy.test.ts`
- `server/src/__tests__/privacyTrace.test.ts`
- `server/src/__tests__/rulesetFingerprint.test.ts`
- `server/src/__tests__/readinessReceiptService.test.ts`
- `server/src/__tests__/receipts.api.test.ts`
- `client/src/features/privacy/PrivacyXray.tsx`
- `client/src/features/receipts/ReadinessReceiptCard.tsx`
- `client/src/pages/ReceiptVerifier.tsx`
- `client/src/lib/receiptStorage.ts`

Expected modified areas:

- Shared exports and service/readiness/session types.
- Income Certificate data and ruleset version.
- Session repository and routes for readiness, profile, DigiLocker, documents, AI, application, privacy, and receipts.
- Client application context/hooks, Layout, Readiness, Complete, GovernmentPortalDemo, App routes, assistant/upload disclosures, and styles.
- Extension background/content scripts and README.
- Root README, `.env.example`, server environment example, and blind-courier design notes.
- Client package manifest and lockfile for `react-qr-code`.

## 12. Twenty-four-hour execution order and cut line

1. **Hours 0–4:** shared types, configured rejection rules, pure Autopsy with tests, API response.
2. **Hours 4–7:** readiness and portal Autopsy UI; extension first-failure rendering.
3. **Hours 7–12:** Privacy X-ray schema, event factories, route capture, API, tests, and truthful copy corrections.
4. **Hours 12–17:** ruleset fingerprint, Ed25519 receipt service, verifier API, and adversarial tests.
5. **Hours 17–20:** receipt UI/QR/verifier and local convenience storage.
6. **Hours 20–22:** requirement drift coverage and extension/manual-review states.
7. **Hours 22–24:** full regression, build, accessibility, DevTools audit, README, and demo rehearsal.

If schedule pressure appears, preserve functionality in this order:

1. Rejection Autopsy and portal first failure.
2. Truthful Privacy X-ray.
3. Signed receipt and text verifier.
4. Drift refusal.
5. QR and animation polish.

Do not cut deterministic tests, prototype disclosures, privacy wording, or the fail-closed portal verdict to save time.

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Simulated message is mistaken for a real government prediction | Put “configured simulation” in types, API, card heading, and disclaimer; never scrape or invent rejection language. |
| Privacy visualization becomes marketing theater | Emit only actual route events through enum-only factories and describe it as an instrumented trace. |
| Existing upload flow contradicts “blind courier” | Explicitly show upload bytes reaching request memory and avoid zero-byte claims until the separate declaration architecture is built. |
| User types personal data into AI chat | Warn before input, disclose external AI events, show successful prompts, and narrow claims to generated issue-fact redaction. |
| Receipt looks official | Use “Seva Readiness Receipt,” “fictional verifier,” short TTL, explicit disclosure, and separate signature/freshness/ruleset rows. |
| Receipt becomes stale after state changes | Recompute at issuance, use 30-minute TTL, state no revocation, and never call it live state. |
| Ephemeral key invalidates receipts after restart | Display key mode and explain that zero-setup demo receipts last only for the running server. |
| Extension misdetects a page | Surface matched and unmatched labels; unknown required or missing configured rules fail closed to manual review. |
| New UI overwhelms the citizen journey | Keep first failure and next action prominent; move technical detail into progressive-disclosure sheets/cards. |

## 14. Final acceptance checklist

- [ ] A missing Income proof produces the configured first simulated rejection and direct recovery action.
- [ ] Resolving that blocker deterministically advances or clears the first failure.
- [ ] Ready state can create a short-lived receipt with no personal or document data.
- [ ] Fictional verifier distinguishes valid-current, expired, rules-changed, and invalid.
- [ ] Privacy X-ray truthfully shows request-memory upload bytes and optional external AI attempts.
- [ ] Trace serialization contains none of the sentinel values used in tests.
- [ ] Portal green requires exact required coverage and current readiness.
- [ ] Unknown required portal labels produce manual review rather than false confidence.
- [ ] All citizen-facing officiality, privacy, receipt, and rejection claims match the implementation.
- [ ] Existing tests plus new tests, typecheck, and build pass.
- [ ] The complete staged demo remains under two minutes.
