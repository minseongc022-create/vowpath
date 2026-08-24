/**
 * 클라이언트 컴포넌트에서도 안전하게 쓸 수 있는 순수 상수.
 * toss-connect.ts는 서버 전용 API 클라이언트(undici 프록시 포함)를 끌어오므로
 * 분리해서 브라우저 번들에 서버 코드가 섞여 들어가는 걸 막는다.
 */
export const TOSS_SELLER_CENTER_URL = "https://shopping-seller.toss.im";
