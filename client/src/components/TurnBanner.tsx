import { useStore } from '../store';

export default function TurnBanner() {
  const showTurnToast = useStore((s) => s.showTurnToast);
  const dismiss = useStore((s) => s.dismissTurnToast);

  if (!showTurnToast) return null;

  return (
    <div className="turn-banner" role="alert" aria-live="polite">
      <span>Turn {showTurnToast} started — token budgets reset, reactions rerolled!</span>
      <button className="btn btn-ghost btn-tiny" onClick={dismiss}>×</button>
    </div>
  );
}
