import { useState } from 'react';
import { useStore } from '../store';
import { getSocket } from '../socket';
import { C2S } from '../shared/types';
import ReactionBoxEditor from '../components/ReactionBoxEditor';
import Queue from '../components/Queue';

interface Props {
  onLeave: () => void;
}

export default function DmView({ onLeave }: Props) {
  const boxOrder = useStore((s) => s.boxOrder);
  const roundEnded = useStore((s) => s.roundEnded);
  const currentTurn = useStore((s) => s.currentTurn);
  const playersById = useStore((s) => s.playersById);
  const players = Object.values(playersById);
  const [npcName, setNpcName] = useState('');
  const [npcCount, setNpcCount] = useState(1);
  const [addForPlayerId, setAddForPlayerId] = useState<number | null>(null);
  const [addForKind, setAddForKind] = useState<string>('main');

  const socket = getSocket();

  const addBox = () => {
    socket?.emit(C2S.DM_BOX_CREATE, { label: `Box ${boxOrder.length + 1}` });
  };

  const addNpc = () => {
    if (!npcName.trim()) return;
    socket?.emit(C2S.DM_TOKEN_ADD_NPC, { name: npcName.trim(), count: npcCount });
    setNpcName('');
    setNpcCount(1);
  };

  const advance = () => {
    socket?.emit(C2S.DM_ADVANCE, {});
  };

  const handleEndRound = () => {
    if (confirm('End round? This will reroll reaction values < 10 and reset all token budgets.')) {
      socket?.emit(C2S.DM_END_ROUND, {});
    }
  };

  const handleUndo = () => {
    socket?.emit(C2S.DM_UNDO, {});
  };

  const handleAddForPlayer = () => {
    if (addForPlayerId === null) return;
    socket?.emit(C2S.DM_TOKEN_ADD_FOR_PLAYER, {
      playerId: addForPlayerId,
      kind: addForKind,
    });
  };

  return (
    <div className="dm-view">
      <div className="dm-header">
        <h2>DM Control Panel — Turn {currentTurn}</h2>
        <div className="dm-header-actions">
          <button className="btn btn-ghost" onClick={handleUndo}>Undo</button>
          <button className="btn btn-ghost btn-small" onClick={onLeave}>Leave</button>
        </div>
      </div>

      <div className="dm-layout">
        <div className="dm-left">
          <div className="section-header">
            <h3>Reaction Boxes</h3>
            <button className="btn btn-small" onClick={addBox}>+ Add Box</button>
          </div>
          <div className="boxes-grid">
            {boxOrder.map((id) => (
              <ReactionBoxEditor key={id} boxId={id} />
            ))}
            {boxOrder.length === 0 && <p className="empty-hint">No reaction boxes yet. Add one to get started.</p>}
          </div>
        </div>

        <div className="dm-right">
          <div className="section-header">
            <h3>Initiative Queue</h3>
            <button className="btn btn-primary" onClick={advance}>Advance &gt;</button>
          </div>

          {roundEnded && (
            <div className="end-round-banner">
              <p>Queue is empty — round complete!</p>
              <button className="btn btn-danger btn-large" onClick={handleEndRound}>
                End Round & Reroll
              </button>
            </div>
          )}

          <Queue isDm={true} />

          <div className="add-section">
            <h4>Add NPC Tokens</h4>
            <div className="add-npc-form">
              <input
                type="text"
                placeholder="NPC name"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addNpc()}
                maxLength={40}
                autoCapitalize="off"
                autoCorrect="off"
              />
              <input
                type="number"
                min={1}
                max={20}
                value={npcCount}
                onChange={(e) => setNpcCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                inputMode="numeric"
                className="count-input"
              />
              <button className="btn" onClick={addNpc} disabled={!npcName.trim()}>Add</button>
            </div>
          </div>

          {players.length > 0 && (
            <div className="add-section">
              <h4>Add Token for Player</h4>
              <div className="add-for-player-form">
                <select
                  value={addForPlayerId ?? ''}
                  onChange={(e) => setAddForPlayerId(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
                <select value={addForKind} onChange={(e) => setAddForKind(e.target.value)}>
                  <option value="main">Main</option>
                  <option value="bonus">Bonus</option>
                  <option value="reaction">Reaction</option>
                  <option value="held">Held</option>
                  <option value="custom">Custom</option>
                </select>
                <button className="btn" onClick={handleAddForPlayer} disabled={addForPlayerId === null}>
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
