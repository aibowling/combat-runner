import { useState } from 'react';
import { useStore } from '../store';
import { getSocket } from '../socket';
import { C2S, MAX_MAIN_TOKENS, MAX_CUSTOM_TOKENS } from '../shared/types';
import ReactionBox from '../components/ReactionBox';
import Queue from '../components/Queue';

interface Props {
  onLeave: () => void;
}

export default function PlayerView({ onLeave }: Props) {
  const boxOrder = useStore((s) => s.boxOrder);
  const boxesById = useStore((s) => s.boxesById);
  const currentTurn = useStore((s) => s.currentTurn);
  const roundStarted = useStore((s) => s.roundStarted);
  const queueOrder = useStore((s) => s.queueOrder);
  const queueById = useStore((s) => s.queueById);
  const self = useStore((s) => s.self);
  const optimisticMainUsed = useStore((s) => s.optimisticMainUsed);
  const optimisticCustomUsed = useStore((s) => s.optimisticCustomUsed);
  const pendingTokens = useStore((s) => s.pendingTokens);
  const [customName, setCustomName] = useState('');

  const socket = getSocket();

  const myTokensInQueue = queueOrder.filter((id) => queueById[id]?.playerId === self.playerId);
  const myActiveTokens = myTokensInQueue.filter(id => !queueById[id]?.completed);
  const allMyTokensDrawn = roundStarted && myTokensInQueue.length > 0 && myActiveTokens.length === 0;

  const addMain = () => {
    if (optimisticMainUsed >= MAX_MAIN_TOKENS) return;
    const tempId = `pending-${Date.now()}-${Math.random()}`;
    useStore.getState().addPendingToken({
      tempId, kind: 'main', displayName: 'main (pending...)',
    }, 'main');
    socket?.emit(C2S.PLAYER_TOKEN_ADD, { kind: 'main' });
  };

  const addBonus = () => {
    const tempId = `pending-${Date.now()}-${Math.random()}`;
    useStore.getState().addPendingToken({
      tempId, kind: 'bonus', displayName: 'bonus (pending...)',
    }, 'bonus');
    socket?.emit(C2S.PLAYER_TOKEN_ADD, { kind: 'bonus' });
  };

  const addCustomToken = () => {
    if (!customName.trim() || optimisticCustomUsed >= MAX_CUSTOM_TOKENS) return;
    const tempId = `pending-${Date.now()}-${Math.random()}`;
    useStore.getState().addPendingToken({
      tempId, kind: 'custom', displayName: customName.trim(),
    }, 'custom');
    socket?.emit(C2S.PLAYER_TOKEN_ADD, { kind: 'custom', name: customName.trim() });
    setCustomName('');
  };

  const removeMyToken = (tokenId: number) => {
    socket?.emit(C2S.PLAYER_TOKEN_REMOVE, { tokenId });
  };

  return (
    <div className="player-view">
      <div className="player-header">
        <h2>Turn {currentTurn}</h2>
        <span className="token-count">
          {myActiveTokens.length + pendingTokens.length} token{myActiveTokens.length + pendingTokens.length !== 1 ? 's' : ''} remaining
        </span>
        <button className="btn btn-ghost btn-small" onClick={onLeave}>Leave</button>
      </div>

      {allMyTokensDrawn && (
        <div className="out-of-actions-banner">
          You're out of actions for this round!
        </div>
      )}

      {boxOrder.length > 0 && (
        <div className="boxes-row">
          {boxOrder.map((id) => (
            <ReactionBox key={id} box={boxesById[id]} />
          ))}
        </div>
      )}

      <div className="player-queue-section">
        <h3>Initiative Queue</h3>
        <Queue isDm={false} onRemoveOwn={removeMyToken} />
      </div>

      {!roundStarted && (
        <div className="player-actions">
          <div className="action-buttons action-buttons-2col">
            <button
              className="btn btn-primary action-btn"
              onClick={addMain}
              disabled={optimisticMainUsed >= MAX_MAIN_TOKENS}
            >
              Main Action
              <span className="counter">{optimisticMainUsed}/{MAX_MAIN_TOKENS}</span>
            </button>
            <button
              className="btn action-btn"
              onClick={addBonus}
            >
              Bonus
              <span className="counter">unlimited</span>
            </button>
          </div>

          <div className="custom-token-row">
            <input
              type="text"
              placeholder="Custom token name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomToken()}
              disabled={optimisticCustomUsed >= MAX_CUSTOM_TOKENS}
              maxLength={40}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              className="btn"
              onClick={addCustomToken}
              disabled={!customName.trim() || optimisticCustomUsed >= MAX_CUSTOM_TOKENS}
            >
              + Custom ({optimisticCustomUsed}/{MAX_CUSTOM_TOKENS})
            </button>
          </div>
        </div>
      )}

      {roundStarted && !allMyTokensDrawn && (
        <div className="player-actions">
          <p className="waiting-text">Round in progress — waiting for your turn...</p>
        </div>
      )}
    </div>
  );
}
