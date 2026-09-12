import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  TECHNICAL_DETAIL_KINDS,
  UI_MODE_OPTIONS,
  UI_MODE_QUESTION,
  isUiMode,
  normalizeUiMode,
  showsByDefault,
} from "@/vibesafe/lib/ui-mode";
import { prepareUserRoles, resolveRoleKey, DEFAULT_ROLE } from "@/vibesafe/lib/analysis/prepare-roles";

/**
 * ★ 이 파일이 지키는 것
 *
 * 1. 간편 모드는 정보를 지우는 모드가 아니라 접는 모드다.
 * 2. 앱을 쓰는 사람(AppUserRole)과 VibeSafe를 보는 사람(uiMode)은
 *    코드에서도 절대 연결되지 않는다.
 */

test("기본값은 간편 모드다", () => {
  assert.equal(normalizeUiMode(undefined), "simple");
  assert.equal(normalizeUiMode(null), "simple");
  assert.equal(normalizeUiMode("정체불명"), "simple");
  assert.equal(normalizeUiMode("expert"), "expert");
  assert.equal(isUiMode("hacker"), false);
});

test("온보딩 질문은 실력을 묻지 않는다", () => {
  // "당신은 개발자입니까?"는 자존심이 걸린 질문이라 정직한 답이 안 나온다.
  const text = [UI_MODE_QUESTION, ...UI_MODE_OPTIONS.flatMap((o) => [o.label, o.detail])].join(" ");
  assert.ok(
    !/개발자|초보|전문가이신|실력|잘 아시|모르시/.test(text),
    `질문이 실력을 묻는다: ${text}`,
  );
  assert.match(UI_MODE_QUESTION, /어떻게 도와드릴까요/);
});

test("두 선택지 모두 부끄럽지 않은 말로 쓰여 있다", () => {
  assert.equal(UI_MODE_OPTIONS.length, 2);
  for (const option of UI_MODE_OPTIONS) {
    assert.ok(option.label.length > 5);
    assert.ok(option.detail.length > 10);
    assert.ok(option.example.length > 5);
    assert.ok(!/쉬운 분|어려운|초보/.test(option.label), `깎아내리는 표현: ${option.label}`);
  }
});

test("전문가 모드는 모든 기술 상세를 처음부터 보여준다", () => {
  for (const kind of TECHNICAL_DETAIL_KINDS) {
    assert.equal(showsByDefault("expert", kind), true);
    assert.equal(showsByDefault("simple", kind), false);
  }
});

/**
 * ★ 가장 중요한 테스트
 *
 * "이 앱은 일반인이 쓰니 만든 사람도 초보겠군요"는 자주 틀리고, 틀렸을 때
 * 무례하며, 사용자가 왜 그런 화면을 보는지 알 길이 없다. 그래서 두 개념
 * 사이에 코드 경로를 만들지 않는다 — 만들고 싶어질 때를 대비해 고정한다.
 */
test("앱 사용자 역할이 VibeSafe 화면 모드를 결정하는 코드 경로가 없다", () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry)) files.push(full);
    }
  };
  walk("vibesafe");
  walk("app/(vibesafe)");
  walk("app/api/vibesafe");

  // 두 값이 한 줄에 함께 나오는 것 자체는 정상이다 — 장애 문구는 "누가"
  // (앱 사용자 역할)와 "어떤 말로"(화면 모드)를 둘 다 필요로 하고, 그 둘을
  // 나란히 받는 함수 시그니처가 있어야 한다.
  //
  // 막아야 하는 것은 **한쪽에서 다른 쪽을 끌어내는 것**이다:
  //   uiMode = 앱_사용자_역할로부터_추론()
  // 이 추론은 자주 틀리고, 틀렸을 때 무례하고, 사용자가 왜 그런 화면을 보는지
  // 알 길이 없다. 그래서 대입·인자·반환 자리만 본다.
  const ROLE = /appUserRole|AppUserRole|prepareUserRoles|resolveRoleKey|roleTitle|isPrimary/;
  const MODE_LITERAL = /["'](simple|expert)["']/;

  const offenders = [];
  for (const file of files) {
    const code = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    for (const line of code.split("\n")) {
      // 대입/프로퍼티의 **값 쪽만** 본다. `{ mode: UiMode; roleTitle: string }`
      // 같은 타입 선언에서 뒤 항목까지 끌어오지 않도록 `;`, `,`, `)`에서 끊는다.
      const valueOf = (name) => {
        const match = line.match(new RegExp(`\\b(?:${name})\\s*[:=]\\s*([^;,)]*)`));
        return match ? match[1] : "";
      };

      // 1) 화면 모드에 역할에서 온 값을 대입한다
      const assignsModeFromRole = ROLE.test(valueOf("uiMode|mode"));
      // 2) setUiMode(...)에 역할이 섞여 들어간다
      const setsModeFromRole = /setUiMode\s*\(/.test(line) && ROLE.test(line);
      // 3) 역할을 보고 "simple"/"expert"를 고른다
      const picksModeFromRole = MODE_LITERAL.test(line) && ROLE.test(line);
      // 4) 반대 방향 — 화면 모드를 보고 앱 사용자 역할을 정한다
      const assignsRoleFromMode = /\buiMode\b|UiMode\b/.test(
        valueOf("appUserRoleId|roleTitle|isPrimary"),
      );

      if (assignsModeFromRole || setsModeFromRole || picksModeFromRole || assignsRoleFromMode) {
        offenders.push(`${file}: ${line.trim()}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `앱 사용자 역할에서 화면 모드를 끌어냈다(또는 그 반대):\n${offenders.join("\n")}`,
  );
});

test("uiMode는 사용자가 보낸 값으로만 바뀐다", () => {
  // setUiMode를 부르는 곳은 API 라우트 하나뿐이어야 한다. 분석·진단·수정
  // 어디에서도 화면 모드를 건드리지 않는다.
  const callers = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry) && /setUiMode\s*\(/.test(readFileSync(full, "utf8"))) {
        callers.push(full);
      }
    }
  };
  walk("vibesafe");
  walk("app");

  const outsideRoute = callers.filter(
    (file) => !file.includes("api/vibesafe/account/ui-mode") && !file.endsWith("user-prefs.ts"),
  );
  assert.deepEqual(outsideRoute, [], `화면 모드를 몰래 바꾸는 곳이 있다: ${outsideRoute}`);
});

/* ── 앱 사용자 역할 (USER 단계) ── */

test("역할이 하나도 없으면 기본 역할을 만든다", () => {
  const roles = prepareUserRoles({ flows: [] });
  assert.equal(roles.length, 1);
  assert.equal(roles[0].key, DEFAULT_ROLE.key);
  assert.equal(roles[0].isPrimary, true);
});

test("주 사용자는 정확히 한 명이다", () => {
  const roles = prepareUserRoles({
    flows: [],
    userRoles: [
      { key: "customer", title: "손님", description: "예약한다", isPrimary: true },
      { key: "owner", title: "사장님", description: "예약을 받는다", isPrimary: true },
      { key: "rider", title: "라이더", description: "배달한다", isPrimary: false },
    ],
  });
  assert.equal(roles.filter((r) => r.isPrimary).length, 1);
  assert.equal(roles[0].key, "customer");
});

test("아무도 주 사용자가 아니면 첫 번째가 된다", () => {
  const roles = prepareUserRoles({
    flows: [],
    userRoles: [
      { key: "a", title: "가", description: "", isPrimary: false },
      { key: "b", title: "나", description: "", isPrimary: false },
    ],
  });
  assert.equal(roles[0].isPrimary, true);
  assert.equal(roles[1].isPrimary, false);
});

test("없는 역할을 지목하면 주 사용자로 몰아주지 않고 버린다", () => {
  const roles = prepareUserRoles({
    flows: [],
    userRoles: [{ key: "customer", title: "손님", description: "", isPrimary: true }],
  });
  // 모르는 것을 아는 척하지 않는다.
  assert.equal(resolveRoleKey("admin", roles), null);
  assert.equal(resolveRoleKey("", roles), null);
  assert.equal(resolveRoleKey(null, roles), null);
  // key로도, 한국어 이름으로도 찾는다.
  assert.equal(resolveRoleKey("customer", roles), "customer");
  assert.equal(resolveRoleKey("손님", roles), "customer");
});

test("역할 key가 겹쳐도 서로 덮어쓰지 않는다", () => {
  const roles = prepareUserRoles({
    flows: [],
    userRoles: [
      { key: "user", title: "손님", description: "", isPrimary: true },
      { key: "user", title: "사장님", description: "", isPrimary: false },
    ],
  });
  assert.equal(roles.length, 2);
  assert.notEqual(roles[0].key, roles[1].key);
});
