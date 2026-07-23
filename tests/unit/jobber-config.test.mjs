import test from "node:test";
import assert from "node:assert/strict";

test("getJobberRedirectUri strips whitespace; honors explicit prod URL; blocks localhost", async () => {
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    JOBBER_REDIRECT_URI: process.env.JOBBER_REDIRECT_URI,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    JOBBER_CLIENT_ID: process.env.JOBBER_CLIENT_ID,
  };

  process.env.NODE_ENV = "production";
  process.env.VERCEL_ENV = "production";
  process.env.JOBBER_REDIRECT_URI = " https://www.effiroad.com/api/jobber/callback ";
  process.env.JOBBER_CLIENT_ID = "961ac7e9-15c6-48bd-81ea-47c8afa40a7b";

  // Bust module cache so env reads are fresh.
  const modPath = new URL("../../lib/jobber-config.ts", import.meta.url).href;
  const { getJobberRedirectUri, getJobberClientId, JOBBER_PRODUCTION_CALLBACK_URI, getJobberRecommendedCallbackUris } =
    await import(`${modPath}?t=${Date.now()}`);

  // Explicit www is honored (so ops can match whatever Jobber registered).
  assert.equal(getJobberRedirectUri(), "https://www.effiroad.com/api/jobber/callback");
  assert.equal(getJobberClientId(), "961ac7e9-15c6-48bd-81ea-47c8afa40a7b");

  process.env.JOBBER_REDIRECT_URI = "http://localhost:3000/api/jobber/callback";
  assert.equal(getJobberRedirectUri(), JOBBER_PRODUCTION_CALLBACK_URI);

  process.env.JOBBER_CLIENT_ID = "961ac7e9-15c6-48 bd-81ea-47c8afa40a7b";
  assert.equal(getJobberClientId(), "961ac7e9-15c6-48bd-81ea-47c8afa40a7b");

  assert.ok(getJobberRecommendedCallbackUris().includes(JOBBER_PRODUCTION_CALLBACK_URI));

  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
