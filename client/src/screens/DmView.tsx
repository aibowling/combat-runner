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
  const roundStarted = useStore((s) => s.roundStarted);
  const currentTurn = useStore((s) => s.currentTurn);
  const playersById = useStore((s) => s.playersById);
  const players = Object.values(playersById);
  const queueOrder = useStore((s) => s.queueOrder);
  const queueById = useStore((s) => s.queueById);
  const previousNpcNames = useStore((s) => s.previousNpcNames);
  const [npcName, setNpcName] = useState('');
  const [npcCount, setNpcCount] = useState<string>('1');
  const [addForPlayerId, setAddForPlayerId] = useState<number | null>(null);
  const [addForKind, setAddForKind] = useState<'main' | 'bonus' | 'custom'>('main');

  const socket = getSocket();

  const hasPendingTokens = queueOrder.some(id => !queueById[id]?.completed);
  const parsedNpcCount = parseInt(npcCount, 10);
  const npcCountValid = !isNaN(parsedNpcCount) && parsedNpcCount >= 1 && parsedNpcCount <= 20;
  const canAddNpc = npcName.trim().length > 0 && npcCountValid;

  const addBox = () => {
    socket?.emit(C2S.DM_BOX_CREATE, { label: `Box ${boxOrder.length + 1}` });
  };

  const addNpc = () => {
    if (!canAddNpc) return;
    socket?.emit(C2S.DM_TOKEN_ADD_NPC, { name: npcName.trim(), count: parsedNpcCount });
    setNpcName('');
    setNpcCount('1');
  };

  const advance = () => {
    socket?.emit(C2S.DM_ADVANCE, {});
  };

  const handleStartRound = () => {
    socket?.emit(C2S.DM_START_ROUND, {});
  };

  const handleEndRound = () => {
    if (confirm('End round? This will reroll reaction values < 10 and reset all token budgets.')) {
      socket?.emit(C2S.DM_END_ROUND, {});
    }
  };

  const handleNewCombat = () => {
    if (confirm('Start new combat? This will clear ALL tokens, reaction boxes, and reset everything.')) {
      socket?.emit(C2S.DM_NEW_COMBAT, {});
    }
  };

  const handleCopyPreviousNpcs = () => {
    socket?.emit(C2S.DM_COPY_PREVIOUS_NPCS, {});
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
          <button className="btn btn-danger btn-small" onClick={handleNewCombat}>New Combat</button>
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
            <div className="header-buttons">
              {!roundStarted && hasPendingTokens && (
                <button className="btn btn-primary" onClick={handleStartRound}>Start Round</button>
              )}
              {roundStarted && hasPendingTokens && (
                <button className="btn btn-primary" onClick={advance}>Advance &gt;</button>
              )}
            </div>
          </div>

          {roundEnded && (
            <div className="end-round-banner">
              <p>All tokens drawn — round complete!</p>
              <button className="btn btn-danger btn-large" onClick={handleEndRound}>
                End Round & Reroll
              </button>
            </div>
          )}

          <Queue isDm={true} />

          <div className="add-section">
            <div className="add-section-header">
              <h4>Add NPC Tokens</h4>
              {previousNpcNames.length > 0 && !roundStarted && (
                <button className="btn btn-small" onClick={handleCopyPreviousNpcs}>
                  Copy Previous NPCs ({previousNpcNames.length})
                </button>
              )}
            </div>
            <div className="add-npc-form">
              <input
                type="text"
                placeholder="NPC name"
                value={npcName}
                onChange={(e) => setNpcName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canAddNpc && addNpc()}
                maxLength={40}
                autoCapitalize="off"
                autoCorrect="off"
                className="npc-name-input"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={npcCount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || /^\d+$/.test(v)) setNpcCount(v);
                }}
                placeholder="#"
                className="npc-count-input"
              />
              <button className="btn" onClick={addNpc} disabled={!canAddNpc}>Add</button>
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
                <select value={addForKind} onChange={(e) => setAddForKind(e.target.value as any)}>
                  <option value="main">Main</option>
                  <option value="bonus">Bonus</option>
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
