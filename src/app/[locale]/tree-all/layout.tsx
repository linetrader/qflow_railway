export const metadata = { title: "Tree - Fullscreen" };

export default function TreeAllLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#0b1220] text-white">{children}</div>;
}
