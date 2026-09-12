/**
 * 한국어 조사 붙이기.
 *
 * ★ "이(가)"를 화면에 그대로 내보내지 않기 위해서다
 *
 * 문장을 조립하다 보면 `${역할}이(가) ${기능}이(가) 안 됩니다` 같은 것이
 * 나온다. 실기동 검증에서 실제로 이 문장이 나왔다. 한국어 제품에서 조사가
 * 괄호로 도망가 있으면, 공들여 쓴 나머지 문장까지 기계가 뱉은 것처럼 읽힌다.
 *
 * 규칙은 하나다: 앞 글자에 받침이 있으면 "이/은/을/과", 없으면 "가/는/를/와".
 * 한글 음절은 0xAC00부터 28개씩 묶여 있고, 그 안에서의 위치가 종성이다.
 *
 * 한글이 아닌 글자로 끝나면(영문·숫자·기호) 판단할 수 없으므로 괄호 형태로
 * 안전하게 물러난다 — 틀린 조사를 붙이는 것보다 낫다.
 */

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

/** 마지막 글자에 받침이 있는가. 한글이 아니면 null(모름). */
export function hasFinalConsonant(word: string): boolean | null {
  const trimmed = word.replace(/["'”’\)\]】」』\s]+$/u, "");
  const last = trimmed.at(-1);
  if (!last) return null;

  const code = last.codePointAt(0)!;
  if (code < HANGUL_START || code > HANGUL_END) return null;
  return (code - HANGUL_START) % JONGSEONG_COUNT !== 0;
}

type ParticlePair = ["이", "가"] | ["은", "는"] | ["을", "를"] | ["과", "와"] | ["으로", "로"];

const PAIRS: Record<string, ParticlePair> = {
  "이/가": ["이", "가"],
  "은/는": ["은", "는"],
  "을/를": ["을", "를"],
  "과/와": ["과", "와"],
  "으로/로": ["으로", "로"],
};

/**
 * 단어에 맞는 조사를 고른다.
 *
 * ★ 붙인 결과가 아니라 조사만 돌려준다
 *
 * 따옴표로 감싼 기능 이름(`"예약 결제"`)처럼 단어 뒤에 기호가 오는 문장이
 * 많아서, 문장을 만드는 쪽이 위치를 정하게 두는 편이 낫다.
 */
export function particle(word: string, kind: keyof typeof PAIRS): string {
  const pair = PAIRS[kind];
  const final = hasFinalConsonant(word);
  // 모르면 둘 다 보여준다. "예약 결제이(가)"가 "예약 결제가"보다 낫진 않지만,
  // 영문 이름에 아무 조사나 붙여 틀리는 것보다는 정직하다.
  if (final === null) return `${pair[0]}(${pair[1]})`;
  return final ? pair[0] : pair[1];
}

/** 단어 + 조사. 가장 흔한 쓰임을 한 번에. */
export function withParticle(word: string, kind: keyof typeof PAIRS): string {
  return `${word}${particle(word, kind)}`;
}
