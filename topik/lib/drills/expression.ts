/** Korean expressions & natural phrases — beyond single words */

export type ExpressionDrill = {
  id: string;
  level: number;
  hintVi: string;
  hintEn: string;
  expressionKo: string;
  meaningVi: string;
  context: string;
  options: string[];
  correctIndex: number;
  isNew?: boolean;
};

export const EXPRESSION_DRILLS: ExpressionDrill[] = [
  {
    id: "e1",
    level: 2,
    hintVi: "Khi ai đó làm việc vất vả",
    hintEn: "When someone worked hard",
    expressionKo: "수고하셨어요",
    meaningVi: "Cảm ơn vì đã vất vả / Good job",
    context: "Sau khi đồng nghiệp hoàn thành việc",
    options: ["수고하셨어요", "잘 먹겠습니다", "실례합니다", "축하해요"],
    correctIndex: 0,
    isNew: true,
  },
  {
    id: "e2",
    level: 2,
    hintVi: "Trước khi ăn",
    hintEn: "Before eating",
    expressionKo: "잘 먹겠습니다",
    meaningVi: "Xin mời (trước bữa ăn)",
    context: "Cùng ăn với người Hàn",
    options: ["잘 먹겠습니다", "맛있게 드세요", "배고파요", "천천히 먹어요"],
    correctIndex: 0,
  },
  {
    id: "e3",
    level: 3,
    hintVi: "Xin lỗi khi đi ngang qua",
    hintEn: "Excuse me (passing through)",
    expressionKo: "잠시만요",
    meaningVi: "Xin chờ một chút",
    context: "Trong đám đông, trên tàu điện",
    options: ["잠시만요", "괜찮아요", "고마워요", "안녕히 가세요"],
    correctIndex: 0,
  },
  {
    id: "e4",
    level: 3,
    hintVi: "Đồng ý nhẹ nhàng",
    hintEn: "Soft agreement",
    expressionKo: "그래요",
    meaningVi: "Vậy à / Được / Ừ",
    context: "Trả lời bạn bè",
    options: ["그래요", "아니에요", "몰라요", "싫어요"],
    correctIndex: 0,
  },
  {
    id: "e5",
    level: 4,
    hintVi: "Thể hiện sự đồng cảm",
    hintEn: "Showing empathy",
    expressionKo: "힘드시겠어요",
    meaningVi: "Chắc bạn mệt lắm nhỉ",
    context: "Nghe bạn kể chuyện khó khăn",
    options: ["힘드시겠어요", "재미있겠어요", "배고프겠어요", "춥겠어요"],
    correctIndex: 0,
  },
];

export function getExpressionDrills(limit = 5): ExpressionDrill[] {
  return EXPRESSION_DRILLS.slice(0, limit);
}
