import { TOPIK_CURRICULUM } from "@/topik/lib/curriculum/lessons";
import { isKoLocale } from "@/topik/lib/i18n/locale-text";

export type DictEntry = {
  korean: string;
  vietnamese: string;
  /** Korean gloss for dev UI / KO locale */
  meaningKo?: string;
  romanization?: string;
  example?: string;
  exampleVi?: string;
  level?: number;
};

const DICT = new Map<string, DictEntry>();

/** Core TOPIK vocabulary — app-native content for self-sufficient study */
const CORE_VOCAB: DictEntry[] = [
  { korean: "물", vietnamese: "Nước", meaningKo: "물, 액체", romanization: "mul", level: 1 },
  { korean: "학교", vietnamese: "Trường học", meaningKo: "학교", romanization: "hakgyo", level: 1 },
  { korean: "학생", vietnamese: "Học sinh", meaningKo: "학생", romanization: "haksaeng", level: 1 },
  { korean: "선생님", vietnamese: "Giáo viên", meaningKo: "선생님", romanization: "seonsaengnim", level: 1 },
  { korean: "친구", vietnamese: "Bạn bè", meaningKo: "친구", romanization: "chingu", level: 1 },
  { korean: "집", vietnamese: "Nhà", meaningKo: "집", romanization: "jip", level: 1 },
  { korean: "음식", vietnamese: "Thức ăn", meaningKo: "음식", romanization: "eumsik", level: 1 },
  { korean: "공부", vietnamese: "Học tập", meaningKo: "공부, 학습", romanization: "gongbu", level: 1 },
  { korean: "시험", vietnamese: "Kỳ thi", meaningKo: "시험", romanization: "siheom", level: 2 },
  { korean: "합격", vietnamese: "Đậu (kỳ thi)", meaningKo: "합격", romanization: "hapgyeok", level: 2 },
  { korean: "베트남", vietnamese: "Việt Nam", romanization: "beteunam", level: 1 },
  { korean: "한국", vietnamese: "Hàn Quốc", romanization: "hanguk", level: 1 },
  { korean: "한국어", vietnamese: "Tiếng Hàn", romanization: "hangugeo", level: 1 },
  { korean: "오늘", vietnamese: "Hôm nay", romanization: "oneul", level: 1 },
  { korean: "어제", vietnamese: "Hôm qua", romanization: "eoje", level: 2 },
  { korean: "내일", vietnamese: "Ngày mai", romanization: "naeil", level: 2 },
  { korean: "읽다", vietnamese: "Đọc", romanization: "ikda", level: 2 },
  { korean: "쓰다", vietnamese: "Viết", romanization: "sseuda", level: 2 },
  { korean: "듣다", vietnamese: "Nghe", romanization: "deutda", level: 2 },
  { korean: "말하다", vietnamese: "Nói", romanization: "malhada", level: 2 },
  { korean: "비", vietnamese: "Mưa", romanization: "bi", level: 2 },
  { korean: "날씨", vietnamese: "Thời tiết", romanization: "nalssi", level: 2 },
  { korean: "환경", vietnamese: "Môi trường", romanization: "hwangyeong", level: 3 },
  { korean: "중요하다", vietnamese: "Quan trọng", romanization: "jungyohada", level: 3 },
  { korean: "따라서", vietnamese: "Do đó, vì vậy", romanization: "ttaraseo", level: 3 },
  { korean: "그러나", vietnamese: "Tuy nhiên", romanization: "geureona", level: 3 },
  { korean: "덕분에", vietnamese: "Nhờ có", romanization: "deokbune", level: 4 },
  { korean: "반면에", vietnamese: "Trong khi, ngược lại", romanization: "banmyeone", level: 4 },
  { korean: "견해", vietnamese: "Quan điểm", romanization: "gyeonhae", level: 5 },
  { korean: "근거", vietnamese: "Căn cứ, lý do", romanization: "geungeo", level: 5 },
  { korean: "종합", vietnamese: "Tổng hợp", romanization: "jonghap", level: 6 },
  { korean: "커피", vietnamese: "Cà phê", romanization: "keopi", level: 1 },
  { korean: "카페", vietnamese: "Quán cà phê", romanization: "kape", level: 1 },
  { korean: "도서관", vietnamese: "Thư viện", romanization: "doseogwan", level: 2 },
  { korean: "병원", vietnamese: "Bệnh viện", romanization: "byeongwon", level: 2 },
  { korean: "여행", vietnamese: "Du lịch", romanization: "yeohaeng", level: 2 },
  { korean: "준비", vietnamese: "Chuẩn bị", romanization: "junbi", level: 3 },
  { korean: "열심히", vietnamese: "Chăm chỉ", romanization: "yeolsimhi", level: 3 },
  { korean: "매일", vietnamese: "Mỗi ngày", romanization: "maeil", level: 2 },
  { korean: "듣기", vietnamese: "Phần nghe", romanization: "deutgi", level: 2 },
  { korean: "읽기", vietnamese: "Phần đọc", romanization: "ilkgi", level: 2 },
  { korean: "쓰기", vietnamese: "Phần viết", romanization: "sseutgi", level: 3 },
  { korean: "말하기", vietnamese: "Phần nói", romanization: "malhagi", level: 3 },
  { korean: "지하철", vietnamese: "Tàu điện ngầm", romanization: "jihacheol", level: 2 },
  { korean: "역", vietnamese: "Ga (tàu)", romanization: "yeok", level: 2 },
  { korean: "시청", vietnamese: "Tòa thị chính", romanization: "sicheong", level: 3 },
  { korean: "발표", vietnamese: "Thuyết trình", romanization: "balpyo", level: 4 },
  { korean: "노력", vietnamese: "Nỗ lực", romanization: "noryeok", level: 3 },
  { korean: "실패", vietnamese: "Thất bại", romanization: "silpae", level: 4 },
  { korean: "성공", vietnamese: "Thành công", romanization: "seonggong", level: 3 },
  { korean: "목표", vietnamese: "Mục tiêu", romanization: "mokpyo", level: 3 },
  { korean: "이유", vietnamese: "Lý do", romanization: "iyu", level: 3 },
  { korean: "문화", vietnamese: "Văn hóa", romanization: "munhwa", level: 4 },
  { korean: "경험", vietnamese: "Kinh nghiệm", romanization: "gyeongheom", level: 4 },
  { korean: "가족", vietnamese: "Gia đình", romanization: "gajok", level: 2 },
  { korean: "회사", vietnamese: "Công ty", romanization: "hoesa", level: 2 },
  { korean: "일", vietnamese: "Công việc", romanization: "il", level: 2 },
  { korean: "시간", vietnamese: "Thời gian", romanization: "sigan", level: 2 },
  { korean: "돈", vietnamese: "Tiền", romanization: "don", level: 2 },
  { korean: "사람", vietnamese: "Người", romanization: "saram", level: 1 },
  { korean: "나라", vietnamese: "Đất nước", romanization: "nara", level: 1 },
  { korean: "이름", vietnamese: "Tên", romanization: "ireum", level: 1 },
  { korean: "안녕하세요", vietnamese: "Xin chào (lịch sự)", romanization: "annyeonghaseyo", level: 1 },
  { korean: "감사합니다", vietnamese: "Cảm ơn", romanization: "gamsahamnida", level: 1 },
  { korean: "죄송합니다", vietnamese: "Xin lỗi", romanization: "joesonghamnida", level: 1 },
  { korean: "괜찮아요", vietnamese: "Không sao", romanization: "gwaenchanayo", level: 1 },
  { korean: "만나서 반갑습니다", vietnamese: "Rất vui được gặp bạn", romanization: "mannaseo bangapseumnida", level: 1 },
  { korean: "사과", vietnamese: "Quả táo", romanization: "sagwa", level: 1 },
  { korean: "책", vietnamese: "Sách", romanization: "chaek", level: 1 },
  { korean: "밥", vietnamese: "Cơm", romanization: "bap", level: 1 },
  { korean: "빵", vietnamese: "Bánh mì", romanization: "ppang", level: 1 },
  { korean: "과일", vietnamese: "Trái cây", romanization: "gwail", level: 1 },
  { korean: "국", vietnamese: "Canh", romanization: "guk", level: 1 },
  { korean: "점심", vietnamese: "Bữa trưa", romanization: "jeomsim", level: 2 },
  { korean: "먹다", vietnamese: "Ăn", romanization: "meokda", level: 1 },
  { korean: "배우다", vietnamese: "Học", romanization: "baeuda", level: 2 },
  { korean: "회사원", vietnamese: "Nhân viên công ty", romanization: "hoesawon", level: 2 },
  { korean: "의사", vietnamese: "Bác sĩ", romanization: "uisa", level: 2 },
  { korean: "서울", vietnamese: "Seoul", romanization: "seoul", level: 2 },
  { korean: "택시", vietnamese: "Taxi", romanization: "taeksi", level: 3 },
  { korean: "공장", vietnamese: "Nhà máy", romanization: "gongjang", level: 2 },
  { korean: "안전", vietnamese: "An toàn", romanization: "anjeon", level: 2 },
  { korean: "스마트폰", vietnamese: "Điện thoại thông minh", romanization: "seumateupon", level: 4 },
  { korean: "건강", vietnamese: "Sức khỏe", romanization: "geongang", level: 3 },
  { korean: "전문가", vietnamese: "Chuyên gia", romanization: "jeonmung", level: 4 },
  { korean: "글로벌화", vietnamese: "Toàn cầu hóa", romanization: "geullobeolhwa", level: 5 },
  { korean: "갈등", vietnamese: "Xung đột", romanization: "galdeung", level: 5 },
  { korean: "타당성", vietnamese: "Tính hợp lý", romanization: "tadangseong", level: 5 },
  { korean: "토요일", vietnamese: "Thứ Bảy", romanization: "toyoil", level: 2 },
  { korean: "같이", vietnamese: "Cùng nhau", romanization: "gati", level: 2 },
  { korean: "여자", vietnamese: "Phụ nữ", romanization: "yeoja", level: 1 },
  { korean: "남자", vietnamese: "Đàn ông", romanization: "namja", level: 1 },
  { korean: "직업", vietnamese: "Nghề nghiệp", romanization: "jigeop", level: 3 },
];

function register(entry: DictEntry): void {
  const key = entry.korean.trim();
  if (!key || DICT.has(key)) return;
  DICT.set(key, entry);
}

for (const e of CORE_VOCAB) register(e);

for (const lesson of TOPIK_CURRICULUM) {
  for (const v of lesson.vocabulary) {
    register({
      korean: v.korean.split("/")[0]!.trim(),
      vietnamese: v.vietnamese,
      romanization: v.romanization,
      example: v.example,
      exampleVi: v.exampleVi,
      level: lesson.level,
    });
  }
}

export function lookupWord(raw: string): DictEntry | null {
  const cleaned = raw.replace(/[「」"'.,?!…:;()\-—\[\]0-9]/g, "").trim();
  if (!cleaned || !/[\uAC00-\uD7A3]/.test(cleaned)) return null;

  if (DICT.has(cleaned)) return DICT.get(cleaned)!;

  // Try without common particles (basic suffix strip)
  const stems = [cleaned, cleaned.replace(/(은|는|이|가|을|를|에|에서|와|과|도|로|으로|요|습니다|ㅂ니다|니다)$/u, "")];
  for (const s of stems) {
    if (s.length >= 2 && DICT.has(s)) return DICT.get(s)!;
  }

  return null;
}

export function getAllDictionaryEntries(): DictEntry[] {
  return Array.from(DICT.values()).sort((a, b) => a.korean.localeCompare(b.korean, "ko"));
}

export function getDictionarySize(): number {
  return DICT.size;
}

/** Word meaning in learner's locale language (primary) */
export function getDisplayMeaning(entry: DictEntry | null, noDefinition: string): string {
  if (!entry) return noDefinition;
  if (isKoLocale()) {
    if (entry.meaningKo) return entry.meaningKo;
    return entry.vietnamese;
  }
  return entry.vietnamese;
}

/** Romanization — secondary hint only */
export function getDisplayRomanization(entry: DictEntry | null): string | undefined {
  return entry?.romanization;
}

/** Example sentence translation in learner locale */
export function getDisplayExample(entry: DictEntry | null): string | undefined {
  if (!entry) return undefined;
  if (isKoLocale()) return entry.example;
  return entry.exampleVi ?? entry.example;
}

/** Split Korean text into tappable tokens (space-separated + bracket words) */
export function tokenizeKoreanText(text: string): { text: string; isKorean: boolean }[] {
  const parts: { text: string; isKorean: boolean }[] = [];
  const regex = /[\uAC00-\uD7A3]+|[「」]|[\uAC00-\uD7A3「」]+|\s+|[^\s\uAC00-\uD7A3]+/gu;
  let m: RegExpExecArray | null;
  const re = new RegExp(regex.source, "gu");
  while ((m = re.exec(text)) !== null) {
    const t = m[0];
    const isKo = /[\uAC00-\uD7A3]/.test(t);
    parts.push({ text: t, isKorean: isKo });
  }
  return parts.length > 0 ? parts : [{ text, isKorean: /[\uAC00-\uD7A3]/.test(text) }];
}
