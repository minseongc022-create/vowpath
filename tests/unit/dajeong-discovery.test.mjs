import test from "node:test";
import assert from "node:assert/strict";

import {
  dedupeDiscoveries,
  daysRemaining,
  discoveryHeadline,
  discoveryQueries,
  isStillRunning,
  matchesRegion,
  rankDiscoveries,
  selectDiscoveries,
  worthNotifying,
} from "../../dajeong/lib/discovery-engine.ts";

const TODAY = new Date("2026-09-04T12:00:00+09:00");

function official(overrides = {}) {
  return {
    id: "culture-1",
    title: "빛의 벙커 전시",
    source: "culture_data",
    sourceLabel: "문화데이터광장 등록 정보",
    confidence: "official",
    startDate: "2026-08-01",
    endDate: "2026-12-31",
    signals: [],
    checkedAt: TODAY.toISOString(),
    ...overrides,
  };
}

function inferred(overrides = {}) {
  return {
    id: "naver-blog-1",
    title: "성수 신상 팝업",
    source: "naver_blog",
    sourceLabel: "네이버 블로그 반응",
    confidence: "inferred",
    signals: ["최근 21일 블로그 글 12건"],
    checkedAt: TODAY.toISOString(),
    ...overrides,
  };
}

test("취향을 말하면 그 말이 검색어가 되고, 없을 때만 기본값을 쓴다", () => {
  const spoken = discoveryQueries({ region: "성수", preferences: ["도자기 공방"], moods: ["calm"] });
  assert.ok(spoken.includes("성수 도자기 공방"));
  // 사용자가 말한 걸 기본 키워드로 덮어쓰면 안 된다.
  assert.equal(spoken.some((query) => query.includes("팝업스토어")), false);

  const silent = discoveryQueries({ region: "성수" });
  assert.ok(silent.includes("성수 팝업스토어"));
});

test("이미 끝난 행사는 빼되, 날짜를 모르는 건 남긴다", () => {
  assert.equal(isStillRunning(official({ endDate: "2026-09-30" }), TODAY), true);
  assert.equal(isStillRunning(official({ endDate: "2026-08-31" }), TODAY), false);
  // 종료일을 모른다는 것과 끝났다는 것은 다르다.
  assert.equal(isStillRunning(official({ endDate: undefined }), TODAY), true);
  assert.equal(isStillRunning(inferred(), TODAY), true);
});

test("남은 날짜를 세고, 종료일이 없으면 undefined다", () => {
  assert.equal(daysRemaining(official({ endDate: "2026-09-11" }), TODAY), 7);
  assert.equal(daysRemaining(official({ endDate: undefined }), TODAY), undefined);
});

test("같은 행사가 두 출처에서 오면 기관 쪽을 남기고 블로그 근거만 합친다", () => {
  const merged = dedupeDiscoveries([
    inferred({ title: "빛의 벙커 전시", signals: ["최근 21일 블로그 글 9건"] }),
    official({ title: "빛의 벙커 전시" }),
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].confidence, "official");
  assert.equal(merged[0].endDate, "2026-12-31");
  // 블로그에서 온 근거는 버리지 않고 "화제이기도 하다"는 정보로 남긴다.
  assert.ok(merged[0].signals.includes("최근 21일 블로그 글 9건"));
});

test("확정이 추정보다 먼저 오고, 그 안에서는 곧 끝나는 것이 먼저다", () => {
  const ranked = rankDiscoveries([
    inferred(),
    official({ id: "far", endDate: "2026-12-31" }),
    official({ id: "soon", endDate: "2026-09-08" }),
  ], TODAY);
  assert.deepEqual(ranked.map((item) => item.id), ["soon", "far", "naver-blog-1"]);
});

test("지역이 다른 항목은 걸러내되, 주소가 없는 항목은 남긴다", () => {
  assert.equal(matchesRegion(official({ region: "인천" }), "인천"), true);
  assert.equal(matchesRegion(official({ region: "부산" }), "인천"), false);
  // 블로그 항목은 원래 주소가 없다. 검색어에 이미 지역을 넣어 물어봤다.
  assert.equal(matchesRegion(inferred(), "인천"), true);
});

test("추정 항목은 날짜를 말하지 않고 확인하라고 한다", () => {
  const line = discoveryHeadline(inferred(), TODAY);
  assert.ok(line.includes("블로그 글 12건"));
  assert.ok(line.includes("확인"));
  // 추정에서 날짜를 지어내면 안 된다.
  assert.equal(/\d{4}-\d{2}-\d{2}/.test(line), false);
});

test("곧 끝나는 확정 행사는 남은 날짜를 그대로 말한다", () => {
  assert.equal(discoveryHeadline(official({ endDate: "2026-09-08" }), TODAY), "2026-09-08까지야. 4일 남았어.");
  assert.equal(discoveryHeadline(official(), TODAY), "2026-08-01 ~ 2026-12-31");
});

test("알림은 기관에서 확인됐고 곧 끝나는 것만 보낸다", () => {
  assert.equal(worthNotifying(official({ endDate: "2026-09-10" }), TODAY), true);
  // 아직 넉 달 남은 걸 지금 찔러 알릴 이유가 없다.
  assert.equal(worthNotifying(official({ endDate: "2026-12-31" }), TODAY), false);
  // 블로그 반응만으로 먼저 알림을 보내면 확인 안 된 걸 밀어넣는 셈이 된다.
  assert.equal(worthNotifying(inferred(), TODAY), false);
});

test("이름이 달라도 좌표가 가까우면 같은 지역으로 본다", () => {
  // "광화문"으로 물었는데 실제 행사는 "경복궁"으로 등록돼 있다 — 실제로 겪은 문제.
  const gwanghwamun = { latitude: 37.5759, longitude: 126.9768 };
  const gyeongbokgung = official({ region: "서울", place: "경복궁", latitude: 37.5796, longitude: 126.9770 });
  assert.equal(matchesRegion(gyeongbokgung, "광화문", gwanghwamun), true);

  // 멀리 떨어진 곳은 좌표가 있어도 걸러야 한다.
  const busan = official({ region: "부산", place: "부산시립미술관", latitude: 35.1796, longitude: 129.0756 });
  assert.equal(matchesRegion(busan, "광화문", gwanghwamun), false);

  // 좌표가 없는 항목(블로그 추정)은 여전히 이름 겹침으로 판단한다.
  assert.equal(matchesRegion(inferred(), "광화문", gwanghwamun), true);
});

test("선별은 종료·지역·중복을 한 번에 정리한다", () => {
  const selected = selectDiscoveries({
    items: [
      official({ id: "ended", endDate: "2026-08-01" }),
      official({ id: "other-region", region: "부산", endDate: "2026-10-01" }),
      official({ id: "keep", region: "인천", endDate: "2026-09-20" }),
      inferred({ id: "buzz" }),
    ],
    region: "인천",
    today: TODAY,
  });
  assert.deepEqual(selected.map((item) => item.id), ["keep", "buzz"]);
});
