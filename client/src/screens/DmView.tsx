import { useState } from 'react';
import { useStore, useCurrentWedge, playerColor } from '../store';
import { getSocket } from '../socket';
import {
  C2S,
  ENEMY_WEDGES,
  MAX_CHIPS_PER_PLAYER,
  WEDGE_COUNT,
  wedgeType,
} from '../shared/types';
import Wheel from '../components/Wheel';

interface Props {
  onLeave: () => void;
}

const WEDGE_BLURB: Record<string, string> = {
  status: 'All persistent conditions tick — burn, poison, bleed.',
  environment: 'Global environmental effects fire.',
};

export default function DmView({ onLeave }: Props) {
  const round = useStore((s) => s.round);
  const phase = useStore((s) => s.phase);
  const revealed = useStore((s) => s.revealed);
  const chips = useStore((s) => s.chips);
  const entryWedge = useStore((s) => s.entryWedge);
  const stepIndex = useStore((s) => s.stepIndex);
  const npcs = useStore((s) => s.npcs);
  const playersById = useStore((s) => s.playersById);
  const playerOrder = useStore((s) => s.playerOrder);
  const previousNpcNames = useStore((s) => s.previousNpcNames);
  const errorText = useStore((s) => s.errorText);
  const currentWedge = useCurrentWedge();

  const socket = getSocket();
  const [npcName, setNpcName] = useState('');
  const [npcCount, setNpcCount] = useState(1);
  const [selectedNpc, setSelectedNpc] = useState<number | null>(null);

  const placing = phase === 'placing';
  const rotationDone = phase === 'resolving' && stepIndex >= WEDGE_COUNT;

  const liveWedges =
    placing && selectedNpc != null ? ENEMY_WEDGES : undefined;

  const toggleWedge = (wedge: number) => {
    if (selectedNpc == null) return;
    useStore.getState().setError(null);
    const existing = chips.find((c) => c.npcId === selectedNpc && c.wedge === wedge);
    if (existing) {
      socket?.emit(C2S.DM_CHIP_REMOVE, { chipId: existing.id });
    } else {
      socket?.emit(C2S.DM_CHIP_PLACE, { wedge, npcId: selectedNpc });
    }
  };

  const addNpc = () => {
    if (!npcName.trim()) return;
    socket?.emit(C2S.DM_NPC_ADD, { name: npcName.trim(), count: npcCount });
    setNpcName('');
    setNpcCount(1);
  };

  const notLocked = playerOrder
    .map((id) => playersById[id])
    .filter((p) => p && p.connected && !p.locked);

  const occupants = currentWedge
    ? chips.filter((c) => c.wedge === currentWedge)
    : [];

  return (
    <div className="dm-view">
      <div className="dm-header">
        <h2>Round {round}</h2>
        <span className="dm-phase">{placing ? 'Placing' : rotationDone ? 'Rotation complete' : `Wedge ${stepIndex + 1} of ${WEDGE_COUNT}`}</span>
        <button className="btn btn-ghost btn-small" onClick={onLeave}>
          Leave
        </button>
      </div>

      <div className="dm-columns">
        <div className="dm-wheel-col">
          <Wheel
            chips={chips}
            currentWedge={currentWedge}
            entryWedge={entryWedge}
            liveWedges={liveWedges}
            onWedgeClick={toggleWedge}
            hiddenChipCount={0}
          />

          {errorText && <p className="error-text">{errorText}</p>}

          {placing && (
            <div className="dm-controls">
              <p className="hint-text">
                {revealed
                  ? 'Chips are face up.'
                  : notLocked.length
                    ? `Hidden until everyone locks in. Waiting on ${notLocked
                        .map((p) => p.displayName)
                        .join(', ')}.`
                    : 'No players connected yet.'}
              </p>
              <div className="dm-button-row">
                {!revealed && (
                  <button className="btn" onClick={() => socket?.emit(C2S.DM_REVEAL)}>
                    Reveal chips now
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => socket?.emit(C2S.DM_ROLL_ENTRY)}
                >
                  Roll entry wedge (d10)
                </button>
              </div>
              <div className="dm-manual-entry">
                <span className="hint-text">Rolled a physical die?</span>
                {Array.from({ length: WEDGE_COUNT }, (_, i) => i + 1).map((w) => (
                  <button
                    key={w}
                    className="btn btn-tiny"
                    onClick={() => socket?.emit(C2S.DM_SET_ENTRY, { wedge: w })}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'resolving' && (
            <div className="dm-controls">
              {currentWedge != null && (
                <div className="now-card">
                  <div className="now-kind">{wedgeType(currentWedge)} wedge</div>
                  <div className="now-num">{currentWedge}</div>
                  <div className="now-body">
                    {WEDGE_BLURB[wedgeType(currentWedge)] ??
                      (occupants.length ? (
                        <div className="occ-row">
                          {occupants.map((c) => (
                            <span
                              key={c.id}
                              className="occ-pill"
                              style={{
                                borderColor:
                                  c.actorKind === 'npc'
                                    ? '#8c302b'
                                    : playerColor(c.playerId ?? 0),
                              }}
                            >
                              {c.displayName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">Nothing placed here.</span>
                      ))}
                  </div>
                </div>
              )}
              {rotationDone && (
                <p className="hint-text">
                  All ten wedges resolved. End the round to re-place chips and roll a
                  fresh entry.
                </p>
              )}
              <div className="dm-button-row">
                <button
                  className="btn"
                  onClick={() => socket?.emit(C2S.DM_BACK)}
                  disabled={stepIndex <= 0}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => socket?.emit(C2S.DM_ADVANCE)}
                  disabled={rotationDone}
                >
                  Next wedge
                </button>
                <button className="btn" onClick={() => socket?.emit(C2S.DM_END_ROUND)}>
                  End round
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="dm-side-col">
          <section className="dm-panel">
            <h3>Players</h3>
            <ul className="dm-list">
              {playerOrder.length === 0 && <li className="muted">Nobody has joined.</li>}
              {playerOrder.map((id) => {
                const p = playersById[id];
                if (!p) return null;
                return (
                  <li key={id} className="dm-list-row">
                    <span className="dot" style={{ background: playerColor(id) }} />
                    <span className="dm-list-name">{p.displayName}</span>
                    <span className="muted">
                      {!p.connected
                        ? 'away'
                        : p.locked
                          ? 'locked'
                          : `${p.chipsPlaced ?? 0}/${MAX_CHIPS_PER_PLAYER}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="dm-panel">
            <h3>Enemies</h3>
            <p className="hint-text">
              Pick one, then tap enemy wedges to place its chips.
            </p>
            <ul className="dm-list">
              {npcs.length === 0 && <li className="muted">No enemies yet.</li>}
              {npcs.map((n) => {
                const count = chips.filter((c) => c.npcId === n.id).length;
                return (
                  <li
                    key={n.id}
                    className={
                      'dm-list-row dm-list-row-click' +
                      (selectedNpc === n.id ? ' selected' : '')
                    }
                    onClick={() => setSelectedNpc(selectedNpc === n.id ? null : n.id)}
                  >
                    <span className="dot dot-enemy" />
                    <span className="dm-list-name">{n.name}</span>
                    <span className="muted">{count}/4</span>
                    <button
                      className="btn btn-ghost btn-tiny"
                      onClick={(e) => {
                        e.stopPropagation();
                        socket?.emit(C2S.DM_NPC_REMOVE, { npcId: n.id });
                        if (selectedNpc === n.id) setSelectedNpc(null);
                      }}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="dm-add-row">
              <input
                type="text"
                placeholder="Enemy name"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNpc()}
                maxLength={40}
              />
              <input
                type="number"
                className="npc-count"
                min={1}
                max={20}
                value={npcCount}
                onChange={(e) => setNpcCount(parseInt(e.target.value, 10) || 1)}
              />
              <button className="btn" onClick={addNpc} disabled={!npcName.trim()}>
                Add
              </button>
            </div>

            {previousNpcNames.length > 0 && npcs.length === 0 && (
              <button
                className="btn btn-small"
                onClick={() => socket?.emit(C2S.DM_COPY_PREVIOUS_NPCS)}
              >
                Bring back last combat's {previousNpcNames.length} enemies
              </button>
            )}
          </section>

          <section className="dm-panel">
            <h3>Session</h3>
            <div className="dm-button-row">
              <button className="btn" onClick={() => socket?.emit(C2S.DM_UNDO)}>
                Undo
              </button>
              <button
                className="btn"
                onClick={() => {
                  if (confirm('Clear the wheel and all enemies, back to round 1?')) {
                    socket?.emit(C2S.DM_NEW_COMBAT);
                  }
                }}
              >
                New combat
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (confirm('Kick everyone and wipe the session?')) {
                    socket?.emit(C2S.DM_NEW_SESSION);
                  }
                }}
              >
                New session
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
