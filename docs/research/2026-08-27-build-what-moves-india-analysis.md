# Build What Moves India: Source Analysis for Seva

**Researched:** 2026-08-27  
**Decision supported:** How to position and scope Seva for the final 24 hours

## Executive conclusion

Seva already fits the event better than a new concept would: it has a complete citizen journey, a deterministic core, synthetic data, a mock backend, mobile-friendly UI, explicit non-affiliation, and optional OpenAI use. Its main shortlist risk is not engineering depth. It is that the current generic Income Certificate framing is outside the organizer video's ten recommended platforms and that the proposed proof features would dilute the citizen story.

The strongest low-risk positioning is:

> **Seva is an independent application-preflight concept for UMANG → Telangana MeeSeva → Income Certificate. It finds and fixes the first configured simulated blocker before the citizen starts the form.**

UMANG is one of the ten platforms displayed in the organizer video. UMANG's official catalog says its Telangana MeeSeva integration allows citizens to apply for income certificates, and the same catalog describes DigiLocker integration. That makes the anchor real while allowing Seva to retain its existing income-certificate and mock-locker architecture.

For the 24-hour submission, ship Rejection Autopsy, a one-click seeded judge path, the complete prefilled mock application, strong mobile/error states, a public deployment, and the submission assets. Move signed receipts, QR verification, the full Privacy X-ray event system, and extension installation out of P0.

## Primary sources

1. [Build What Moves India — Builder Brief](https://buildwhatmovesindia.com/brief)
2. [Build What Moves India — FAQ](https://buildwhatmovesindia.com/faq)
3. [Organizer video — Rules & How to Participate](https://www.youtube.com/watch?v=NjKwtdv9WPs)
4. [Official UMANG service catalog](https://web.umang.gov.in/landing/flipbook/index.html)
5. [Official UMANG landing page](https://web.umang.gov.in/landing)
6. [Telangana State Portal — Public Utility Forms](https://www.telangana.gov.in/Services/Public-Utility-Forms/)

## What the official brief requires

- Pick one real problem on an Indian public-service website or digital service and build a simpler, clearer, useful solution.
- Use Codex to build the prototype or make the prototype meaningfully powered by OpenAI. Codex/OpenAI cannot be a cosmetic submission detail.
- Complete the main citizen journey. Mock accounts, data, and backend behavior where real access would be unsafe or unavailable.
- Optimize for Indian citizens using mobile devices, slower connections, or limited digital experience.
- Use synthetic data for sensitive information.
- Clearly distinguish working behavior from mocked behavior and explain the safe path to scale.
- Submit a public browser link that opens without an access request.
- Submit one video no longer than two minutes. The first minute should demonstrate the citizen experience; the second should explain how and why it was built.
- Submit the written summary and the registered email of a teammate if applicable.
- Meet the hard deadline: **28 August 2026 at 8:00 PM IST**, with no grace period.

The published judging dimensions are Problem, Working build, Usability, Product thinking, End-to-end thinking, and Honesty.

## Additional organizer-video emphasis

The organizer says more than 5,000 entries had already been received, so the project is judged comparatively. The video repeatedly emphasizes:

- Ideas and citizen usefulness matter more than code volume.
- A comprehensive proof of concept is expected, but mock systems and rough edges are acceptable in the first round.
- Reviewers test the citizen experience, not an admin panel.
- Decorative 3D or other bells and whistles do not help unless they make the experience more useful.
- The target user is often busy, frustrated, and trying to finish quickly.
- If the public link does not open, the project effectively does not exist.
- Every feature shown in the video must work.
- The first video minute should be the citizen story; the second should explain the decisions and the builder's contribution.

The video displays ten recommended platforms:

1. IRCTC
2. Income Tax e-Filing Portal
3. CPGRAMS
4. GST
5. EPFO
6. MCA
7. National Cyber Crime Reporting Portal
8. UMANG
9. Parivahan Sewa
10. RTI Online

The organizer says an off-list platform is allowed, but its odds can be slightly lower because evaluators may not know the platform; an exceptional entry can still stand out. This makes platform anchoring a meaningful strategic choice rather than a formal eligibility requirement.

## FAQ constraints

- Solo entries and teams of at most two are allowed; both teammates must be registered and at least 18.
- Every demonstrated feature must actually work.
- Other libraries and tools are allowed when licensing and usage are disclosed.
- A live government system may not be used unless there is an official public sandbox.
- Real Aadhaar, PAN, passwords, OTPs, payment details, health data, or similar sensitive data may not be used.
- A visual-only concept is insufficient.
- The event is an independent initiative and is not an official government hackathon.
- The builder retains rights to the work.

## Source wording conflict

The written brief asks for a summary “under 250 words,” while the organizer video says “exactly 250 words.” These cannot both be followed literally. Use **249 words**, which obeys the stricter written requirement while staying at the intended length.

## Why UMANG is the correct anchor

The current Seva prototype prepares a citizen for an Income Certificate, uses a simulated DigiLocker, checks documents, flags a name mismatch, and carries the prepared state into a mock application.

The official UMANG catalog says:

- Telangana MeeSeva on UMANG includes applications for income, family, resident, EBC, and OBC certificates.
- UMANG integrates DigiLocker and allows citizens to access and upload documents.
- UMANG is intended as a single access point for central, state, and local public services.

The Telangana State Portal separately lists an official Income Certificate application form. Therefore the positioning is not a superficial renaming: the selected platform, subservice, application type, and document preparation concept have a documented relationship.

The product must still avoid copying government branding or claiming that Seva's hand-written synthetic checklist is the official current checklist. Recommended visible wording:

> Independent redesign concept for a UMANG Telangana MeeSeva journey. Synthetic checklist and citizen data; no government system contacted.

## Fit assessment of the current repository

| Judging dimension | Current strength | Required improvement |
| --- | --- | --- |
| Problem | Clear late-discovery problem | Tie it to the exact UMANG/MeeSeva citizen moment and make the pain visible in ten seconds. |
| Working build | Full preparation and mock-application path exists | Add a reliable one-click seeded path and public deployment. |
| Usability | Plain-language, mobile-oriented screens | Shorten the judge path, remove file-picker dependence, and harden narrow-screen/loading/error states. |
| Product thinking | Deterministic readiness and optional AI are well separated | Lead with the first blocker and shortest fix, not a generic percentage/checklist. |
| End-to-end thinking | Preparation feeds a mock form and submission | Make this continuity unmistakable in the first minute. |
| Honesty | Strong synthetic-data and non-affiliation disclosures | Add UMANG-specific independent-concept wording; do not imply official prediction or acceptance. |

## Recommended 24-hour scope

### P0

1. Reframe the exact journey as UMANG → Telangana MeeSeva → Income Certificate.
2. Ship deterministic Rejection Autopsy: first configured simulated stop, mock step, reason, and direct fix.
3. Add a one-click 60-second demo and one-click reset using only built-in synthetic data.
4. Preserve the complete all-clear → prefilled form → mapped attachments → simulated submission path.
5. Make the critical path work without OpenAI, an extension, a login, or a local file.
6. Polish and test the mobile viewport, loading, retry, reset, and no-live-system disclosures.
7. Deploy early, test signed out, and reserve time for the video, 249-word summary, and submission dry run.

### P1 after the public P0 is stable

- Compact Privacy X-ray showing only the three or four boundaries relevant to the demo.
- Requirement-drift refusal for an unknown required page label.
- Complete critical-path Hindi or Telugu localization only if it can be consistently finished.

### Cut from the submission time box

- Signed receipt, QR, verifier, cryptographic key flow, and receipt test matrix.
- Full privacy-event taxonomy.
- Browser-extension installation as a reviewer dependency.
- Multiple services, real integrations, authentication, OCR, admin panels, and decorative motion.

## First-minute submission story

- **0–6 seconds:** Rahul needs an income certificate for a scholarship; tap “Start 60-second demo.”
- **6–14 seconds:** “First simulated stop: Income proof — Enclosures.”
- **14–27 seconds:** Fix it with a built-in synthetic income document; resolve the deliberate name variant.
- **27–35 seconds:** Add the synthetic photograph and reach “No configured blocker remains.”
- **35–50 seconds:** Continue to the prefilled mock application with prepared attachments already mapped.
- **50–58 seconds:** Submit the simulation and show the fictional reference plus no-live-system notice.
- **58–60 seconds:** “Find the failure before the form does.”

## Risks to control

- **Superficial platform relabeling:** Name the exact subservice and citizen moment; do not merely add an UMANG badge.
- **Overclaiming:** Use “configured simulated blocker,” not “predicted rejection,” “eligible,” or “government verified.”
- **Story dilution:** One memorable citizen result is stronger than four technical side features in two minutes.
- **Reviewer friction:** Do not require an extension, login, upload dialog, API key, or special instructions.
- **Mock ambiguity:** Repeat the synthetic/non-affiliated/no-live-system boundary at entry, verdict, and completion.
- **Deployment failure:** A working public link, resettable state, and rehearsal are P0, not final-hour chores.
- **Optional AI failure:** Deterministic decision logic and explanations must keep the full demo functional.

## Open uncertainties and conservative choices

- The builder brief allows a prototype built with Codex or powered by OpenAI, while the FAQ/video place stronger emphasis on Codex being mandatory and meaningfully used. Follow the stricter interpretation: document concrete Codex contributions even if the runtime AI feature is optional.
- The organizers publish judging dimensions but no numerical weights. Optimize for visible strength across all six rather than guessing a scoring formula.
- The final submission form is not publicly inspectable from the supplied materials. Prepare the public URL, video URL, 249-word summary, and registered teammate email in copy-ready form before opening it.
- The existing Seva requirement list has not been verified as the current official Telangana checklist. Keep it explicitly synthetic and versioned; do not present it as policy.
- The published materials do not fully resolve every in-person/finale attendance detail. This does not affect the first-round build, but finalists should verify logistics directly with organizers.

## Final recommendation

Proceed with the hackathon-aligned design in `docs/superpowers/specs/2026-08-27-umang-application-preflight-design.md`. Keep the earlier proof-heavy proposal as a post-submission roadmap. The project becomes special through a sharp, repeatable citizen revelation—**the exact first blocker before the form begins**—not through additional infrastructure.
