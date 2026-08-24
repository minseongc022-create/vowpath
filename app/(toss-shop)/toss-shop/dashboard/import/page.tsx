import { redirect } from "next/navigation";
import { SP_ROUTES } from "@/toss-shop/lib/routes";

/**
 * 수입판매는 현재 비활성 (channel-mode.ts).
 *
 * 랜딩코스트(관세·부가세)가 실측이 아니고 수입 인증 게이트가 없어 마진 숫자를
 * 신뢰할 수 없다. 위탁은 배송 인센티브로 같은 수수료 0%를 자본 리스크 없이
 * 받을 수 있어 우선순위가 높다. 되살릴 때 이 리다이렉트를 걷어내면 된다.
 */
export default function ImportSalesPage() {
  redirect(SP_ROUTES.consignment);
}
