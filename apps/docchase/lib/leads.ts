export type OutreachLead = {
  name: string;
  region: string;
  website: string;
  email: string;
  channel: string;
  notes: string;
};

/** Public contacts only — mirrored from docs/outreach-leads.csv */
export const OUTREACH_LEADS: OutreachLead[] = [
  { name: "가언세무회계", region: "서울 중구", website: "https://eontax.kr/", email: "mail@eontax.kr", channel: "email|webform", notes: "대표세무사 1인형" },
  { name: "가인세무회계", region: "서울 성동구", website: "https://taxinside.co.kr/", email: "gaintax@taxinside.co.kr", channel: "email|webform", notes: "기장대리 중심" },
  { name: "배정훈 세무사 사무소", region: "경기 고양", website: "https://jhtax.co.kr/", email: "baejh1212@gmail.com", channel: "email", notes: "개인 사무소" },
  { name: "기세세무회계", region: "서울 송파", website: "https://forcetax.co.kr/", email: "forcetax00@gmail.com", channel: "email", notes: "1인 세무기장" },
  { name: "대해회계사무소", region: "서울 강남", website: "https://www.taxcpa.co.kr/", email: "daehaeacc@daehaeacc.com", channel: "email|webform", notes: "소규모 회계" },
  { name: "세무회계 겸산", region: "서울 강서", website: "http://gstax.kr/", email: "tax_hoon@naver.com", channel: "email|webform", notes: "로컬 기장" },
  { name: "위드세무회계", region: "세종", website: "https://withsemu.com/", email: "withsemu@withsemu.net", channel: "email|kakao", notes: "기장팀" },
  { name: "세무법인대교", region: "서울 영등포", website: "https://tax6949.oopy.io/", email: "tax6949@naver.com", channel: "email", notes: "기장 상담" },
  { name: "삼인세무회계", region: "서울 영등포", website: "https://sitna.kr/", email: "cptaljm@naver.com", channel: "email", notes: "소형 그룹" },
  { name: "세무사무소 다빈", region: "경기 안양", website: "http://dabintax.co.kr/Contact", email: "", channel: "webform", notes: "웹폼만" },
  { name: "오아시스 세무회계", region: "서울 강남", website: "https://oasistax.co.kr/contact-location/", email: "oasistax@oasistax.co.kr", channel: "email|webform", notes: "기장 상담폼" },
  { name: "광화문 세무회계", region: "서울 종로", website: "https://ghmtax.com/", email: "jhlee@ghmtax.com", channel: "email|webform", notes: "1인 대표" },
  { name: "온택스 이주영", region: "경남 양산", website: "https://on-tax.kr/", email: "ontaxservice@gmail.com", channel: "email", notes: "지방 기장" },
  { name: "세무법인 영진", region: "서울 강남", website: "https://youngjintax.com/contact/", email: "", channel: "webform", notes: "웹폼만" },
  { name: "지성세무회계", region: "세종", website: "https://jsstar.co.kr/", email: "js@jsstar.co.kr", channel: "email|webform", notes: "지역 독립" },
  { name: "신성세무회계", region: "서울 강서", website: "https://kangtax.co.kr/", email: "sinsungtax50@daum.net", channel: "email|webform", notes: "소상공인 기장" },
  { name: "평택세무회계", region: "경기 평택", website: "http://www.pttax.co.kr/", email: "pttax1004@naver.com", channel: "email", notes: "로컬 1인" },
  { name: "SJ TAX", region: "전북 군산", website: "http://www.ksjtax.co.kr/CONTACT", email: "tax1282@naver.com", channel: "email|webform|kakao", notes: "지역 기장" },
  { name: "더감세무회계", region: "경기 성남", website: "https://thegamtax.tistory.com/", email: "thegamtax@daum.net", channel: "email", notes: "단독 세무사" },
  { name: "세무회계 환희", region: "서울 영등포", website: "https://taxdelight.co.kr/", email: "admin@taxdelight.co.kr", channel: "email|webform", notes: "소형·대표 직접" },
  { name: "서찬영 세무회계", region: "서울 용산", website: "https://www.semusa.org/taxxy/", email: "tax@semusa.org", channel: "email", notes: "1인 사무소" },
  { name: "세무법인시완", region: "서울 강남", website: "https://www.seewantax.com/location/index.jsp", email: "seewantax@daum.net", channel: "email|kakao", notes: "단일 오피스" },
  { name: "시냇가에심은나무", region: "대전 서구", website: "https://riversidetax.co.kr/", email: "scholarsay@naver.com", channel: "email|webform|kakao", notes: "대표세무사형" },
  { name: "세무회계 세아", region: "서울 강남", website: "https://www.seah.io/about", email: "contact@seah.io", channel: "email", notes: "소형팀" },
  { name: "조우 세무회계", region: "서울 서초", website: "https://jowootax.com/18", email: "tax3522@naver.com", channel: "email|webform|kakao", notes: "독립 기장" },
  { name: "김선일세무회계", region: "경기 고양", website: "https://sun1tax.com/", email: "bonobono0108@naver.com", channel: "email|webform", notes: "1:1 파트너" },
  { name: "이산세무법인", region: "경기 성남", website: "http://isantax.co.kr/1_5.php", email: "pck@isantax.com", channel: "email|webform", notes: "단일 오피스" },
  { name: "세무회계더함", region: "부산 해운대", website: "https://www.semutong.com/", email: "cta_theham@naver.com", channel: "email", notes: "소형 대표" },
  { name: "다원세무회계", region: "경기 수원", website: "https://enjoytax.net/", email: "", channel: "webform", notes: "웹폼·카톡" },
  { name: "메이플세무회계", region: "경기 부천", website: "https://buchon.etranstax.co.kr/", email: "", channel: "webform", notes: "로컬 기장" },
];

export function mailtoDraft(lead: OutreachLead) {
  const subject = encodeURIComponent("수임처 자료 요청, 전화·카톡 대신 알림톡으로 — 수임체크 소개");
  const body = encodeURIComponent(
    `안녕하세요, ${lead.name} 담당자님.\n\n수임체크입니다. 소형 세무·기장 사무소의 수임처 자료 요청(독촉)을 정보성 알림톡과 현황판으로 자동화하는 도구입니다.\n\n· CSV 등록 → 마감일 기준 1·2차 요청\n· 미제출만 재발송\n· 전표·신고 대행 아님\n\n데모: 가입 후 현황판 바로 체험 가능\n요금: 월 7.9만원부터\n\n관심 있으시면 회신만 주셔도 됩니다. 원치 않으시면 '관심 없음'이라고만 남겨 주세요.\n\n수임체크 드림`,
  );
  return lead.email ? `mailto:${lead.email}?subject=${subject}&body=${body}` : lead.website;
}
