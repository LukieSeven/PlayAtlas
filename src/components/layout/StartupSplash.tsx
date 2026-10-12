import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, LoaderCircle } from 'lucide-react';
import { getBasePathAwareUrl } from '../../services/catalogDataSource';
import { prepareStartup, startupTasks, type StartupStep } from '../../services/startupService';
import { Button } from '../ui/Button';

export function StartupSplash({ steps = [], error = false, slow = false, onRetry, onContinue }: {
  steps?: StartupStep[]; error?: boolean; slow?: boolean; onRetry?: () => void; onContinue?: () => void;
}) {
  const complete = steps.filter(step => step.state === 'ready').length;
  return <div className="themed-app-shell atlas-startup-splash" data-testid="startup-splash">
    <div className="cartographic-bg-overlay" aria-hidden="true" />
    <section className="atlas-startup-content relative z-10 flex flex-col items-center text-center">
      <div className="atlas-startup-compass">
        <img src={getBasePathAwareUrl('branding/play-atlas-compass-watercolor.png')} alt="" className="h-full w-full rounded-full object-cover" />
        {!error && <span className="atlas-startup-orbit" aria-hidden="true" />}
      </div>
      <div className="atlas-wordmark-crop atlas-startup-wordmark" role="img" aria-label="Play Atlas" />
      <p className="text-xs font-bold tracking-[0.18em] text-[var(--text-secondary)]">DISCOVER · TRACK · PLAY</p>
      <h1 className="mt-6 text-3xl font-serif font-bold leading-tight text-[var(--text-primary)]">{error ? 'We couldn’t finish loading' : 'Preparing your atlas…'}</h1>
      <p role={error ? 'alert' : 'status'} aria-live="polite" className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {error ? onContinue ? 'Check your connection and try again, or open the site to explore what’s available.' : 'Check your connection and try again.' : slow ? 'Still loading. You can open the site while this finishes.' : 'Gathering the games and discoveries for your first page.'}
      </p>
      {steps.length > 0 && <div className="mt-6 w-full max-w-sm space-y-3 text-left">
        <div role="progressbar" aria-label="Preparing atlas" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={complete} aria-valuetext={`${complete} of ${steps.length} loading steps completed`} className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-border)]">
          <div className="h-full rounded-full bg-[var(--primary-action)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${complete / steps.length * 100}%` }} />
        </div>
        <ul className="space-y-2">{steps.map(step => <li key={step.label} className="flex items-center gap-3 text-xs text-[var(--text-primary)]">
          {step.state === 'ready' ? <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--primary-action)]" /> : <LoaderCircle aria-hidden="true" className={`h-5 w-5 shrink-0 ${error ? '' : 'animate-spin motion-reduce:animate-none'}`} />}{step.label}
        </li>)}</ul>
      </div>}
      {(error || slow) && <div className="mt-6 flex flex-wrap justify-center gap-3">
        {error && onRetry && <Button onClick={onRetry}>Try again</Button>}
        {onContinue && <Button variant="secondary" onClick={onContinue}>Open atlas</Button>}
      </div>}
    </section>
  </div>;
}

/** Recover when a newly deployed page bundle cannot be downloaded. */
export class StartupErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <StartupSplash error onRetry={() => window.location.reload()} /> : this.props.children;
  }
}

/** One gate per application visit; ordinary navigation never restarts it. */
export function StartupGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [initialPath] = useState(location.pathname);
  const tasks = useMemo(() => startupTasks(initialPath), [initialPath]);
  const [steps, setSteps] = useState<StartupStep[]>(tasks.map(task => ({ label: task.label, state: 'pending' })));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false); setSlow(false);
    setSteps(tasks.map(task => ({ label: task.label, state: 'pending' })));
    const slowTimer = window.setTimeout(() => { if (active) setSlow(true); }, 12000);
    prepareStartup(tasks, index => { if (active) setSteps(current => current.map((step, position) => position === index ? { ...step, state: 'ready' } : step)); })
      .then(() => { if (active) setReady(true); })
      .catch(() => { if (active) setError(true); })
      .finally(() => window.clearTimeout(slowTimer));
    return () => { active = false; window.clearTimeout(slowTimer); };
  }, [tasks, attempt]);
  return ready ? children : <StartupSplash steps={steps} error={error} slow={slow} onRetry={() => setAttempt(value => value + 1)} onContinue={() => setReady(true)} />;
}
