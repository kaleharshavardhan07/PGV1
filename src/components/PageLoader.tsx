/** Skeleton shown while a page's first data load is in flight. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-dark-100 ${className}`} aria-hidden="true" />;
}

export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card p-5 space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-16" /><Skeleton className="h-3 w-32" /></div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="card divide-y divide-dark-100">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="p-4 flex items-center gap-3"><Skeleton className="w-10 h-10" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/3" /><Skeleton className="h-3 w-1/2" /></div></div>
      ))}
    </div>
  );
}
