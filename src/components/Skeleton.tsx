export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function CardSkeleton({ height = "h-40" }: { height?: string }) {
  return (
    <div className="glass neon-border p-5 animate-fade-in">
      <Skeleton className="h-3 w-32 mb-4" />
      <Skeleton className={`${height} w-full`} />
    </div>
  );
}
