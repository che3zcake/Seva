# The blind courier: production architecture

> Status: **design, not built.** Phase 0 items marked ✅ below have landed; the
> rest is the plan for after the hackathon.

The founding principle, stated by the founder:

> *"We should not be able to access or see the content. We are the people who
> deliver the parcel. We don't read the content of the file — we just know what
> file will serve what purpose."*

## The reframe that dissolves most of the work

The principle is **"we don't read the file"**, not **"we don't know your name"**.
A courier reads the address label. Seva legitimately holds the citizen's
name — they typed it into the form, and DigiLocker returns `name`, `dob`,
`gender` and `digilockerid` in the OAuth token response whether you want them or
not. Designs that spend their whole budget encrypting the *label* are inverted
effort while the Government of India posts the plaintext name through the one
endpoint you deliberately kept.

Two facts make the blind courier the **default** rather than an achievement:

- `GET /files/issued` returns `name` (the certificate's title), `type`, `size`,
  `date`, `mime`, `uri`, `doctype`, `description`, `issuerid`, `issuer` — and
  **nothing about the holder**. The listing is already content-free.
- `canSatisfy()` in `documentMatcher.ts` already reads only `type` and `status`.

So the work is mostly **deletion**, not construction.

## Recommendation: sealed courier, stripped

Hold a reference manifest — doctype, issuer, a random local id, and a verdict.
Never receive a file. Never store a DigiLocker URI. No client-side crypto, no
consent ledger.

Three architectures were designed and attacked. Two died:

- **Waybill** (client-side crypto over the manifest) — dies on the token
  response above. Encrypting `profile.fullName` is pointless when the name
  arrives in cleartext through the API you kept.
- **Blind Vault** (E2E-encrypted blob storage) — builds a three-level key
  hierarchy and a recovery story to protect a payload its own design argues
  Seva should not keep. Defeated by an evicted IndexedDB key on a 2GB Android
  long before any attacker appears.

Why store the URI is wrong: `in.gov.pan-PANCR-ABCDE1234F` is the spec's own
example — the URI **embeds the PAN number**. Hashing does not save you either;
PAN's fixed 5-letter/4-digit/1-letter template is brute-forceable on a laptop.
Store `crypto.randomUUID()`.

## The honest residual

Seva is content-blind. It is **not identity-blind, and never will be.** Say
this out loud rather than letting someone find it:

1. **It knows your name and date of birth.** You typed the name in; DigiLocker
   returns it at token exchange regardless of scope. Any pitch saying "we never
   learn who you are" is false on the first API call.
2. **It knows which service you applied for** — and that is usually the most
   sensitive fact in the interaction. Widow pension, disability pension, caste
   certificate. Cleartext by construction, because routing is what the product
   does.
3. **Your doctype set is a socioeconomic fingerprint.** No salary slip reads as
   informal sector. A document issued by a disability commissioner reveals
   disability without a byte being read. *Absence is informative too*: the list
   of requirements you could not satisfy is definitionally a list of things you
   lack.
4. **The server serves the JavaScript.** Every client-side guarantee rests on
   Seva shipping honest code. Today's audit does not bind tomorrow's deploy.
   Unsolved for all browser-delivered privacy claims, not specific to Seva.
5. **The session id is an unauthenticated bearer string.** `sessionIdFrom()`
   trusts the `x-session-id` header verbatim and `GET /api/session` returns
   everything. Harmless for an in-memory map of synthetic data; **unacceptable
   the moment anything durable lands.** See Phase 4.
6. **The extension is the largest content-reading surface in the repo.** It runs
   on pages Seva does not control. Narrowed to `*.gov.in` / `*.nic.in`, but
   this deserves to be on the diagram rather than omitted from it.

## Phases

| Phase | What | Proves |
| --- | --- | --- |
| **0** ✅ | Stop the leaks that exist today | A judge greps and finds nothing |
| **1** ✅ | Make the claim falsifiable in CI | `npm test` *is* the audit |
| **2** | Rewrite fixtures to the verified DigiLocker listing shape; replace the per-document name check with **one** per-session comparison against the locker account name | The demo runs on data shaped like the real API |
| **3** | Uploads become **declarations** — no bytes, an enum where a name used to be | DevTools shows zero bytes in any request body |
| **4** | Authentication, shipped in the **same PR** as persistence | `curl -H 'x-session-id: <guess>'` stops working |

**Phase 2's biggest win is a deletion:** every document in a locker got there
under a verified identity, so the per-document name check is structurally
redundant. The flagship mismatch catch collapses to **one comparison per
session** — locker account name vs the name typed on the form — and survives at
full strength, blind.

**Phase 4 is a precondition, not a follow-up.** A durable store behind a
guessable unauthenticated id is strictly worse than the in-memory map it
replaces. Ship auth and persistence together or ship neither.

## Legal footing

DPDP Rules 2025, First Schedule Part B, item 2:

> "The Consent Manager shall ensure that the manner of making available the
> personal data or its sharing is such that the contents thereof are not
> readable by it."

The founder independently restated the operative Indian legal standard. Adopt it
**voluntarily**; do **not** claim registered Consent Manager status — Part A
requires Indian incorporation and ₹2 crore net worth, and Rule 4 commences
13 Nov 2026.

The closer precedent is **ABDM's Health Information Exchange Consent Manager**,
which MoHFW describes as "a data blind gateway… facilitating information sharing
without data access" — government-built, handling citizen records. Account
Aggregators are RBI-licensed NBFCs handling financial information only: cite as
lineage, never as a path.

Do **not** sell encryption as a DPDP exemption, and do not claim browser-
delivered E2EE is user-verifiable. Neither is true.

## Rejected

**On-device OCR.** `tesseract-wasm` is ~2.1MB brotli and around 7.5s/page on
desktop hardware; on a 2GB Android Go device expect materially worse plus real
risk of the tab being killed. **The citizen is holding the document and reads it
better than tesseract does. Ask them.**

## Open questions

- **Does the extension stay?** It is the largest content-reading surface, and
  it is invisible to the DevTools verification story by design.
- **Does anything downstream rely on the readiness verdict** — a department, a
  "Seva-verified" badge? If yes, stop: moving comparison to the browser makes
  the verdict client-asserted.
- **Citizen on their own phone, or an operator at a CSC / Jan Seva Kendra?**
  Every device-local guarantee resolves to "the operator's desktop" in the
  second case.
- **Keep OpenAI at all?** `MockAIService` already answers, the flow does not
  depend on the model, and removing it deletes a cross-border transfer.

Could not verify: DigiLocker's CORS posture (the v2.2 spec contains zero
occurrences of "CORS"); the Requester Terms of Service and MoU contents
(`partners.digitallocker.gov.in` did not resolve); whether any published
endpoint answers a question *about* a document without returning it — the
attribute-assertion primitive a blind courier would most want.
