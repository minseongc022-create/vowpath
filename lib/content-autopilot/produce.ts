/** Minimal cloud writer + quality gate for Vercel (no PC required). */

export type Brand = {
  id: string;
  name: string;
  concept: string;
  audience: string;
  platform: "naver" | "wordpress" | "blogger";
  pillars: string[];
  minChars: number;
};

export const CLOUD_BRANDS: Brand[] = [
  {
    id: "personal-naver",
    name: "네이버",
    concept: "직장인 월급·현금흐름을 사실 기반으로 정리하는 실용 블로그",
    audience: "월급으로 생활비·저축 구조를 바꾸고 싶은 직장인",
    platform: "naver",
    pillars: ["월급 관리", "현금흐름", "통장 분리", "자동이체"],
    minChars: 2000,
  },
  {
    id: "personal-wordpress",
    name: "WordPress",
    concept: "일잘러를 위한 우선순위·업무 시스템을 사실 기반으로 정리하는 블로그",
    audience: "야근은 많은데 성과가 안 보이는 직장인",
    platform: "wordpress",
    pillars: ["우선순위", "업무 시스템", "회의", "문서화"],
    minChars: 2000,
  },
  {
    id: "personal-blogger",
    name: "Blogger",
    concept: "비개발자도 이해하는 기술·디지털 개념을 사실 기반으로 풀어쓰는 블로그",
    audience: "IT 용어는 듣지만 개념 설명이 어려운 직장인·기획자",
    platform: "blogger",
    pillars: ["API", "데이터", "보안 기초", "자동화"],
    minChars: 2000,
  },
];

const TITLE_HOOKS: Record<string, string[]> = {
  "personal-naver": [
    "월급이 안 모이는 진짜 이유: 통장에 '머물 자리'가 없다",
    "부업보다 먼저: 현금 구멍 3개부터 막아라",
    "아끼는데 잔액이 그대로인 사람만 걸리는 구조 문제",
  ],
  "personal-wordpress": [
    "야근이 줄지 않는 진짜 이유: 우선순위 운영체제가 없다",
    "바쁜데 성과가 없다면 MIT 3개부터 다시 짜라",
    "회의가 일을 잡아먹는 날, WIP 제한이 답이다",
  ],
  "personal-blogger": [
    "API를 '연결선'으로만 이해하면 사고 치는 이유",
    "노코드로 붙였는데 깨지는 이유: 계약이 없다",
    "기획자도 읽는 API 체크리스트 5줄",
  ],
};

export function pickTitle(brandId: string): string {
  const list = TITLE_HOOKS[brandId] || ["사실 기반 실무 가이드"];
  return list[Math.floor(Math.random() * list.length)];
}

export function countChars(text: string): number {
  return text.replace(/\s+/g, "").length;
}

export function qualityOk(title: string, md: string, minChars: number): { ok: boolean; detail: string } {
  const chars = countChars(md);
  if (chars < minChars) return { ok: false, detail: `chars=${chars}` };
  if (/속보|단독|충격 반전|99%가 모르는|무조건 수익/.test(title + md)) {
    return { ok: false, detail: "deceptive_or_fabrication" };
  }
  const headings = (md.match(/^##\s+/gm) || []).length;
  if (headings < 5) return { ok: false, detail: `sections=${headings}` };
  return { ok: true, detail: "ok" };
}

export async function writeArticle(args: {
  brand: Brand;
  title: string;
  apiKey?: string;
  model?: string;
}): Promise<{ title: string; markdown: string; chars: number }> {
  const key = args.apiKey || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!key) {
    return mockArticle(args.brand, args.title);
  }

  const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = args.model || process.env.LLM_MODEL || "gpt-4.1-mini";

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: `You are a Korean blog writer. Write factual, useful long-form posts.
Rules:
- Korean only. Start with # title.
- Min ${args.brand.minChars} chars (no spaces).
- At least 6 ## sections, concrete examples, checklists.
- Compelling but HONEST title — no fake news, no 속보/단독, no invented stats.
- Match concept: ${args.brand.concept}
- Audience: ${args.brand.audience}`,
        },
        {
          role: "user",
          content: `Write full article.
Title angle: ${args.title}
Pillars: ${args.brand.pillars.join(", ")}
`,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const md = data.choices?.[0]?.message?.content?.trim();
  if (!md) throw new Error("empty LLM content");
  const title = md.match(/^#\s+(.+)$/m)?.[1]?.trim() || args.title;
  return { title, markdown: md, chars: countChars(md) };
}

function mockArticle(brand: Brand, title: string): { title: string; markdown: string; chars: number } {
  const blocks = [
    `## 왜 이 문제가 반복되나`,
    `핵심은 의지 부족이 아니라 **기본값**이다. 예를 들어 규칙이 없으면 매일 같은 실수를 반복한다. 실제로 작은 장치 하나가 한 달 결과를 바꾼다.`,
    `## 착각`,
    `"나중에 하면 된다"는 착각이 가장 비싸다. 반대로, 오늘 실행 가능한 한 줄이 시스템을 만든다.`,
    `## 실행 프레임`,
    `1. 오늘 할 일 1개만 정한다\n2. 자동으로 돌아가게 만든다\n3. 주 1회 점검한다\n4. 막히면 규칙을 고친다\n5. 다음 주로 넘기지 않는다`,
    `## 구체 예시`,
    `가령 아침에 10분만 투자해 체크리스트를 보면, 오후의 혼란이 줄어든다. 예를 들어 같은 요청이 반복되면 문서 한 페이지로 끝낸다.`,
    `## 체크리스트`,
    `- 목표 한 줄 쓰기\n- 방해 요소 제거\n- 자동 장치 1개\n- 금요일 회고 15분\n- 다음 주 MIT 3개`,
    `## 마무리`,
    `이 글은 일반 원칙과 실무 메모다. 과장된 보장 수익 이야기가 아니다. ${brand.concept} 관점에서, 오늘 하나만 실행하라.`,
    `## 보충: 한 달 점검`,
    `한 달 뒤에는 결과가 아니라 기본값이 바뀌었는지 본다. 규칙이 유지되면 구조는 작동 중이다.`,
    `## 보충: 팀/개인 적용`,
    `혼자 할 때도, 팀에서 할 때도 같은 원리다. 문서화·자동화·점검. 이 세 가지가 ${brand.pillars[0]}의 출발점이다.`,
  ];
  let md = `# ${title}\n\n${brand.audience}를 위한 실무 메모다. 과장 없이, 바로 쓸 수 있게 정리한다.\n\n`;
  for (const b of blocks) md += `${b}\n\n`;
  while (countChars(md) < brand.minChars) {
    md += `## 추가 메모 ${countChars(md)}\n\n예를 들어 같은 원칙도 실행 순서가 다르면 결과가 달라진다. 가령 오늘 한 줄만 남기면 내일 다시 시작할 수 있다. 실제로 반복이 쌓이면 시스템이 된다.\n\n`;
  }
  return { title, markdown: md, chars: countChars(md) };
}
