import { redirect } from "next/navigation";
import { NotificationList } from "@/vibesafe/components/NotificationList";
import { getSession } from "@/vibesafe/lib/session";

export const metadata = { title: "알림" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!(await getSession())) redirect("/vibesafe/login");
  return (
    <div className="vs-container">
      <div className="vs-stack">
        <div>
          <h1 className="vs-page-title">알림</h1>
          <p className="vs-page-sub">정상이던 기능이 실패로 바뀐 순간만 알려드립니다.</p>
        </div>
        <div className="vs-card vs-card-flush">
          <NotificationList />
        </div>
      </div>
    </div>
  );
}
