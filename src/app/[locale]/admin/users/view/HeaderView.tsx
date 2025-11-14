// src/app/admin/users/components/view/HeaderView.tsx
"use client";

export function HeaderView(props: { title: string; subtitle?: string }) {
  const { title, subtitle } = props;
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-base-content/60">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
