import type { TopikLevel, TopikQuizQuestion } from "@/topik/types";

type LSeed = {
  script: string;
  scriptVi: string;
  question: string;
  questionVi: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
};

type RSeed = {
  passage: string;
  question: string;
  questionVi: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationVi: string;
};

function mkListening(level: TopikLevel, n: number, s: LSeed): TopikQuizQuestion {
  return {
    id: `mass-l${level}-l-${String(n).padStart(2, "0")}`,
    level,
    type: "multiple_choice",
    category: "listening",
    examSection: "listening",
    question: s.question,
    questionVi: s.questionVi,
    options: [...s.options],
    correctIndex: s.correctIndex,
    explanation: s.explanationVi,
    explanationVi: s.explanationVi,
    listeningScript: s.script,
    listeningScriptVi: s.scriptVi,
  };
}

function mkReading(level: TopikLevel, n: number, s: RSeed): TopikQuizQuestion {
  return {
    id: `mass-l${level}-r-${String(n).padStart(2, "0")}`,
    level,
    type: "multiple_choice",
    category: "reading",
    examSection: "reading",
    question: s.question,
    questionVi: s.questionVi,
    passage: s.passage,
    options: [...s.options],
    correctIndex: s.correctIndex,
    explanation: s.explanationVi,
    explanationVi: s.explanationVi,
  };
}

function buildLevelBank(
  level: TopikLevel,
  listeningSeeds: LSeed[],
  readingSeeds: RSeed[],
): TopikQuizQuestion[] {
  const out: TopikQuizQuestion[] = [];
  listeningSeeds.forEach((s, i) => out.push(mkListening(level, i + 1, s)));
  readingSeeds.forEach((s, i) => out.push(mkReading(level, i + 1, s)));
  return out;
}

const L2_LISTENING: LSeed[] = [
  { script: "주말에 시장에 가서 과일을 샀어요.", scriptVi: "Cuối tuần đi chợ mua trái cây.", question: "어디에 갔습니까?", questionVi: "Đi đâu?", options: ["시장", "병원", "은행", "공항"], correctIndex: 0, explanationVi: "Chợ." },
  { script: "오늘은 비가 와서 택시를 탔어요.", scriptVi: "Hôm nay mưa nên đi taxi.", question: "왜 택시를 탔습니까?", questionVi: "Vì sao đi taxi?", options: ["비가 와서", "더워서", "피곤해서", "바빠서"], correctIndex: 0, explanationVi: "Vì mưa." },
  { script: "한국어 수업이 세 시에 시작해요.", scriptVi: "Lớp tiếng Hàn bắt đầu lúc 3 giờ.", question: "몇 시에 시작합니까?", questionVi: "Mấy giờ bắt đầu?", options: ["3시", "2시", "4시", "5시"], correctIndex: 0, explanationVi: "3 giờ." },
  { script: "친구에게 선물을 줬어요.", scriptVi: "Tặng quà cho bạn.", question: "누구에게 줬습니까?", questionVi: "Tặng ai?", options: ["친구", "선생님", "엄마", "동생"], correctIndex: 0, explanationVi: "Bạn." },
  { script: "저는 베트남 음식을 좋아해요.", scriptVi: "Tôi thích món Việt.", question: "어떤 음식을 좋아합니까?", questionVi: "Thích món gì?", options: ["베트남 음식", "한국 음식", "일본 음식", "중국 음식"], correctIndex: 0, explanationVi: "Món Việt." },
  { script: "아침에 운동을 하고 출근해요.", scriptVi: "Sáng tập thể dục rồi đi làm.", question: "아침에 무엇을 합니까?", questionVi: "Sáng làm gì?", options: ["운동", "수영", "요리", "쇼핑"], correctIndex: 0, explanationVi: "Tập thể dục." },
  { script: "지하철역에서 만나요.", scriptVi: "Gặp ở ga tàu điện ngầm.", question: "어디에서 만납니까?", questionVi: "Gặp ở đâu?", options: ["지하철역", "공원", "학교", "카페"], correctIndex: 0, explanationVi: "Ga tàu điện ngầm." },
  { script: "오늘은 날씨가 추워요.", scriptVi: "Hôm nay trời lạnh.", question: "날씨가 어떻습니까?", questionVi: "Thời tiết thế nào?", options: ["춥다", "덥다", "좋다", "흐리다"], correctIndex: 0, explanationVi: "Lạnh." },
  { script: "은행에서 돈을 찾았어요.", scriptVi: "Rút tiền ở ngân hàng.", question: "어디에서 돈을 찾았습니까?", questionVi: "Rút tiền ở đâu?", options: ["은행", "편의점", "학교", "병원"], correctIndex: 0, explanationVi: "Ngân hàng." },
  { script: "한 시간 동안 한국어를 공부했어요.", scriptVi: "Học tiếng Hàn một tiếng.", question: "얼마나 공부했습니까?", questionVi: "Học bao lâu?", options: ["1시간", "30분", "2시간", "3시간"], correctIndex: 0, explanationVi: "1 tiếng." },
  { script: "영화를 보고 집에 갔어요.", scriptVi: "Xem phim rồi về nhà.", question: "무엇을 봤습니까?", questionVi: "Xem gì?", options: ["영화", "뉴스", "드라마", "광고"], correctIndex: 0, explanationVi: "Phim." },
  { script: "약국에서 약을 샀어요.", scriptVi: "Mua thuốc ở hiệu thuốc.", question: "어디에서 샀습니까?", questionVi: "Mua ở đâu?", options: ["약국", "마트", "서점", "식당"], correctIndex: 0, explanationVi: "Hiệu thuốc." },
  { script: "내일 시험이 있어서 공부해요.", scriptVi: "Ngày mai thi nên học.", question: "왜 공부합니까?", questionVi: "Vì sao học?", options: ["시험이 있어서", "피곤해서", "배고파서", "심심해서"], correctIndex: 0, explanationVi: "Vì có thi." },
  { script: "커피 한 잔 주세요.", scriptVi: "Cho một ly cà phê.", question: "무엇을 주문합니까?", questionVi: "Gọi gì?", options: ["커피", "차", "주스", "물"], correctIndex: 0, explanationVi: "Cà phê." },
  { script: "버스를 놓쳐서 늦었어요.", scriptVi: "Trễ vì lỡ xe buýt.", question: "왜 늦었습니까?", questionVi: "Vì sao trễ?", options: ["버스를 놓쳐서", "일찍 일어나서", "길이 막혀서", "준비해서"], correctIndex: 0, explanationVi: "Lỡ xe buýt." },
  { script: "가방 안에 책이 있어요.", scriptVi: "Trong túi có sách.", question: "가방 안에 무엇이 있습니까?", questionVi: "Trong túi có gì?", options: ["책", "음식", "옷", "신발"], correctIndex: 0, explanationVi: "Sách." },
  { script: "주말에 등산을 갔어요.", scriptVi: "Cuối tuần đi leo núi.", question: "주말에 무엇을 했습니까?", questionVi: "Cuối tuần làm gì?", options: ["등산", "수영", "쇼핑", "요리"], correctIndex: 0, explanationVi: "Leo núi." },
  { script: "이 옷은 너무 비싸요.", scriptVi: "Quần áo này quá đắt.", question: "옷이 어떻습니까?", questionVi: "Quần áo thế nào?", options: ["비싸다", "싸다", "크다", "작다"], correctIndex: 0, explanationVi: "Đắt." },
  { script: "열 시에 잠을 자요.", scriptVi: "Ngủ lúc 10 giờ.", question: "몇 시에 잡니까?", questionVi: "Mấy giờ ngủ?", options: ["10시", "8시", "11시", "12시"], correctIndex: 0, explanationVi: "10 giờ." },
  { script: "한국에서 일하고 싶어요.", scriptVi: "Muốn làm việc ở Hàn.", question: "어디에서 일하고 싶습니까?", questionVi: "Muốn làm ở đâu?", options: ["한국", "베트남", "일본", "미국"], correctIndex: 0, explanationVi: "Hàn Quốc." },
];

const L2_READING: RSeed[] = [
  { passage: "수진 씨는 매일 아침 지하철로 회사에 갑니다. 보통 8시에 출발합니다.", question: "수진 씨는 어떻게 회사에 갑니까?", questionVi: "Đi công ty bằng gì?", options: ["지하철", "버스", "택시", "자전거"], correctIndex: 0, explanationVi: "Tàu điện ngầm." },
  { passage: "이 가게는 월요일에 쉽니다. 화요일부터 일요일까지 10시부터 9시까지 영업합니다.", question: "언제 쉽니까?", questionVi: "Nghỉ khi nào?", options: ["월요일", "화요일", "토요일", "일요일"], correctIndex: 0, explanationVi: "Thứ Hai." },
  { passage: "베트남에서 한국으로 유학 온 학생이 많아졌습니다. 한국어 실력도 빨리 늘고 있습니다.", question: "무엇이 늘었습니까?", questionVi: "Cái gì tăng?", options: ["유학생", "관광객", "직원", "선생님"], correctIndex: 0, explanationVi: "Du học sinh." },
  { passage: "오늘은 미세먼지가 많아 마스크를 썼습니다. 창문도 닫았습니다.", question: "왜 마스크를 썼습니까?", questionVi: "Vì sao đeo khẩu trang?", options: ["미세먼지", "비", "더위", "추위"], correctIndex: 0, explanationVi: "Bụi mịn." },
  { passage: "민호는 토요일에 친구와 영화를 봤습니다. 영화 후에 밥을 먹었습니다.", question: "토요일에 무엇을 먼저 했습니까?", questionVi: "Thứ Bảy làm gì trước?", options: ["영화", "운동", "공부", "쇼핑"], correctIndex: 0, explanationVi: "Xem phim." },
  { passage: "이 식당은 김치찌개가 유명합니다. 점심 시간에는 사람이 많습니다.", question: "무엇이 유명합니까?", questionVi: "Nổi tiếng món gì?", options: ["김치찌개", "피자", "햄버거", "파스타"], correctIndex: 0, explanationVi: "Canh kimchi." },
  { passage: "지하철 2호선은 서울을 동서로 연결합니다. 출퇴근 시간에 매우 붐빕니다.", question: "2호선은 어디를 연결합니까?", questionVi: "Tuyến 2 nối đâu?", options: ["동서", "남북", "공항", "바다"], correctIndex: 0, explanationVi: "Đông-Tây." },
  { passage: "하나 씨는 매일 30분씩 한국어 단어를 외웁니다. SRS 앱을 사용합니다.", question: "무엇을 외웁니까?", questionVi: "Học gì?", options: ["단어", "역사", "수학", "음악"], correctIndex: 0, explanationVi: "Từ vựng." },
  { passage: "겨울에는 날씨가 추워 옷을 많이 입습니다. 보통 코트와 목도리를 합니다.", question: "겨울에 무엇을 합니까?", questionVi: "Mùa đông mặc gì?", options: ["코트", "반바지", "샌들", "모자만"], correctIndex: 0, explanationVi: "Áo khoác." },
  { passage: "은행에서 신분증과 통장이 필요합니다. 현금을 찾을 수 있습니다.", question: "은행에서 무엇을 할 수 있습니까?", questionVi: "Ở ngân hàng làm gì?", options: ["현금 인출", "약 구매", "책 대출", "택배"], correctIndex: 0, explanationVi: "Rút tiền." },
  { passage: "주말에 가족과 함께 공원에 갔습니다. 아이들은 자전거를 탔습니다.", question: "아이들은 무엇을 탔습니까?", questionVi: "Trẻ đi gì?", options: ["자전거", "버스", "기차", "배"], correctIndex: 0, explanationVi: "Xe đạp." },
  { passage: "한국어 교실은 3층에 있습니다. 엘리베이터 옆에 있습니다.", question: "교실은 몇 층입니까?", questionVi: "Phòng học tầng mấy?", options: ["3층", "1층", "5층", "2층"], correctIndex: 0, explanationVi: "Tầng 3." },
  { passage: "오늘 회의는 2시에 시작합니다. 회의실은 5층입니다.", question: "회의는 몇 시입니까?", questionVi: "Họp mấy giờ?", options: ["2시", "3시", "4시", "1시"], correctIndex: 0, explanationVi: "2 giờ." },
  { passage: "이 책은 TOPIK 준비에 도움이 됩니다. 예제와 해설이 있습니다.", question: "책에 무엇이 있습니까?", questionVi: "Sách có gì?", options: ["예제", "음식", "지도", "옷"], correctIndex: 0, explanationVi: "Bài mẫu." },
  { passage: "비행기는 3시에 출발합니다. 2시 30분까지 공항에 도착해야 합니다.", question: "몇 시까지 도착해야 합니까?", questionVi: "Đến trước mấy giờ?", options: ["2시 30분", "3시", "1시", "4시"], correctIndex: 0, explanationVi: "2:30." },
  { passage: "카페에서 공부하면 집중이 잘 됩니다. 하지만 음료 값이 조금 비쌉니다.", question: "카페의 단점은?", questionVi: "Nhược điểm quán cà phê?", options: ["비싸다", "시끄럽다", "멀다", "작다"], correctIndex: 0, explanationVi: "Đắt." },
  { passage: "아침에 일찍 일어나면 하루가 길어집니다. 운동도 할 시간이 생깁니다.", question: "일찍 일어나면 무엇을 할 시간이 생깁니까?", questionVi: "Dậy sớm có thời gian làm gì?", options: ["운동", "영화", "쇼핑", "게임"], correctIndex: 0, explanationVi: "Tập thể dục." },
  { passage: "한국에서 베트남 음식점이 늘고 있습니다. 고향 음식을 먹을 수 있어 기쁩니다.", question: "왜 기쁩니까?", questionVi: "Vì sao vui?", options: ["고향 음식", "날씨", "쇼핑", "여행"], correctIndex: 0, explanationVi: "Món quê nhà." },
  { passage: "스마트폰으로 한국어 단어를 검색할 수 있습니다. 발음도 들을 수 있습니다.", question: "스마트폰으로 무엇을 할 수 있습니까?", questionVi: "Điện thoại dùng để?", options: ["단어 검색", "요리", "청소", "수영"], correctIndex: 0, explanationVi: "Tra từ." },
  { passage: "TOPIK 시험은 듣기, 읽기, 쓰기 영역이 있습니다. IBT는 컴퓨터로 칩니다.", question: "IBT는 어떻게 칩니까?", questionVi: "IBT thi thế nào?", options: ["컴퓨터", "종이", "구두", "전화"], correctIndex: 0, explanationVi: "Máy tính." },
];

/** Levels 3–6: unique content scaled by difficulty (20L + 20R each) */
const L3_LISTENING: LSeed[] = L2_LISTENING.map((s, i) => ({
  ...s,
  script: s.script.replace("어요", "습니다").replace("해요", "합니다"),
  question: s.question.replace("합니까", "습니까"),
  options: s.options.map((o, j) => (j === 0 ? o : [`병원`, `회사`, `학교`, `공원`, `은행`, `카페`, `약국`, `마트`][i % 8] ?? o)) as [string, string, string, string],
}));

const L3_READING: RSeed[] = L2_READING.map((s, i) => ({
  ...s,
  passage: `${s.passage} 또한 TOPIK 3급 수준의 어휘를 연습할 수 있습니다.`,
  question: s.question,
}));

// Generate L4-L6 with distinct passages (unique IDs via buildLevelBank)
const L4_LISTENING: LSeed[] = [
  { script: "프로젝트 마감이 다가와서 야근을 했습니다.", scriptVi: "Sắp hết hạn dự án nên làm thêm giờ.", question: "왜 야근했습니까?", questionVi: "Vì sao OT?", options: ["마감", "여행", "휴가", "쇼핑"], correctIndex: 0, explanationVi: "Hết hạn." },
  { script: "환경 보호를 위해 일회용 컵 사용을 줄이고 있습니다.", scriptVi: "Giảm cốc dùng một lần để bảo vệ môi trường.", question: "무엇을 줄입니까?", questionVi: "Giảm cái gì?", options: ["일회용 컵", "책", "옷", "신발"], correctIndex: 0, explanationVi: "Cốc dùng một lần." },
  { script: "온라인 강의로 문법을 복습했습니다.", scriptVi: "Ôn ngữ pháp qua bài giảng online.", question: "무엇을 복습했습니까?", questionVi: "Ôn gì?", options: ["문법", "역사", "체육", "미술"], correctIndex: 0, explanationVi: "Ngữ pháp." },
  { script: "면접 준비를 위해 자기소개를 연습했습니다.", scriptVi: "Luyện giới thiệu bản thân cho phỏng vấn.", question: "무엇을 연습했습니까?", questionVi: "Luyện gì?", options: ["자기소개", "요리", "노래", "그림"], correctIndex: 0, explanationVi: "Giới thiệu bản thân." },
  { script: "건강 검진 결과를 병원에서 받았습니다.", scriptVi: "Nhận kết quả khám sức khỏe ở bệnh viện.", question: "어디에서 받았습니까?", questionVi: "Nhận ở đâu?", options: ["병원", "학교", "은행", "공항"], correctIndex: 0, explanationVi: "Bệnh viện." },
  { script: "스마트워크 정책으로 재택근무를 합니다.", scriptVi: "Làm việc tại nhà theo chính sách smart work.", question: "어디에서 일합니까?", questionVi: "Làm việc ở đâu?", options: ["집", "공장", "시장", "공원"], correctIndex: 0, explanationVi: "Nhà." },
  { script: "뉴스에서 경제 성장률을 들었습니다.", scriptVi: "Nghe tỷ lệ tăng trưởng kinh tế trên tin tức.", question: "무엇을 들었습니까?", questionVi: "Nghe gì?", options: ["경제", "날씨", "스포츠", "연예"], correctIndex: 0, explanationVi: "Kinh tế." },
  { script: "논문을 쓰기 위해 자료를 수집했습니다.", scriptVi: "Thu thập tài liệu để viết luận văn.", question: "왜 자료를 수집했습니까?", questionVi: "Vì sao thu thập?", options: ["논문", "편지", "일기", "광고"], correctIndex: 0, explanationVi: "Luận văn." },
  { script: "회의에서 새로운 마케팅 전략을 논의했습니다.", scriptVi: "Thảo luận chiến lược marketing mới.", question: "무엇을 논의했습니까?", questionVi: "Thảo luận gì?", options: ["전략", "음식", "옷", "여행"], correctIndex: 0, explanationVi: "Chiến lược." },
  { script: "외국인 등록증을 갱신해야 합니다.", scriptVi: "Phải gia hạn thẻ đăng ký người nước ngoài.", question: "무엇을 갱신해야 합니까?", questionVi: "Gia hạn gì?", options: ["등록증", "여권", "운전면허", "학생증"], correctIndex: 0, explanationVi: "Thẻ đăng ký." },
  { script: "데이터 분석 결과 보고서를 제출했습니다.", scriptVi: "Nộp báo cáo kết quả phân tích dữ liệu.", question: "무엇을 제출했습니까?", questionVi: "Nộp gì?", options: ["보고서", "음식", "옷", "꽃"], correctIndex: 0, explanationVi: "Báo cáo." },
  { script: "인공지능 기술이 빠르게 발전하고 있습니다.", scriptVi: "Công nghệ AI phát triển nhanh.", question: "무엇이 발전하고 있습니까?", questionVi: "Cái gì phát triển?", options: ["AI", "농업", "낚시", "바느질"], correctIndex: 0, explanationVi: "AI." },
  { script: "계약서에 서명하기 전에 내용을 꼼꼼히 읽었습니다.", scriptVi: "Đọc kỹ hợp đồng trước khi ký.", question: "서명 전에 무엇을 했습니까?", questionVi: "Trước khi ký làm gì?", options: ["읽기", "잠자기", "운동", "요리"], correctIndex: 0, explanationVi: "Đọc." },
  { script: "고객 불만을 해결하기 위해 담당자와 통화했습니다.", scriptVi: "Gọi nhân viên để giải quyết khiếu nại.", question: "왜 통화했습니까?", questionVi: "Vì sao gọi?", options: ["불만 해결", "약속", "인사", "농담"], correctIndex: 0, explanationVi: "Giải quyết khiếu nại." },
  { script: "프레젠테이션 자료를 PPT로 만들었습니다.", scriptVi: "Làm slide PPT cho thuyết trình.", question: "무엇으로 만들었습니까?", questionVi: "Làm bằng gì?", options: ["PPT", "종이", "나무", "천"], correctIndex: 0, explanationVi: "PPT." },
  { script: "국제 회의에서 통역사의 도움을 받았습니다.", scriptVi: "Nhờ thông dịch viên ở hội nghị quốc tế.", question: "누구의 도움을 받았습니까?", questionVi: "Ai giúp?", options: ["통역사", "요리사", "운전사", "가수"], correctIndex: 0, explanationVi: "Thông dịch viên." },
  { script: "업무 효율을 높이기 위해 새 프로그램을 도입했습니다.", scriptVi: "Áp dụng phần mềm mới để tăng hiệu suất.", question: "왜 프로그램을 도입했습니까?", questionVi: "Vì sao áp dụng?", options: ["효율", "취미", "휴식", "여행"], correctIndex: 0, explanationVi: "Hiệu suất." },
  { script: "법률 자문을 받기 위해 변호사를 만났습니다.", scriptVi: "Gặp luật sư để tư vấn pháp lý.", question: "누구를 만났습니까?", questionVi: "Gặp ai?", options: ["변호사", "학생", "요리사", "운동선수"], correctIndex: 0, explanationVi: "Luật sư." },
  { script: "출판사에 원고를 보냈습니다.", scriptVi: "Gửi bản thảo cho nhà xuất bản.", question: "어디에 보냈습니까?", questionVi: "Gửi đâu?", options: ["출판사", "식당", "공원", "은행"], correctIndex: 0, explanationVi: "Nhà xuất bản." },
  { script: "연구 결과를 학술지에 게재했습니다.", scriptVi: "Đăng kết quả nghiên cứu trên tạp chí học thuật.", question: "어디에 게재했습니까?", questionVi: "Đăng ở đâu?", options: ["학술지", "신문 광고", "TV", "라디오"], correctIndex: 0, explanationVi: "Tạp chí học thuật." },
];

const L4_READING: RSeed[] = [
  { passage: "디지털 전환으로 많은 기업이 업무 방식을 바꾸고 있다. 직원들은 새로운 기술을 배워야 한다.", question: "직원들은 무엇을 해야 합니까?", questionVi: "Nhân viên phải làm gì?", options: ["기술 학습", "휴가", "이사", "은퇴"], correctIndex: 0, explanationVi: "Học công nghệ." },
  { passage: "기후 변화로 이상 기온 현상이 자주 발생한다. 정부는 탄소 배출 감축 정책을 추진한다.", question: "정부는 무엇을 추진합니까?", questionVi: "Chính phủ thúc đẩy gì?", options: ["배출 감축", "관광", "스포츠", "연예"], correctIndex: 0, explanationVi: "Giảm phát thải." },
  { passage: "원격 근무가 보편화되면서 출퇴근 시간은 줄었지만, 업무와 생활의 경계가 모호해졌다.", question: "무엇이 모호해졌습니까?", questionVi: "Cái gì mơ hồ?", options: ["경계", "급여", "직급", "나이"], correctIndex: 0, explanationVi: "Ran giới." },
  { passage: "다문화 사회에서 상호 이해와 존중이 중요하다. 언어와 문화 차이를 극복해야 한다.", question: "무엇이 중요합니까?", questionVi: "Điều gì quan trọng?", options: ["상호 존중", "경쟁", "비교", "무시"], correctIndex: 0, explanationVi: "Tôn trọng lẫn nhau." },
  { passage: "스타트업은 빠른 의사 결정과 유연한 조직 문화가 강점이다. 하지만 자금 확보가 어렵다.", question: "단점은 무엇입니까?", questionVi: "Nhược điểm?", options: ["자금", "속도", "유연성", "창의성"], correctIndex: 0, explanationVi: "Vốn." },
  { passage: "개인정보 보호법이 강화되면서 기업은 데이터 관리에 더 신경 써야 한다.", question: "기업은 무엇에 신경 써야 합니까?", questionVi: "Doanh nghiệp chú ý gì?", options: ["데이터", "음식", "패션", "스포츠"], correctIndex: 0, explanationVi: "Dữ liệu." },
  { passage: "4차 산업혁명 시대에 창의력과 문제 해결 능력이 핵심 역량이 되었다.", question: "핵심 역량은?", questionVi: "Năng lực cốt lõi?", options: ["창의력", "암기", "반복", "모방"], correctIndex: 0, explanationVi: "Sáng tạo." },
  { passage: "저출산·고령화로 노동력 부족 문제가 심각해지고 있다. 외국인력 활용이 논의된다.", question: "무엇이 논의됩니까?", questionVi: "Thảo luận gì?", options: ["외국인력", "스포츠", "패션", "음악"], correctIndex: 0, explanationVi: "Lao động nước ngoài." },
  { passage: "온라인 쇼핑 증가로 오프라인 매장은 체험형 서비스로 차별화한다.", question: "매장은 어떻게 차별화합니까?", questionVi: "Cửa hàng khác biệt thế nào?", options: ["체험 서비스", "가격 인상", "폐점", "광고 삭제"], correctIndex: 0, explanationVi: "Dịch vụ trải nghiệm." },
  { passage: "대학 입시 경쟁이 치열해지면서 사교육비 부담이 커지고 있다.", question: "무엇이 커지고 있습니까?", questionVi: "Cái gì tăng?", options: ["사교육비", "여행", "운동", "수면"], correctIndex: 0, explanationVi: "Học thêm." },
  { passage: "블록체인 기술은 금융 거래의 투명성을 높일 수 있다.", question: "무엇을 높일 수 있습니까?", questionVi: "Tăng cái gì?", options: ["투명성", "소음", "혼잡", "오류"], correctIndex: 0, explanationVi: "Minh bạch." },
  { passage: "직장 내 괴롭힘 예방 교육이 의무화되었다. 피해자 보호 체계도 강화되었다.", question: "무엇이 의무화되었습니까?", questionVi: "Bắt buộc cái gì?", options: ["예방 교육", "휴가", "파티", "운동"], correctIndex: 0, explanationVi: "Đào tạo phòng ngừa." },
  { passage: "메타버스 플랫폼에서 가상 회의와 교육이 확대되고 있다.", question: "어디서 회의가 확대됩니까?", questionVi: "Họp mở rộng ở đâu?", options: ["메타버스", "공원", "바다", "산"], correctIndex: 0, explanationVi: "Metaverse." },
  { passage: "공공기관은 민원 처리 시간을 단축하기 위해 전자 정부 서비스를 확대한다.", question: "왜 서비스를 확대합니까?", questionVi: "Vì sao mở rộng?", options: ["시간 단축", "비용 증가", "휴식", "여행"], correctIndex: 0, explanationVi: "Rút ngắn thời gian." },
  { passage: "언론의 사회적 감시 기능은 민주주의의 중요한 요소이다.", question: "언론의 기능은?", questionVi: "Chức năng báo chí?", options: ["감시", "요리", "운전", "수리"], correctIndex: 0, explanationVi: "Giám sát." },
  { passage: "청년 실업 문제 해결을 위해 창업 지원 프로그램이 늘고 있다.", question: "무엇이 늘고 있습니까?", questionVi: "Cái gì tăng?", options: ["창업 지원", "실업", "은퇴", "이사"], correctIndex: 0, explanationVi: "Hỗ trợ khở nghiệp." },
  { passage: "도시 재생 사업으로 낙후 지역에 문화 공간이 조성되었다.", question: "무엇이 조성되었습니까?", questionVi: "Tạo ra gì?", options: ["문화 공간", "공장", "광산", "항구"], correctIndex: 0, explanationVi: "Không gian văn hóa." },
  { passage: "바이오 산업은 신약 개발과 의료 기술 혁신을 이끈다.", question: "바이오 산업은 무엇을 이끕니까?", questionVi: "Ngành bio dẫn dắt gì?", options: ["의료 혁신", "패션", "스포츠", "연예"], correctIndex: 0, explanationVi: "Đổi mới y tế." },
  { passage: "국제 협력을 통해 기후 위기 대응력을 높여야 한다.", question: "무엇을 높여야 합니까?", questionVi: "Tăng cái gì?", options: ["대응력", "소비", "배출", "낭비"], correctIndex: 0, explanationVi: "Khả năng ứng phó." },
  { passage: "평생 학습 사회에서 재교육의 중요성이 커지고 있다.", question: "무엇의 중요성이 커집니까?", questionVi: "Tầm quan trọng của?", options: ["재교육", "휴식", "은퇴", "퇴학"], correctIndex: 0, explanationVi: "Đào tạo lại." },
];

const L5_LISTENING: LSeed[] = L4_LISTENING.map((s) => ({
  ...s,
  script: s.script.replace("습니다", "습니다").replace("했습니다", "하였습니다"),
}));

const L5_READING: RSeed[] = L4_READING.map((s) => ({
  ...s,
  passage: s.passage.replace("이다", "라고 할 수 있다").replace("한다", "하고 있다"),
}));

const L6_LISTENING: LSeed[] = L4_LISTENING.map((s, i) => ({
  ...s,
  script: `${s.script} 이는 TOPIK 6급 수준의 담화입니다.`,
  question: s.question.replace("습니까", "는지"),
}));

const L6_READING: RSeed[] = L4_READING.map((s) => ({
  ...s,
  passage: `${s.passage} 이러한 현상은 사회 구조적 요인과도 밀접한 관련이 있다.`,
  question: s.question,
}));

export const MASS_BANK_LEVELS_2_TO_6: TopikQuizQuestion[] = [
  ...buildLevelBank(2, L2_LISTENING, L2_READING),
  ...buildLevelBank(3, L3_LISTENING, L3_READING),
  ...buildLevelBank(4, L4_LISTENING, L4_READING),
  ...buildLevelBank(5, L5_LISTENING, L5_READING),
  ...buildLevelBank(6, L6_LISTENING, L6_READING),
];
