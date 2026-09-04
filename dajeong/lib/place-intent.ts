import type { PlanCategory } from "./types";

/**
 * "무엇을 찾아달라는 말인가"를 먼저 가른다.
 *
 * 실제로 겪은 사고: "까사올리브 찾아줘"라고 했는데 일류짬뽕·어.참새다가 나왔다.
 * 원인은 두 가지였고 둘 다 여기서 막는다.
 *   1) "찾아줘" 같은 요청 동사가 검색어에 그대로 섞여 들어가 상호명 매칭을 망쳤다.
 *   2) 상호명으로 못 찾으면 조용히 "인천 맛집" 같은 일반 검색으로 갈아타 엉뚱한 가게를
 *      정답인 양 보여줬다. 지목한 가게를 못 찾았으면 다른 가게를 내밀 게 아니라 그렇게 말해야 한다.
 */

export type PlaceIntent =
  /** 상호명·지점명을 콕 집었다 — 그 가게가 맞는지부터 확인한다. */
  | { kind: "specific"; placeName: string; raw: string }
  /** 조건만 말했다 — 조건에 맞는 후보를 넓게 찾는다. */
  | { kind: "conditional"; keywords: string; raw: string };

/** 요청을 감싸는 말 — 검색어에 들어가면 상호명 매칭만 망친다. */
const REQUEST_VERBS = /\s*(?:좀\s*)?(?:찾아|알아봐|알려|추천해|보여|잡아|예약해|골라|담아|넣어)\s*(?:줘|주라|줄래|주세요|봐|봐줘|줘요)?\s*$/;
/** "대림창고 가고 싶어"처럼 뒤에 붙는 의향 표현. 이것도 상호명이 아니다. */
const INTENT_TAILS = /\s*(?:에|을|를|좀)?\s*(?:가고|가보고|가려고|가려|갈래|들르고|들러|먹고|보고|묵고)\s*(?:싶어요|싶어|싶다|싶은데|해|해줘|봐)?\s*$/;
const LEADING_FILLER = /^\s*(?:음|아|그|저기|혹시|일단|그럼)\s+/;

/**
 * 상호명일 수 없는 말. 날짜·시간·인원·관계·일정 이야기가 섞여 있으면 그건 가게 이름이 아니다.
 * 이 방어가 없으면 "이번 주 토요일" 같은 평범한 대답까지 상호명 지목으로 읽혀,
 * 있지도 않은 가게를 못 찾았다고 되묻게 된다.
 */
const NOT_A_NAME = /오늘|내일|모레|주말|요일|이번\s*주|다음\s*주|\d{1,2}\s*시|\d{1,2}\s*명|\d+\s*박|\d+\s*일|\d+\s*만\s*원|여자친구|남자친구|여친|남친|남편|아내|엄마|아빠|어머니|아버지|부모님|친구|혼자|둘이|데이트|기념일|생일|프러포즈|프로포즈|여행|코스|하루|일정|계획|예산|모르|아무|알아서|상관없|맡길/;

/** 조건을 말하는 표현 — 하나라도 있으면 상호명 지목이 아니다. */
const CONDITION_WORDS = /분위기|조용|아늑|감성|예쁜|이쁜|맛있|괜찮|좋은|유명|인기|가성비|저렴|비싼|고급|넓은|뷰|야경|데이트|기념일|추천|같은|스러운|한\s*곳|만한/;

/** 업종을 가리키는 일반명사 — 이것만 있으면 조건 탐색이다. */
const CATEGORY_WORDS = /식당|맛집|카페|커피|밥집|술집|바|베이커리|빵집|꽃집|플라워|소품샵|편집샵|선물|케이크|전시|미술관|박물관|공원|호텔|펜션|숙소|스테이|파스타집|이탈리안|한식|일식|중식|양식/;

function stripRequestWrapping(text: string): { value: string; hadRequestWrapping: boolean } {
  let value = text.trim().replace(LEADING_FILLER, "");
  let hadRequestWrapping = false;
  // "찾아줘", "가고 싶어"가 겹쳐 붙는 경우까지 걷어낸다.
  for (let i = 0; i < 4; i += 1) {
    const next = value.replace(REQUEST_VERBS, "").replace(INTENT_TAILS, "").trim();
    if (next === value) break;
    hadRequestWrapping = true;
    value = next;
  }
  return { value: value.replace(/[?!。.]+$/, "").trim(), hadRequestWrapping };
}

/**
 * 남은 말이 업종·조건 없이 이름만 남았으면 상호명 지목으로 본다.
 * "까사올리브" → specific / "분위기 좋은 파스타집" → conditional
 */
export function classifyPlaceRequest(raw: string): PlaceIntent {
  const { value: stripped } = stripRequestWrapping(raw);
  if (!stripped) return { kind: "conditional", keywords: "", raw };

  // 날짜·인원·관계 같은 말이 섞여 있으면 상호명 지목이 아니다.
  if (NOT_A_NAME.test(stripped)) return { kind: "conditional", keywords: stripped, raw };

  const hasCondition = CONDITION_WORDS.test(stripped);
  const hasCategoryWord = CATEGORY_WORDS.test(stripped);
  const wordCount = stripped.split(/\s+/).filter(Boolean).length;

  // 조건어가 있으면 무조건 조건 탐색이다("분위기 좋은 파스타집").
  if (hasCondition) return { kind: "conditional", keywords: stripped, raw };
  // 업종어만 덜렁 있는 것도 조건 탐색이다("식당", "카페").
  if (hasCategoryWord && wordCount <= 2) return { kind: "conditional", keywords: stripped, raw };

  // 업종어가 섞여 있어도 고유명사가 함께면 지목으로 본다("까사올리브 파스타").
  if (wordCount <= 5) return { kind: "specific", placeName: stripped, raw };
  return { kind: "conditional", keywords: stripped, raw };
}

/**
 * 지목한 가게가 실제로 그 가게인지 판단한다.
 * 이름이 서로를 품고 있어야 인정한다 — "까사올리브"를 찾는데 "일류짬뽕"이 통과하면 안 된다.
 */
export function isSamePlaceName(requested: string, candidate: string): boolean {
  const normalize = (value: string) => value.replace(/[\s·,.\-()'"]/g, "").toLowerCase();
  const want = normalize(requested);
  const got = normalize(candidate);
  if (!want || !got) return false;
  if (got.includes(want) || want.includes(got)) return true;
  // 지점명이 붙은 경우("까사올리브 송도점")까지 인정하되, 앞부분이 충분히 겹쳐야 한다.
  const shared = [...want].filter((char, index) => got[index] === char).length;
  return want.length >= 3 && shared >= Math.ceil(want.length * 0.8);
}

/** 카테고리 힌트가 없을 때 문장에서 업종을 추측한다(선택 UI 없이 자연어만으로 찾게 하기 위함). */
export function guessCategory(text: string): PlanCategory | undefined {
  if (/카페|커피|디저트|베이커리|빵집/.test(text)) return "cafe";
  if (/케이크/.test(text)) return "cake";
  if (/꽃|플라워|꽃다발/.test(text)) return "flower";
  if (/소품|선물|기프트|편집샵/.test(text)) return "gift";
  if (/전시|미술관|박물관|공연|체험|공방/.test(text)) return "activity";
  if (/공원|산책|전망|야경|바다|해변/.test(text)) return "view";
  if (/호텔|펜션|숙소|스테이|리조트|게스트하우스/.test(text)) return "lodging";
  if (/식당|맛집|밥집|파스타|이탈리안|한식|일식|중식|양식|고기|저녁|점심|브런치/.test(text)) return "meal";
  return undefined;
}


/**
 * 지목한 이름에서 지역어를 떼어낸다 — "인천 까사올리브"의 지역은 이미 검색 지역으로 쓰이고,
 * 이름에 남겨두면 상호명 매칭만 어긋난다.
 */
export function stripRegionFromName(placeName: string, regions: string[]): string {
  let value = placeName.trim();
  for (const region of regions) {
    value = value.replace(new RegExp(`^${region}(?:광역시|특별시|시|도|군|구)?\\s+`), "").trim();
  }
  return value;
}

/**
 * 대화 도중의 한 마디에서 상호명 지목을 읽는다.
 *
 * 검색창과 달리 대화에서는 대부분의 말이 장소 요청이 아니다 — "렌터카", "일주일 뒤", "오션뷰"처럼
 * 질문에 대한 대답이 대부분이다. 그래서 여기서는 "찾아줘"·"가고 싶어" 같은 요청 표현이 실제로
 * 붙어 있을 때만 지목으로 인정한다. 근거 없이 상호명으로 우기면, 있지도 않은 가게를
 * 못 찾았다고 되묻는 더 나쁜 대화가 된다.
 */
export function namedPlaceInSentence(raw: string): string | undefined {
  const { hadRequestWrapping } = stripRequestWrapping(raw);
  if (!hadRequestWrapping) return undefined;
  const intent = classifyPlaceRequest(raw);
  return intent.kind === "specific" ? intent.placeName : undefined;
}
