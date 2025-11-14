// src/app/admin/boards/announcements/page.tsx
import AnnouncementsView from "./view/AnnouncementsView";

// 서버 컴포넌트(연산부 최소화): 실제 상호작용은 클라이언트 view 컴포넌트에 위임
export default function Page() {
  // 이 페이지는 클라이언트 view를 그대로 렌더링만 합니다.
  // 데이터 로딩/변경은 view 내부의 hooks에서 수행됩니다.
  return <AnnouncementsView />;
}
