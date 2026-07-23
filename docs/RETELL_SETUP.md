# Retell AI — Conversational intake (Effiroad)

Retell handles the **entire inbound call** when `RETELL_API_KEY` is set — no DTMF menu.

## Architecture

```
Customer → +1 (225) 529-1680 (Twilio)
         → register-phone-call + SIP bridge (immediate)
         → Retell conversational agent (entire call)
         → tools: submit_intake | submit_estimate | get_open_slots
```

**Default flow:** Twilio plays a short main menu (press 1 = service, press 2 = estimate), then connects straight to Retell — **no second keypad menu**. Say "text link" at the main menu to get an SMS form instead. Set `RETELL_SKIP_DTMF_MENU=true` to skip the main menu entirely.

Example flow:
- Caller hears main menu (press 1 = service, press 2 = estimate)
- Press 1 → Retell **booking agent** starts intake on the call
- Press 2 → Retell **estimate agent** starts free-estimate intake
- Say "text link" → SMS form sent, call ends
- Phone intake → one question at a time → `submit_intake` (no verbal time slots) → SMS link to pick visit time on the portal calendar
- Estimate intake → `submit_estimate` → shop follow-up
- Say "text link" → SMS form sent, call ends

**Auto-sync:** On every Vercel production deploy, `postbuild-retell-sync.mjs` pushes the latest prompt and tools to Retell (when `RETELL_API_KEY` is set in Vercel).

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
| `RETELL_AGENT_ID` | `agent_6e612965...` | Booking/service agent (optional default) |
| `RETELL_ESTIMATE_AGENT_ID` | `agent_...` | Estimate agent — warmer voice (auto-created on first sync if unset) |
| `RETELL_ESTIMATE_VOICE_ID` | `11labs-Chris` | Optional estimate voice override |
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

This script (same logic as production postbuild sync):

- Sets Retell inbound webhook → `https://effiroad.com/api/retell/inbound`
- Pushes `general_prompt`, `begin_message`, and tools (`submit_intake`, `submit_estimate`, `get_open_slots`)
- Tunes agent voice (natural US receptionist), backchannel ("mm-hmm", "yeah"), and slower, more patient pacing
- Binds Retell phone → tenant in KV (when `TWILIO_DEFAULT_USER_ID` set)

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

**Live test:** call your Effiroad number → hear main menu → press **1** (service) → press **1** (talk now) → professional dispatcher collects name, address, issue.

If Retell fails to connect, Twilio falls back to scripted speech intake automatically (`/api/twilio/dial-fallback`).

## 6. Owner setup URLs (logged in)

- Switch agent to English: `/api/admin/retell-setup?action=english`
- Production prompt (booking + estimate branching): `/api/admin/retell-setup?action=production`
- Bind a number to your account: `/api/admin/retell-setup?action=bind-number&number=%2B1...`

## Tool endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/retell/inbound` | Dynamic variables before call connects |
| `POST /api/retell/tools/submit-intake` | Book/dispatch after phone intake |
| `POST /api/retell/tools/submit-estimate` | Free estimate request (no dispatch) |
| `POST /api/retell/tools/get-slots` | Open visit windows for scheduling |
