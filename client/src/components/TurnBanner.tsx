import { useStore } from '../store';

export default function TurnBanner() {
  const showRoundToast = useStore((s) => s.showRoundToast);
  const dismiss = useStore((s) => s.dismissRoundToast);

  if (!showRoundToast) return null;

  return (
    <div className="turn-banner" role="alert" aria-live="polite">
      <span>Round {showRoundToast} — chips cleared, place again.</span>
      <button className="btn btn-ghost btn-tiny" onClick={dismiss}>×</button>
    </div>
  );
}
