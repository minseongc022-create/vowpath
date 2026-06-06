/** Non-blocking route transition hint — shell layouts stay interactive. */
export default function Loading() {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[300] h-0.5 bg-violet-500/15"
      aria-hidden
    >
      <div className="vow-loading-bar h-full w-1/4 bg-violet-400/80" />
    </div>
  );
}
