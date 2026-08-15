import { FavoritesClient } from "@/giu/components/FavoritesClient";

export default function GiuFavoritesPage() {
  return (
    <div className="giu-page">
      <header className="mb-4">
        <h1 className="giu-section-title">즐겨찾기</h1>
        <p className="giu-section-sub">저장한 가게 · 새 박스 알림</p>
      </header>
      <FavoritesClient />
    </div>
  );
}
