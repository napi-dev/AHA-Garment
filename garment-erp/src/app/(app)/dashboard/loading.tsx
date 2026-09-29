/**
 * Dashboard loading skeleton — shown while the async server component fetches data.
 * Uses the same grid layout so there's no layout shift on load.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Welcome banner skeleton */}
      <div className="h-36 rounded-3xl bg-slate-200" />

      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-slate-100 border border-slate-200 p-5 space-y-3">
            <div className="flex justify-between">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-9 w-9 rounded-xl bg-slate-200" />
            </div>
            <div className="h-8 w-24 rounded bg-slate-200" />
            <div className="h-3 w-36 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-100 border border-slate-200 h-64" />
        <div className="rounded-2xl bg-slate-100 border border-slate-200 h-64" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-slate-100 border border-slate-200 h-32" />
        ))}
      </div>
    </div>
  );
}
