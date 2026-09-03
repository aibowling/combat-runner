import { useStore, useCurrentWedge } from '../store';
import Clock from '../components/Clock';
import ReactionBox from '../components/ReactionBox';

interface Props {
  onLeave: () => void;
}

/**
 * The shared screen. Everyone is looking at it, players included, so it is fed
 * the same redacted state a bystander gets — it is never sent hidden chips or
 * enemy hit points in the first place, rather than being trusted not to draw
 * them.
 */
export default function PartyView({ onLeave }: Props) {
  const round = useStore((s) => s.round);
  const phase = useStore((s) => s.phase);
  const revealed = useStore((s) => s.revealed);
  const chips = useStore((s) => s.chips);
  const entryWedge = useStore((s) => s.entryWedge);
  const hiddenChipCount = useStore((s) => s.hiddenChipCount);
  const playersById = useStore((s) => s.playersById);
  const playerOrder = useStore((s) => s.playerOrder);
  const boxesById = useStore((s) => s.boxesById);
  const boxOrder = useStore((s) => s.boxOrder);
  const currentWedge = useCurrentWedge();

  const placing = phase === 'placing';
  const players = playerOrder.map((id) => playersById[id]).filter(Boolean);
  const waiting = players.filter((p) => p.connected && !p.locked);

  return (
    <div className="party-view">
      <header className="party-header">
        <h1>Round {round}</h1>
        <span className="party-status">
          {placing
            ? revealed
              ? 'Chips are face up — waiting on the entry roll'
              : waiting.length
                ? `Placing — waiting on ${waiting.map((p) => p.displayName).join(', ')}`
                : 'Placing'
            : 'Resolving'}
        </span>
        <button className="btn btn-ghost btn-small party-leave" onClick={onLeave}>
          Leave
        </button>
      </header>

      <div className="party-body">
        <div className="party-clock">
          <Clock
            chips={chips}
            currentWedge={currentWedge}
            entryWedge={entryWedge}
            hiddenChipCount={hiddenChipCount}
            round={round}
          />
        </div>

        <aside className="party-side">
          <section className="party-panel">
            <h2>Party</h2>
            <ul className="party-list">
              {players.length === 0 && <li className="muted">Nobody has joined.</li>}
              {players.map((p) => (
                <li key={p.id} className={p.connected ? '' : 'party-away'}>
                  <span className="party-name">{p.displayName}</span>
                  <span className="party-lock">
                    {!p.connected ? 'away' : p.locked ? 'locked in' : 'choosing'}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {boxOrder.length > 0 && (
            <section className="party-panel">
              <h2>Reactions</h2>
              <div className="party-boxes">
                {boxOrder.map((id) => (
                  <ReactionBox key={id} box={boxesById[id]} />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
