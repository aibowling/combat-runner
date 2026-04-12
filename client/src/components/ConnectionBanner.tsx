import { useStore } from '../store';

export default function ConnectionBanner() {
  const connected = useStore((s) => s.connected);

  if (connected) return null;

  return (
    <div className="connection-banner" role="alert" aria-live="polite">
      Reconnecting...
    </div>
  );
}
