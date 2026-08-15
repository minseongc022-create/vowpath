import { FavoritesClient } from "@/giu/components/FavoritesClient";
import { GIU_STRINGS } from "@/giu/lib/strings";

export default function GiuFavoritesPage() {
  return (
    <div className="giu-page">
      <h1 className="giu-section-title">{GIU_STRINGS.navFavorites}</h1>
      <p className="giu-section-sub">저장한 가게 · 새 박스 알림</p>
      <div className="mt-5">
        <FavoritesClient />
      </div>
    </div>
  );
}
