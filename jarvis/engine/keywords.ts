/**
 * 검색어 풀 — 자비스가 매일 훑는 시장
 *
 * ★ 왜 검색어를 고정 목록으로 두는가
 *
 * "후보가 0개"의 원인은 대부분 기준이 빡빡해서가 아니라 **훑은 범위가
 * 좁아서**다. 관문을 통과할 상품은 있는데 애초에 그 상품을 본 적이 없는 것이다.
 * 그래서 기준(rules.ts)은 절대 안 건드리고, 대신 여기를 넓힌다.
 *
 * ★ 어떤 검색어를 골랐는가
 *
 * 우리 가격대(공급가 2,000~150,000원 / 판매가 5,000~300,000원)와 맞고,
 * 위탁 드랍십에서 실제로 돌아가는 조건을 갖춘 것만 넣었다:
 *
 *  · 낱개로 사기 쉬운 공산품 — 묶음 전용(식품·소모품 대량)은 뺐다
 *  · 부피·무게가 작아 배송비가 마진을 안 먹는 것
 *  · 규격·호환이 단순한 것 — 사이즈/색상 오배송 CS가 마진을 갉아먹지 않게
 *  · 계절을 타되 1년 내내 죽지는 않는 것
 *
 * 명시적으로 **뺀** 것들과 그 이유:
 *  · 식품·건강기능식품 → 별도 인허가, 유통기한 반품 리스크
 *  · 화장품 → 기능성 심사·성분 표시 의무
 *  · 유아용품 → KC 인증 필수, 안전 사고 시 책임 범위가 크다
 *  · 전자제품 본체 → KC/전파 인증, 초기불량 반품률이 위탁 마진을 넘는다
 *    (케이스·거치대 같은 액세서리는 인증 부담이 없어 포함)
 */

export type KeywordSeed = {
  keyword: string;
  category: string;
  /** 왜 이 검색어가 우리 조건에 맞는지 — 나중에 뺄지 말지 판단하는 근거 */
  note?: string;
};

/**
 * 계절 가중 — 지금 시점에 잘 팔릴 것부터 훑는다.
 * 훑는 순서만 바꿀 뿐 **후보에서 빼지는 않는다.** 순서가 곧 우선순위다.
 */
function seasonBoost(month: number): string[] {
  // 1~12월
  if (month >= 3 && month <= 5) return ["봄", "환절기", "나들이", "캠핑"];
  if (month >= 6 && month <= 8) return ["여름", "냉감", "제습", "휴대용선풍기"];
  if (month >= 9 && month <= 11) return ["가을", "환절기", "캠핑", "정리"];
  return ["겨울", "보온", "난방", "실내"];
}

const SEEDS: KeywordSeed[] = [
  // ── 폰·태블릿 액세서리 ── 인증 부담 없고 낱개 발주가 쉽다
  { keyword: "휴대폰 거치대", category: "digital_acc" },
  { keyword: "차량용 휴대폰 거치대", category: "digital_acc" },
  { keyword: "태블릿 거치대", category: "digital_acc" },
  { keyword: "태블릿 케이스", category: "digital_acc" },
  { keyword: "노트북 파우치", category: "digital_acc" },
  { keyword: "노트북 거치대", category: "digital_acc" },
  { keyword: "케이블 정리", category: "digital_acc" },
  { keyword: "멀티 충전 케이블", category: "digital_acc" },
  { keyword: "USB 허브", category: "digital_acc" },
  { keyword: "무선충전 패드", category: "digital_acc" },
  { keyword: "보조배터리 케이스", category: "digital_acc" },
  { keyword: "블루투스 리모컨", category: "digital_acc" },

  // ── 주방 ── 회전율이 높고 규격이 단순하다
  { keyword: "주방 수납선반", category: "kitchen" },
  { keyword: "싱크대 정리대", category: "kitchen" },
  { keyword: "밀폐용기 세트", category: "kitchen" },
  { keyword: "실리콘 조리도구", category: "kitchen" },
  { keyword: "도마 세트", category: "kitchen" },
  { keyword: "커피 드리퍼", category: "kitchen" },
  { keyword: "텀블러", category: "kitchen" },
  { keyword: "보온병", category: "kitchen" },
  { keyword: "수저통", category: "kitchen" },
  { keyword: "냄비 받침", category: "kitchen" },

  // ── 생활·수납 ── 부피 대비 단가가 좋고 사계절 팔린다
  { keyword: "옷걸이 세트", category: "living" },
  { keyword: "수납 정리함", category: "living" },
  { keyword: "서랍 정리함", category: "living" },
  { keyword: "신발 정리대", category: "living" },
  { keyword: "빨래 건조대", category: "living" },
  { keyword: "욕실 선반", category: "living" },
  { keyword: "샤워기 헤드", category: "living" },
  { keyword: "현관 매트", category: "living" },
  { keyword: "압축 수납팩", category: "living" },
  { keyword: "행거", category: "living" },

  // ── 사무·문구 ── 반품률이 낮다
  { keyword: "책상 정리함", category: "office" },
  { keyword: "모니터 받침대", category: "office" },
  { keyword: "독서대", category: "office" },
  { keyword: "무선 마우스패드", category: "office" },
  { keyword: "필기구 세트", category: "office" },
  { keyword: "다이어리", category: "office" },
  { keyword: "화이트보드", category: "office" },

  // ── 자동차 용품 ── 규격 호환이 명확해 오배송이 적다
  { keyword: "차량용 정리함", category: "car" },
  { keyword: "차량용 방향제", category: "car" },
  { keyword: "차량용 햇빛가리개", category: "car" },
  { keyword: "트렁크 정리함", category: "car" },
  { keyword: "차량용 컵홀더", category: "car" },

  // ── 반려동물 ── 재구매가 잦다
  { keyword: "반려견 하네스", category: "pet" },
  { keyword: "고양이 스크래처", category: "pet" },
  { keyword: "반려동물 급식기", category: "pet" },
  { keyword: "펫 드라이룸 매트", category: "pet" },

  // ── 운동·레저 ── 부피 작은 것 위주
  { keyword: "요가 매트", category: "sports" },
  { keyword: "폼롤러", category: "sports" },
  { keyword: "운동 밴드", category: "sports" },
  { keyword: "등산 스틱", category: "sports" },
  { keyword: "캠핑 랜턴", category: "sports" },
  { keyword: "캠핑 의자", category: "sports" },

  // ── 계절 ──
  { keyword: "휴대용 선풍기", category: "season" },
  { keyword: "쿨링 방석", category: "season" },
  { keyword: "제습제", category: "season" },
  { keyword: "전기 찜질기", category: "season" },
  { keyword: "무릎 담요", category: "season" },
  { keyword: "발열 조끼", category: "season" },
  { keyword: "가습기", category: "season" },

  // ── 패션잡화 ── 사이즈가 없는 것만 (사이즈 있으면 반품률이 급등한다)
  { keyword: "크로스백", category: "fashion_acc" },
  { keyword: "에코백", category: "fashion_acc" },
  { keyword: "지갑", category: "fashion_acc" },
  { keyword: "우산", category: "fashion_acc" },
  { keyword: "모자", category: "fashion_acc" },
  { keyword: "머플러", category: "fashion_acc" },
  { keyword: "장갑", category: "fashion_acc" },
];

/**
 * 오늘 훑을 검색어를 순서대로 낸다.
 *
 * @param limit 몇 개나 훑을지
 * @param offset 지난 사이클에서 이어서 — 매번 같은 앞쪽만 훑으면 뒤쪽 검색어는
 *   영원히 기회를 못 받는다. 10분마다 도는 자동 운전이 조금씩 밀어가며 전체를 돈다.
 */
export function getKeywords(limit = 24, offset = 0): KeywordSeed[] {
  const boosts = seasonBoost(new Date().getMonth() + 1);

  const scored = SEEDS.map((seed, i) => {
    // 계절 키워드와 겹치면 앞으로 당긴다
    const boosted = boosts.some((b) => seed.keyword.includes(b) || seed.category === "season");
    return { seed, rank: (boosted ? 0 : 1000) + i };
  }).sort((a, b) => a.rank - b.rank);

  const ordered = scored.map((s) => s.seed);
  const start = ((offset % ordered.length) + ordered.length) % ordered.length;

  // 끝에 닿으면 앞으로 돌아와 이어붙인다 — 전체를 빠짐없이 돈다
  const out: KeywordSeed[] = [];
  for (let i = 0; i < Math.min(limit, ordered.length); i++) {
    out.push(ordered[(start + i) % ordered.length]);
  }
  return out;
}

export function keywordPoolSize(): number {
  return SEEDS.length;
}
