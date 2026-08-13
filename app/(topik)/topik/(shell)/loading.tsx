export default function TopikLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-6 pb-8">
      <div className="topik-gradient-header -mx-4 h-36 rounded-b-[28px] mb-6 opacity-90" />
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="topik-card-elevated h-20" />
        <div className="topik-card-elevated h-20" />
      </div>
      <div className="space-y-2.5">
        <div className="topik-card h-16" />
        <div className="topik-card h-16" />
        <div className="topik-card h-16" />
      </div>
    </main>
  );
}
