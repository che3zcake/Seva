# Putting Seva on a public URL

One service. The Express API also serves the built React client, so there is a
single origin, no CORS, and nothing to configure.

## Render (recommended, free)

1. Sign in at <https://render.com> with GitHub.
2. **New → Blueprint**, pick `che3zcake/Seva`. It reads `render.yaml`.
3. **Apply**. First build takes about 3 minutes.
4. The URL is `https://seva-<something>.onrender.com`.

No environment variables are required. `OPENAI_API_KEY` is optional — without
it the deterministic explanations answer and every screen still works.

### The one thing to know before a demo

The free plan **spins the service down after about 15 minutes idle**, and the
next request takes roughly 50 seconds to wake it. A judge opening a cold link
sees a long blank load.

Open the URL yourself a minute before anyone else does, or hit
`https://<your-url>/api/health` — that is enough to wake it.

If the submission link may be opened at an unpredictable time, the $7/month
starter plan removes spin-down entirely and is the single highest-value seven
dollars in this project.

## Anywhere else

Any host that runs a persistent Node process works:

```bash
npm install
npm run build      # builds the client, then typechecks everything
npm start          # serves API + client on $PORT (default 4000)
```

**Do not deploy this to a serverless platform** (Vercel, Netlify Functions,
Lambda). Sessions live in an in-memory `Map` — see
`server/src/repositories/sessionRepository.ts` — so every cold invocation would
start an empty session and the journey would break halfway. A real store behind
that interface is the fix, and it has to ship together with authentication:
see [docs/blind-courier.md](docs/blind-courier.md), Phase 4.

## Checking a deployment

```bash
curl https://<your-url>/api/health
```

Then in a **private window**, on a phone-width screen:

1. Land, tap **Start 60-second demo**.
2. First stop reads *income proof, at Enclosures*.
3. **Fix this first** → name variant appears → **Confirm this is me**.
4. **Fix this first** → *No configured blocker remains*.
5. **Continue to mock form** → prefilled → **Submit simulation**.
6. **Reset demo** in the header returns to the start.
