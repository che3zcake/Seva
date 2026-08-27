# Seva for UMANG: Application Preflight

**Status:** Proposed for implementation after user review
**Date:** 2026-08-27
**Time box:** 24 hours
**Platform anchor:** UMANG → Telangana MeeSeva → Income Certificate
**Product line:** Find the failure before the form does.

## 1. Decision

Position Seva as an independent application-preflight concept for the income-certificate journey available through UMANG's Telangana MeeSeva service.

The memorable feature is **Rejection Autopsy**: before a citizen starts the mock application, Seva uses a deterministic, versioned synthetic checklist to show the first configured place the prototype journey would stop, why, and the shortest action that clears it. The citizen fixes the problem and continues into a prefilled mock form.

This is not an imitation of UMANG and does not use government logos or live systems. It is a fictional, independently designed case study using synthetic rules, accounts, documents, and submission data.

## 2. Why this is the right hackathon cut

The official brief rewards one clearly defined citizen problem, a complete working journey, usability for Indian citizens on mobile and slower connections, end-to-end thinking, and honesty about what is real or mocked. The organizer video additionally recommends choosing one of ten named platforms and says reviewers judge the citizen experience rather than an admin panel.

UMANG is on that list. Its official service catalog states that Telangana MeeSeva on UMANG includes income-certificate applications and that UMANG integrates DigiLocker, making it a concrete and credible home for Seva's existing flow.

The previous four-feature proposal would dilute the first-minute story. For this submission:

- Rejection Autopsy is P0.
- A compact privacy explanation and requirement-drift refusal are P1.
- Signed receipts, QR, and a verifier are post-submission work.

Sources:

- [Official builder brief](https://buildwhatmovesindia.com/brief)
- [Official FAQ](https://buildwhatmovesindia.com/faq)
- [Organizer rules video](https://www.youtube.com/watch?v=NjKwtdv9WPs)
- [Official UMANG service catalog](https://web.umang.gov.in/landing/flipbook/index.html)
- [Telangana public utility forms](https://www.telangana.gov.in/Services/Public-Utility-Forms/)

## 3. Citizen and problem

**Demo citizen:** Rahul needs an income certificate for a scholarship. He has limited time and wants to know whether he can finish the application before starting it.

**Problem statement:** A checklist can say what is required without showing where the citizen's current document set will fail the journey. The expensive moment is discovering a missing or mismatched item after entering the form.

**Value proposition:**

> Seva lets a citizen rehearse a UMANG income-certificate application, revealing and fixing the first document or data mismatch before they spend time on the form.

## 4. Target experience

One public URL must support this judge-ready path without an account, API key, extension install, or local file dependency:

1. Land on a neutral fictional service page labelled **“Independent concept for a UMANG Telangana MeeSeva journey.”**
2. See Rahul's one-sentence scholarship scenario and tap **“Check before I start.”**
3. See **“This simulated journey would first stop at Income proof — Enclosures.”**
4. Tap **“Fix this first.”**
5. Add the built-in synthetic income document; Seva flags the configured name variant.
6. Resolve it and add the remaining synthetic photograph without opening an operating-system file picker.
7. Return to a recomputed all-clear state.
8. Continue into the prefilled mock form, review mapped attachments, and simulate submission.
9. See a fictional reference number and an always-visible statement that no government system was contacted.
10. Reset the demo in one tap.

The judge should be able to summarize it as:

> Seva finds the first failure before the citizen starts, helps fix it, and turns the same preparation into a completed application.

## 5. Scope

### P0: must ship

#### Platform-specific story

- Reframe the landing page, service card, and fictional portal around the exact UMANG → Telangana MeeSeva → Income Certificate case study.
- Keep the Seva identity; do not copy UMANG, MeeSeva, Telangana, or Government of India visual branding or logos.
- Add visible independent-prototype and synthetic-checklist notices at the entry, verdict, and simulated submission.
- Use a Telangana-aligned synthetic address and clearly invented identifiers.

#### Rejection Autopsy

- Add explicit configured rejection rules to the service definition.
- Build a pure deterministic projection from current readiness to ordered simulated blockers.
- Show the first blocker, its mock form step, reason, and shortest recovery action.
- Recompute after every fix; never trust a client-provided readiness state.
- Say “configured simulated blocker,” never “predicted government rejection.”
- If a blocker has no configured rule, show that the preview is unavailable rather than inventing one.

#### Zero-friction judge path

- Add **“Start 60-second demo”** and **“Reset demo”** controls.
- Seed the profile and document state needed to reach the first meaningful blocker immediately.
- Provide built-in synthetic document choices so the happy path does not depend on a file picker.
- Preserve manual exploration for judges who want to inspect the full product.

#### Complete end-to-end journey

- Preserve readiness → prefilled mock form → mapped attachments → review → simulated submission.
- Make every action shown in the video work in the public build.
- Keep the OpenAI integration optional; the complete path must work deterministically without a key.

#### Usability and reliability

- Optimize the critical path for a narrow phone viewport and touch.
- Keep the critical path readable in plain English with large targets and clear back/retry states.
- Avoid new heavy assets or client dependencies; keep the demo useful on a slow connection.
- Provide loading, retry, empty, and reset behavior for every P0 network action.
- Deploy one public browser link that requires no access request.

#### Submission assets

- Treat **28 August 2026, 8:00 PM IST** as a hard deadline with no grace period.
- Record a maximum two-minute video: first minute as the citizen, second minute explaining the product decision, deterministic core, Codex contribution, and real-versus-mocked boundaries.
- Prepare a 249-word summary. The brief says “under 250,” while the video says “exactly 250”; 249 obeys the stricter written rule and remains effectively at the requested length.
- Test every submitted link in a signed-out/private browser on both desktop and mobile width.
- Confirm the submitted teammate email is registered, if this is a two-person entry.

### P1: only after P0 is deployed and rehearsed

- Compact three- or four-row **Privacy X-ray** showing only the important boundaries: synthetic locker, upload request memory, deterministic Seva processing, and optional OpenAI transfer.
- Requirement-drift refusal: an unknown required label produces manual review rather than a green verdict.
- A complete critical-path Hindi or Telugu translation only if every P0 screen can be translated and checked consistently.
- A small before/after indicator showing avoided restarts or re-entry, clearly labelled as a scenario rather than measured government data.

### Cut from the 24-hour submission

- Signed Readiness Receipt, QR, verifier, key management, and receipt tests.
- Full privacy-event taxonomy and global telemetry sheet.
- Browser-extension installation as part of the reviewer journey. Existing extension code may remain, but the submission cannot depend on it.
- Multiple services, admin tools, authentication, OCR, real DigiLocker, or any live government integration.
- Decorative 3D, cinematic motion, or animation that competes with the citizen story.

## 6. Rejection Autopsy domain design

`ServiceDefinition` gains a `rulesetVersion` and optional ordered `rejectionRules`:

```ts
interface RejectionRule {
  id: string;
  requirementId: string;
  issueCode?: DocumentIssue['code'];
  mockStepId: string;
  mockStepTitle: string;
  order: number;
  simulatedMessage: string;
}
```

The pure function `buildRejectionAutopsy(service, readiness)` returns:

```ts
interface RejectionAutopsy {
  simulated: true;
  rulesetVersion: string;
  firstFailure: RejectionFinding | null;
  findings: RejectionFinding[];
  clear: boolean;
  disclaimer: string;
}
```

Rules:

1. Start only from readiness items currently marked `missing` or `needs-review`.
2. Join by stable requirement ID and, where present, unresolved issue code.
3. Sort by explicit mock-form order, not array order.
4. Reuse deterministic resolution guidance for the fix steps.
5. Set `clear` from `readiness.readyToApply`, never from an empty findings array.
6. Return no invented finding when no configured rule matches.
7. Include `simulated: true` and the synthetic ruleset version in every API response.

The readiness endpoint and fictional portal check return the readiness result and Autopsy generated from the same freshly computed state.

## 7. Interface hierarchy

### Entry screen

- Eyebrow: **Independent public-service redesign concept**
- Headline: **Find the failure before the form does.**
- Scenario: **Rahul needs an income certificate for a scholarship. Let's check whether he can finish before opening the form.**
- Primary action: **Start 60-second demo**
- Secondary action: **Explore from the beginning**
- Disclosure: synthetic data and checklist; no affiliation; no live system.

### Autopsy card

The first screen after the demo action leads with:

- **If Rahul applied now**
- **First simulated stop: Income proof**
- **At: Enclosures**
- One plain-language reason.
- One primary **Fix this first** action.
- A collapsed count of later configured blockers.
- The ruleset version and simulation disclaimer in secondary text.

When ready, the same region becomes:

- **No configured blocker remains**
- **Ready to rehearse the application**
- Primary action: **Continue to mock form**

### Mock form and result

- Prefilled values and mapped attachments are visually distinct from values the citizen still needs to review.
- Submission button says **Submit simulation**.
- Completion screen says **No government system was contacted** beside the fictional reference.
- **Reset demo** is always reachable without clearing browser storage manually.

## 8. First-minute storyboard

| Time | Citizen action and visible proof |
| --- | --- |
| 0–6s | “Rahul needs an income certificate for a scholarship.” Tap **Start 60-second demo**. |
| 6–14s | Autopsy says the configured simulated journey first stops at **Income proof — Enclosures**. |
| 14–27s | Tap **Fix this first**, add the built-in synthetic salary slip, and resolve the deliberate name variant. |
| 27–35s | Add the synthetic photograph; readiness recomputes to **No configured blocker remains**. |
| 35–50s | Continue to the prefilled mock application; prepared attachments are already mapped. |
| 50–58s | Review and tap **Submit simulation**; see a fictional reference and no-live-system notice. |
| 58–60s | End card: **Find the failure before the form does.** |

Second minute:

1. State the citizen pain and why this exact UMANG/MeeSeva journey was chosen.
2. Show that requirements, matching, Autopsy, and application gating are deterministic and tested.
3. Show where Codex materially helped design, implement, test, and audit the end-to-end flow.
4. State what is real and what is mocked.
5. Mention mobile, low-dependency behavior, and the safe path to real integrations.

## 9. Verification

### Automated

- Ordered first failure for missing income proof.
- Issue-specific finding for the configured name mismatch.
- Resolving the current finding advances to the next blocker.
- Full readiness yields the all-clear state.
- Missing rules never produce an invented all-clear or rejection message.
- API Autopsy and readiness originate from the same recomputation.
- Seed/reset endpoints or actions create the exact repeatable demo states.
- Existing document, upload, application-gating, submission, privacy, and AI-fallback tests remain green.
- `npm test`, `npm run typecheck`, and `npm run build` pass.

### Manual

- Full public flow works in a private browser with no stored session.
- Full flow works at a narrow phone viewport without horizontal scrolling.
- All video actions work after a fresh reset.
- AI-disabled and failed-network states do not block the deterministic path.
- No real identifiers, credentials, personal data, logos, or government network calls appear.
- Every external link opens without requesting access.

## 10. Twenty-four-hour execution order

1. **Hours 0–2:** platform-specific copy, service metadata, synthetic Telangana demo state, Autopsy tests.
2. **Hours 2–6:** Autopsy domain function, API integration, and first-blocker UI.
3. **Hours 6–10:** one-click seeded demo, built-in fix actions, reset, and mock-portal entry.
4. **Hours 10–14:** full journey polish, mobile layout, loading/retry/error states, disclosure audit.
5. **Hours 14–17:** regression tests, typecheck, build, and public deployment.
6. **Hours 17–20:** signed-out link QA, device-size QA, and P1 only if the deployed P0 is stable.
7. **Hours 20–22:** record and edit the two-minute video; write the 249-word summary.
8. **Hours 22–24:** submission dry run, link recheck, video rehearsal, and buffer for deployment failures.

No P1 work starts before a public, resettable P0 build passes the complete journey.

## 11. Acceptance checklist

- [ ] The entry names UMANG → Telangana MeeSeva → Income Certificate without copying official branding.
- [ ] The citizen problem and value are obvious in under ten seconds.
- [ ] One click reaches the first configured simulated blocker.
- [ ] The blocker has one direct fix and recomputes from current state.
- [ ] The same preparation flows into a prefilled mock form and simulated submission.
- [ ] The complete path works without OpenAI, an extension, an account, or a local file.
- [ ] Synthetic/mock/non-affiliation boundaries are visible and accurate.
- [ ] The public link works signed out and at mobile width.
- [ ] Every action shown in the first minute works after reset.
- [ ] Tests, typecheck, and production build pass.
- [ ] Video is at most two minutes and summary is exactly 249 words.
