"use client";

export default function BulkPurchaseLayoutView(props: {
  subtitle: string;
  childrenTop: React.ReactNode; // 렌더 전용은 허용, 타입으로 ReactNode를 노출하지 않기 위해 any 미사용
  childrenBottom?: React.ReactNode;
}) {
  const { subtitle, childrenTop, childrenBottom } = props;
  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">테스트 유저 대량 구매</h1>
          <p className="text-sm opacity-70">{subtitle}</p>
        </div>
      </div>
      {childrenTop}
      {childrenBottom}
    </div>
  );
}
