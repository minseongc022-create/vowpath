# Retell AI — Conversational intake (Effiroad)

Retell handles the **entire inbound call** when `RETELL_API_KEY` is set — no DTMF menu.

## Architecture

```
Customer → +1 (225) 529-1680 (Twilio)
         → register-phone-call + SIP bridge (immediate)
         → Retell conversational agent (entire call)
         → tools: send_intake_link | submit_intake | submit_estimate
```

**Important:** When `RETELL_API_KEY` is set, inbound calls connect straight to Retell — **no press-1-2-3 menu**. Set `RETELL_DTMF_IVR=true` to restore the old phone tree.

The agent explains services verbally, detects intent (emergency vs estimate), then offers **link vs phone** in conversation.

Example flow:
- Caller: "I need a free estimate"
- AI: "Happy to help — would you like me to text you a quick form, or walk through it together on the phone?"
- Link → `send_intake_link` tool | Phone → collect details → `submit_estimate`

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

This script (same logic as production postbuild sync):

- Sets Retell inbound webhook → `https://effiroad.com/api/retell/inbound`
- Pushes `general_prompt`, `begin_message`, and all tools (`send_intake_link`, `submit_intake`, `submit_estimate`)
- Tunes agent STT keywords and responsiveness
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

**Live test:** call **+1 (225) 529-1680** → AI answers immediately → say "I need an estimate" → choose link or phone.

If Retell fails to connect, Twilio falls back to scripted speech intake automatically (`/api/twilio/dial-fallback`).

## 6. Owner setup URLs (logged in)

- Switch agent to English: `/api/admin/retell-setup?action=english`
- Production prompt (booking + estimate branching): `/api/admin/retell-setup?action=production`
- Bind a number to your account: `/api/admin/retell-setup?action=bind-number&number=%2B1...`

## Tool endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/retell/inbound` | Dynamic variables before call connects |
| `POST /api/retell/tools/send-intake-link` | Text self-service link when caller chooses SMS |
| `POST /api/retell/tools/submit-intake` | Book/dispatch after phone intake |
| `POST /api/retell/tools/submit-estimate` | Free estimate request (no dispatch) |
