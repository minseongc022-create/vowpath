/**
 * 배포가 실제로 살아있는지 확인한다.
 *
 * ★ 왜 새로 썼나
 *
 * 여기엔 검증 스크립트가 둘 있었는데 **둘 다 없어진 것을 확인하고 있었다**:
 *   · giu-deploy-verify.mjs      → 구쿠(giucuu.com은 이제 자비스 자리다)
 *   · effiroad-deploy-verify.mjs → /toss-shop/* (통째로 삭제됐다)
 * 그래서 배포 워크플로가 계속 빨간불이었고, 아무도 그걸 실제 고장과
 * 구분할 수 없었다 — 늘 빨간 신호등은 신호등이 아니다.
 *
 * ★ 무엇을 보는가
 *
 * "떠 있다"가 아니라 **자비스가 자비스답게 동작하는가**를 본다.
 * 특히 자동 소싱 크론은 사람 눈에 안 보이는 곳에서 도는데, 실제로
 * 도메인을 옮기면서 크론이 조용히 죽은 적이 있다(www 없이 apex를 부르면
 * 308에서 멈춘다). 그 사고가 다시 나면 여기서 잡힌다.
 *
 * Usage: node scripts/jarvis-deploy-verify.mjs [baseUrl]
 */
const base = (process.argv[2] ?? "https://www.giucuu.com").replace(/\/$/, "");
const EMPTY_DOMAIN = "https://effiroad.com";

async function check(label, url, expect, opts = {}) {
  try {
    const res = await fetch(url, {
      redirect: opts.follow === false ? "manual" : "follow",
      signal: AbortSignal.timeout(25_000),
    });
    const ok = expect.includes(res.status);
    console.log(`${ok ? "✓" : "✗"} ${label}\n    ${url} → ${res.status} (기대: ${expect.join("|")})`);
    return ok;
  } catch (e) {
    console.log(`✗ ${label}\n    ${url} → 요청 실패: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  console.log(`\n=== 자비스 배포 검증 (${base}) ===\n`);

  const checks = [];

  // 사장님이 들어올 수 있어야 한다 — 유일하게 열려 있는 문
  checks.push(await check("로그인 화면이 뜬다", `${base}/login`, [200]));

  // 사장님이 아니면 아무것도 안 보여야 한다
  checks.push(await check("로그인 안 하면 홈이 안 보인다", `${base}/`, [404]));
  checks.push(await check("로그인 안 하면 검수 화면이 안 보인다", `${base}/review`, [404]));
  checks.push(await check("로그인 안 하면 설정이 안 보인다", `${base}/settings`, [404]));
  checks.push(
    await check("자비스 API는 세션 없이 안 열린다", `${base}/api/jarvis/settings`, [401, 404]),
  );

  // ★ 자동 소싱 크론 — 리다이렉트를 따라가지 않고 본다.
  // 여기서 308이 나오면 크론이 그 자리에서 멈춘다는 뜻이다(실제로 났던 사고).
  checks.push(
    await check(
      "크론이 리다이렉트 없이 바로 닿는다 (308이면 자동 소싱이 죽는다)",
      `${base}/api/jarvis/cron`,
      [401],
      { follow: false },
    ),
  );

  // 옛 사업의 흔적이 이 도메인에 남아 있으면 안 된다
  checks.push(await check("구쿠 화면이 안 열린다", `${base}/giu`, [404]));
  checks.push(await check("구쿠 API가 안 열린다", `${base}/api/giu/health`, [404]));

  // 옛 도메인은 텅 비어 있어야 한다
  checks.push(await check("옛 도메인이 비어 있다", `${EMPTY_DOMAIN}/`, [404]));
  checks.push(
    await check("옛 도메인에 자비스가 안 남아 있다", `${EMPTY_DOMAIN}/login`, [404]),
  );

  const ok = checks.every(Boolean);
  console.log(`\n${ok ? "✓ 자비스 배포 정상" : "✗ 자비스 배포 검증 실패"}\n`);
  process.exit(ok ? 0 : 1);
}

main();
