import type { LoadingProgress } from '../../types/loadingProgress';

export function CatalogLoadingBar({ label = 'Searching Play Atlas catalog…', progress }: { label?: string; progress?: LoadingProgress | null }) {
  const measured = progress?.phase === 'download' && Number.isFinite(progress.total) && progress.total! > 0;
  const percent = measured ? Math.min(100, Math.max(0, Math.floor((progress.loaded ?? 0) / progress.total! * 100))) : undefined;
  const stage = progress?.phase === 'download' ? 'Downloading catalog' : progress?.phase === 'verify' ? 'Verifying catalog' : progress?.phase === 'unpack' ? 'Unpacking catalog' : progress?.phase === 'index' ? 'Preparing searchable games' : 'Searching and sorting games';
  const bytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MB`;
  const detail = measured ? `${bytes(progress!.loaded ?? 0)} of ${bytes(progress!.total!)} downloaded` : progress?.phase === 'download' && progress.loaded ? `${bytes(progress.loaded)} downloaded` : 'Working… this may take a moment.';
  return <div className="atlas-catalog-loading themed-panel font-sans p-6 space-y-3">
    <div className="flex items-center justify-between gap-3 text-sm font-bold"><span>{label}</span>{percent !== undefined && <span className="shrink-0 tabular-nums">{percent}%</span>}</div>
    <div role="progressbar" aria-label={stage} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={percent === undefined ? stage : `${percent}% of catalog download`} className="atlas-loading-track">
      <div className={`atlas-loading-fill ${percent === undefined ? 'atlas-loading-indeterminate' : ''}`} style={percent === undefined ? undefined : { width: `${percent}%` }} />
      <span className="atlas-loading-sheen" aria-hidden="true" />
    </div>
    <p className="text-xs text-[var(--text-muted)]">{stage} · {detail}</p>
  </div>;
}
