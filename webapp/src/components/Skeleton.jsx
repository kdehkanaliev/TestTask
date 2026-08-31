/* Skeleton loader — ma'lumot yuklanayotganda shimmer effekti ko'rsatadi. */
export default function Skeleton({ className = "" }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-2xl bg-deep ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-shimmer
          bg-gradient-to-r from-transparent via-border to-transparent"
      />
    </div>
  );
}