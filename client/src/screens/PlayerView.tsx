import { useStore, useCurrentWedge } from '../store';
import { getSocket } from '../socket';
import {
  C2S,
  PLAYER_WEDGES,
  MAX_CHIPS_PER_PLAYER,
  wedgeType,
} from '../shared/types';
import Wheel from '../components/Wheel';

interface Props {
  onLeave: () => void;
}

export default function PlayerView({ onLeave }: Props) {
  const round = useStore((s) => s.round);
  const phase = useStore((s) => s.phase);
  const revealed = useStore((s) => s.revealed);
  const chips = useStore((s) => s.chips);
  const entryWedge = useStore((s) => s.entryWedge);
  const hiddenChipCount = useStore((s) => s.hiddenChipCount);
  const self = useStore((s) => s.self);
  const playersById = useStore((s) => s.playersById);
  const playerOrder = useStore((s) => s.playerOrder);
  const errorText = useStore((s) => s.errorText);
  const currentWedge = useCurrentWedge();

  const socket = getSocket();
  const me = self.playerId ? playersById[self.playerId] : undefined;
  const locked = !!me?.locked;

  const myChips = chips.filter((c) => c.playerId === self.playerId);
  const myWedges: Set<number> = new Set(myChips.map((c) => c.wedge));

  const placing = phase === 'placing';
  const canEdit = placing && !locked;

  const liveWedges = canEdit
    ? PLAYER_WEDGES.filter((w) => myWedges.has(w) || myChips.length < MAX_CHIPS_PER_PLAYER)
    : [];

  const toggleWedge = (wedge: number) => {
    useStore.getState().setError(null);
    const existing = myChips.find((c) => c.wedge === wedge);
    if (existing) {
      socket?.emit(C2S.PLAYER_CHIP_REMOVE, { chipId: existing.id });
    } else {
      socket?.emit(C2S.PLAYER_CHIP_PLACE, { wedge });
    }
  };

  const waitingOn = playerOrder
    .map((id) => playersById[id])
    .filter((p) => p && p.connected && !p.locked)
    .map((p) => p.displayName);

  return (
    <div className="player-view">
      <div className="player-header">
        <h2>Round {round}</h2>
        <span className="token-count">
          {myChips.length}/{MAX_CHIPS_PER_PLAYER} chips
        </span>
        <button className="btn btn-ghost btn-small" onClick={onLeave}>
          Leave
        </button>
      </div>

      <Wheel
        chips={chips}
        currentWedge={currentWedge}
        entryWedge={entryWedge}
        liveWedges={canEdit ? liveWedges : undefined}
        onWedgeClick={toggleWedge}
        ownPlayerId={self.playerId}
        hiddenChipCount={hiddenChipCount}
      />

      {errorText && <p className="error-text">{errorText}</p>}

      {placing && (
        <div className="player-actions">
          {!locked ? (
            <>
              <p className="hint-text">
                Tap a lit wedge to place a chip, tap it again to take it back. One chip
                per wedge. Nobody sees your chips until everyone locks in.
              </p>
              <button
                className="btn btn-primary btn-large"
                onClick={() => socket?.emit(C2S.PLAYER_LOCK_IN)}
                disabled={myChips.length === 0}
              >
                Lock in {myChips.length} chip{myChips.length === 1 ? '' : 's'}
              </button>
            </>
          ) : (
            <>
              <p className="hint-text">
                {revealed
                  ? 'Chips are face up. Waiting on the entry roll.'
                  : waitingOn.length
                    ? `Waiting on ${waitingOn.join(', ')}.`
                    : 'Waiting on the DM.'}
              </p>
              {!revealed && (
                <button
                  className="btn btn-large"
                  onClick={() => socket?.emit(C2S.PLAYER_UNLOCK)}
                >
                  Unlock and change chips
                </button>
              )}
            </>
          )}
        </div>
      )}

      {phase === 'resolving' && (
        <div className="player-actions">
          {currentWedge == null ? (
            <p className="hint-text">The rotation is finished. Waiting on the DM.</p>
          ) : myWedges.has(currentWedge) ? (
            <div className="your-wedge-banner">Wedge {currentWedge} — you're up</div>
          ) : (
            <p className="hint-text">
              Wedge {currentWedge}
              {wedgeType(currentWedge) === 'status' && ' — conditions tick'}
              {wedgeType(currentWedge) === 'environment' && ' — the room acts'}
              . Your wedges: {myChips.length ? Array.from(myWedges).sort((a, b) => a - b).join(', ') : 'none'}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
