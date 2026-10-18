export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded bg-zinc-800/70 motion-safe:animate-pulse ${className}`}
    />
  );
}
