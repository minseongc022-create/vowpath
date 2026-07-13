# Retell AI — Conversational intake (Effiroad)

Retell handles **only** the path: caller presses **1** (book) → **1** (talk to AI now).  
Everything else (main menu, estimates, Spanish, SMS link) stays on Twilio scripted flows.

## Architecture

```
Customer → +1 (225) 529-1680 (Twilio)
         → IVR menu (press 1/2/3)
         → press 1 → press 1
         → register-phone-call (Retell API)
         → Twilio <Dial><Sip>sip:{call_id}@sip.retellai.com</Sip></Dial>
         → Retell conversational agent
         → tools: submit_intake / submit_estimate → Effiroad API
```

**Important:** The old PSTN `<Dial>+1…</Dial>` path often failed instantly and fell back to Google TTS scripted intake. Production now uses the official **SIP bridge** above.

Twilio sets **callerId** to your shop Twilio line when forwarding, so Retell tool webhooks resolve the correct tenant from `from` or `to`.

## 1. Retell dashboard

1. [retellai.com](https://www.retellai.com) → create agent (or use existing `agent_6e612965cf4b69f4312deee3f8`)
2. **Phone Numbers** → buy or import a US number
3. Bind the number to your English intake agent

## 2. Vercel env (Production)

| Variable | Example | Required |
|----------|---------|----------|
| `RETELL_API_KEY` | `key_...` | Yes |
| `RETELL_FORWARD_NUMBER` | `+1762...` | Yes* |
| `RETELL_AGENT_ID` | `agent_6e612965...` | Optional (has default) |
| `RETELL_LLM_ID` | `llm_9e819a06...` | Optional (has default) |

\*If `RETELL_FORWARD_NUMBER` is omitted but `RETELL_API_KEY` is set, production auto-discovers the number from Retell's list-phone-numbers API.

Also required (already set for voice):

- `TWILIO_WEBHOOK_BASE_URL=https://effiroad.com`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

## 3. One-shot sync (local)

```bash
# .env.local needs RETELL_API_KEY + KV creds + TWILIO_DEFAULT_USER_ID
npm run retell:sync
```

This script:

- Sets Retell inbound webhook → `https://effiroad.com/api/retell/inbound`
- Wires `submit_intake` + `submit_estimate` tools on the LLM
- Binds Retell phone → tenant in KV (when `TWILIO_DEFAULT_USER_ID` set)
- Prints `RETELL_FORWARD_NUMBER` to paste into Vercel

## 4. Sync English production agent

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://effiroad.com/api/cron/retell-production-sync
```

Or locally: `npm run retell:sync`

## 5. Verify

```bash
curl https://effiroad.com/api/retell/status
```

Expect `ok: true` and `forwardNumberConfigured: true`.

**Live test:** call **+1 (225) 529-1680** → **1** → **1** → talk naturally with the AI.

If Retell fails to connect, Twilio falls back to scripted speech intake automatically (`/api/twilio/dial-fallback`).

## 6. Owner setup URLs (logged in)

- Switch agent to English: `/api/admin/retell-setup?action=english`
- Production prompt (booking + estimate branching): `/api/admin/retell-setup?action=production`
- Bind a number to your account: `/api/admin/retell-setup?action=bind-number&number=%2B1...`

## Tool endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/retell/inbound` | Dynamic variables before call connects |
| `POST /api/retell/tools/submit-intake` | Book/dispatch after AI collects details |
| `POST /api/retell/tools/submit-estimate` | Free estimate request (no dispatch) |
