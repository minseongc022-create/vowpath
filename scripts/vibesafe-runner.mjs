#!/usr/bin/env node
/**
 * VibeSafe 브라우저 워커.
 *
 * ★ 왜 별도 프로세스인가 (Vercel 함수 안에서 안 돌리는 이유)
 *
 * Playwright는 Chromium 바이너리(~150MB)와 수 초~수십 초의 실행 시간을 필요로
 * 한다. 서버리스 함수 크기 제한과 실행 시간 제한 양쪽에 정면으로 부딪힌다.
 * "되게" 만들 수는 있지만(@sparticuz/chromium 등) 불안정하고, 무엇보다 실패가
 * 조용하다 — 검사 서비스가 검사에 실패한 걸 모르는 건 최악이다.
 *
 * 그래서 워커는 HTTPS로 큐를 물어보고, 브라우저를 돌리고, 결과를 돌려주는
 * 평범한 Node 프로세스다. 노트북에서도, 작은 VPS에서도, 도커에서도 똑같이 돈다.
 *
 * 실행:
 *   VIBESAFE_API_URL=https://your-app.com \
 *   VIBESAFE_RUNNER_TOKEN=... \
 *   npm run vibesafe:runner
 *
 * 한 번만 돌리고 끝내려면 --once (cron/CI용).
 */

import { chromium } from "playwright";

const API_URL = (process.env.VIBESAFE_API_URL || "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = process.env.VIBESAFE_RUNNER_TOKEN || "";
const POLL_INTERVAL_MS = Number(process.env.VIBESAFE_RUNNER_POLL_MS || 15_000);
const ONCE = process.argv.includes("--once");

/**
 * 쓸 브라우저 실행 파일을 직접 지정한다.
 *
 * Playwright는 자기 버전에 맞는 브라우저를 내려받아 쓰는데, 도커 이미지나
 * CI처럼 브라우저가 이미 깔려 있는 환경에서는 그걸 그대로 쓰는 편이 낫다
 * (150MB를 매번 받지 않는다). 비워두면 평소대로 Playwright가 알아서 찾는다.
 */
const BROWSER_PATH = process.env.VIBESAFE_BROWSER_PATH?.trim() || null;

const STEP_TIMEOUT_MS = Number(process.env.VIBESAFE_STEP_TIMEOUT_MS || 15_000);
const FLOW_TIMEOUT_MS = Number(process.env.VIBESAFE_FLOW_TIMEOUT_MS || 90_000);
const NAV_TIMEOUT_MS = Number(process.env.VIBESAFE_NAV_TIMEOUT_MS || 30_000);

if (!TOKEN) {
  console.error("VIBESAFE_RUNNER_TOKEN이 필요합니다.");
  process.exit(1);
}

/**
 * 우리 단계 문법 → Playwright locator.
 *
 * 화면에 보이는 글자·역할로 지목하는 것을 우선한다. 자동 생성 클래스명에
 * 기대면 다음 배포마다 거짓 경보가 난다 — 그건 이 제품의 신뢰를 깎는다.
 */
function toLocator(page, selector) {
  const idx = selector.indexOf(":");
  const kind = selector.slice(0, idx).trim().toLowerCase();
  const rest = selector.slice(idx + 1).trim();

  if (kind === "role") {
    const [role, name] = rest.split("|");
    const options = name?.trim() ? { name: name.trim() } : undefined;
    return page.getByRole(role.trim(), options).first();
  }
  if (kind === "text") return page.getByText(rest, { exact: false }).first();
  if (kind === "label") return page.getByLabel(rest, { exact: false }).first();
  if (kind === "placeholder") return page.getByPlaceholder(rest, { exact: false }).first();
  if (kind === "testid") return page.getByTestId(rest).first();
  if (kind === "css") return page.locator(rest).first();
  throw new Error(`알 수 없는 선택자 형식: ${kind}`);
}

function absoluteUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

/**
 * 오류 메시지 정리.
 *
 * 두 가지를 한다.
 *  1) 비밀값 지우기 — Playwright는 fill에 넣은 값을 오류 메시지에 그대로 싫는다.
 *     이걸 안 지우면 테스트 계정 비밀번호가 DB와 알림 이메일에 남는다.
 *  2) 터미널 색상 코드 지우기 — Playwright의 call log에는 ANSI 이스케이프가
 *     섞여 있다. 터미널에서는 색이지만 웹 화면과 이메일에서는 `[2m` 같은
 *     쓰레기 문자로 보인다.
 */
const ANSI_RE = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*[A-Za-z]", "g");

function scrub(message, secrets) {
  let out = String(message || "").replace(ANSI_RE, "");
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join("••••••");
  }
  return out.slice(0, 2000);
}

async function runStep(page, step, baseUrl) {
  switch (step.action) {
    case "goto":
      await page.goto(absoluteUrl(baseUrl, step.value), {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      return;
    case "click":
      await toLocator(page, step.selector).click({ timeout: STEP_TIMEOUT_MS });
      return;
    case "fill":
      await toLocator(page, step.selector).fill(step.value ?? "", { timeout: STEP_TIMEOUT_MS });
      return;
    case "press":
      await toLocator(page, step.selector).press(step.value ?? "Enter", { timeout: STEP_TIMEOUT_MS });
      return;
    case "expect_text": {
      // 화면 어디에든 그 글자가 보이면 통과. 위치까지 따지면 사소한 레이아웃
      // 변경에 거짓 경보가 난다.
      const locator = page.getByText(step.value ?? "", { exact: false }).first();
      await locator.waitFor({ state: "visible", timeout: STEP_TIMEOUT_MS });
      return;
    }
    case "expect_visible":
      await toLocator(page, step.selector).waitFor({ state: "visible", timeout: STEP_TIMEOUT_MS });
      return;
    case "expect_url": {
      const expected = step.value ?? "";
      const deadline = Date.now() + STEP_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (page.url().includes(expected)) return;
        await page.waitForTimeout(250);
      }
      throw new Error(`주소에 "${expected}"가 포함되지 않았습니다. 현재 주소: ${page.url()}`);
    }
    case "wait":
      await page.waitForTimeout(Math.min(Number(step.value) || 1000, 10_000));
      return;
    default:
      throw new Error(`알 수 없는 동작: ${step.action}`);
  }
}

async function runFlow(browser, flow, baseUrl, secrets) {
  const startedAt = new Date();
  // 흐름마다 새 컨텍스트 — 앞 흐름의 로그인 상태가 다음 흐름에 새면 검사가
  // 거짓으로 통과한다(로그인 흐름이 깨져도 이미 로그인돼 있어서 통과).
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "ko-KR",
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 VibeSafe/1.0",
  });
  const page = await context.newPage();

  const result = {
    flowKey: flow.key,
    status: "passed",
    startedAt: startedAt.toISOString(),
    finishedAt: startedAt.toISOString(),
    failedStepOrder: null,
    failedStepDescription: null,
    errorMessage: null,
    url: null,
    screenshotBase64: null,
  };

  const deadline = Date.now() + FLOW_TIMEOUT_MS;

  try {
    for (const step of flow.steps) {
      if (Date.now() > deadline) throw new Error("흐름이 제한 시간을 넘겼습니다.");
      try {
        await runStep(page, step, baseUrl);
      } catch (error) {
        if (step.optional) continue;
        result.status = "failed";
        result.failedStepOrder = step.order;
        result.failedStepDescription = step.description;
        result.errorMessage = scrub(error?.message ?? error, secrets);
        break;
      }
    }
  } catch (error) {
    result.status = "failed";
    result.errorMessage = scrub(error?.message ?? error, secrets);
  }

  try {
    result.url = page.url();
    if (result.status === "failed") {
      // 실패 순간의 화면. 폭을 줄이고 JPEG로 — 그대로 DB에 들어가는 값이다.
      const buffer = await page.screenshot({ type: "jpeg", quality: 55, timeout: 10_000 });
      if (buffer.length <= 280_000) result.screenshotBase64 = buffer.toString("base64");
    }
  } catch {
    // 화면 한 장 못 찍었다고 결과를 버리지 않는다.
  }

  result.finishedAt = new Date().toISOString();
  await context.close().catch(() => {});
  return result;
}

async function claimJob() {
  const res = await fetch(`${API_URL}/api/vibesafe/runner/claim`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`claim 실패 (${res.status})`);
  const data = await res.json();
  return data.job ?? null;
}

async function submitResults(job, results, runError) {
  const res = await fetch(`${API_URL}/api/vibesafe/runner/complete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      runId: job.runId,
      claimToken: job.claimToken,
      results,
      runError: runError ?? null,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`complete 실패 (${res.status}) ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function processJob(job) {
  console.log(`[vibesafe] 검사 시작: ${job.projectName} (${job.flows.length}개 흐름)`);

  // 결과에 값이 새지 않게 하려고 이번 작업의 비밀값을 모아둔다.
  const secrets = [];
  for (const flow of job.flows) {
    for (const step of flow.steps) {
      if (step.value && step.action === "fill") secrets.push(step.value);
    }
  }

  const browser = await chromium.launch({
    headless: true,
    ...(BROWSER_PATH ? { executablePath: BROWSER_PATH } : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const results = [];
  let runError = null;
  try {
    for (const flow of job.flows) {
      const result = await runFlow(browser, flow, job.baseUrl, secrets);
      console.log(`  - ${flow.title}: ${result.status === "passed" ? "정상" : "실패"}`);
      results.push(result);
    }
  } catch (error) {
    runError = scrub(error?.message ?? error, secrets);
  } finally {
    await browser.close().catch(() => {});
  }

  const outcome = await submitResults(job, results, runError);
  console.log(`[vibesafe] 검사 완료: ${outcome.status ?? "?"}`);
}

async function tick() {
  const job = await claimJob();
  if (!job) return false;
  await processJob(job);
  return true;
}

async function main() {
  console.log(`[vibesafe] 워커 시작 — ${API_URL}`);
  if (ONCE) {
    const did = await tick();
    if (!did) console.log("[vibesafe] 대기 중인 검사가 없습니다.");
    return;
  }

  // 일이 있으면 바로 다음 것을 집고, 없으면 쉰다. 쉬지 않고 물어보면
  // 함수 호출 비용이 그대로 나간다.
  for (;;) {
    try {
      const did = await tick();
      if (!did) await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    } catch (error) {
      console.error(`[vibesafe] ${error?.message ?? error}`);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
