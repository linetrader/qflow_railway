// src/app/admin/page.tsx
export default function AdminHomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        좌측 메뉴를 선택하면 이 영역에 해당 화면이 표시됩니다.
      </p>
      {/* 필요한 카드/위젯들을 여기에 배치 */}
    </div>
  );
}
