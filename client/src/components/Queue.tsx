import { memo } from 'react';
import { useStore } from '../store';
import { getSocket } from '../socket';
import { C2S } from '../shared/types';

interface Props {
  isDm: boolean;
  onRemoveOwn?: (tokenId: number) => void;
}

const KIND_LABELS: Record<string, string> = {
  main: 'Main',
  custom: 'Custom',
  bonus: 'Bonus',
  reaction: 'Reaction',
  held: 'Held',
  npc: 'NPC',
};

export default memo(function Queue({ isDm, onRemoveOwn }: Props) {
  const queueOrder = useStore((s) => s.queueOrder);
  const queueById = useStore((s) => s.queueById);
  const pendingTokens = useStore((s) => s.pendingTokens);
  const selfPlayerId = useStore((s) => s.self.playerId);
  const roundStarted = useStore((s) => s.roundStarted);
  const socket = getSocket();

  const removeToken = (tokenId: number) => {
    socket?.emit(C2S.DM_TOKEN_REMOVE, { tokenId });
  };

  const completedTokens = queueOrder.filter(id => queueById[id]?.completed);
  const pendingQueueTokens = queueOrder.filter(id => !queueById[id]?.completed);
  const currentTokenId = pendingQueueTokens[0] ?? null;
  const currentToken = currentTokenId ? queueById[currentTokenId] : null;

  return (
    <div className="queue">
      {/* Past turns */}
      {completedTokens.length > 0 && (
        <div className="queue-section-label">Past turns</div>
      )}
      {completedTokens.map((id) => {
        const token = queueById[id];
        if (!token) return null;
        return (
          <div key={id} className="queue-token queue-token-completed">
            <span className="token-kind-badge">{KIND_LABELS[token.kind] || token.kind}</span>
            <span className="token-name">{token.displayName}</span>
          </div>
        );
      })}

      {/* Current turn */}
      {currentToken && roundStarted && (
        <>
          <div className="queue-section-label">Current turn</div>
          <div className="queue-token queue-token-active">
            <span className="token-kind-badge">{KIND_LABELS[currentToken.kind] || currentToken.kind}</span>
            <span className="token-name">{currentToken.displayName}</span>
            {isDm && (
              <button className="btn btn-ghost btn-tiny token-remove" onClick={() => removeToken(currentTokenId!)}>×</button>
            )}
          </div>
        </>
      )}

      {/* Upcoming — DM only, before round starts show all pending */}
      {!roundStarted && pendingQueueTokens.length > 0 && (
        <>
          <div className="queue-section-label">Tokens added ({pendingQueueTokens.length})</div>
          {pendingQueueTokens.map((id) => {
            const token = queueById[id];
            if (!token) return null;
            const isOwn = token.playerId === selfPlayerId && selfPlayerId != null;
            return (
              <div key={id} className={`queue-token ${token.kind === 'npc' ? 'queue-token-npc' : ''}`}>
                <span className="token-kind-badge">{KIND_LABELS[token.kind] || token.kind}</span>
                <span className="token-name">{token.displayName}</span>
                {isDm && (
                  <button className="btn btn-ghost btn-tiny token-remove" onClick={() => removeToken(id)}>×</button>
                )}
                {!isDm && isOwn && onRemoveOwn && (
                  <button className="btn btn-ghost btn-tiny token-remove" onClick={() => onRemoveOwn(id)}>×</button>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* After round started, show remaining count for non-DM */}
      {roundStarted && pendingQueueTokens.length > 1 && !isDm && (
        <div className="queue-remaining">{pendingQueueTokens.length - 1} more turn{pendingQueueTokens.length - 1 !== 1 ? 's' : ''} remaining</div>
      )}

      {/* DM sees remaining count too */}
      {roundStarted && pendingQueueTokens.length > 1 && isDm && (
        <div className="queue-remaining">{pendingQueueTokens.length - 1} more in queue</div>
      )}

      {pendingTokens.map((pt) => (
        <div key={pt.tempId} className="queue-token queue-token-pending">
          <span className="token-kind-badge">{KIND_LABELS[pt.kind] || pt.kind}</span>
          <span className="token-name">{pt.displayName}</span>
          <span className="pending-indicator">...</span>
        </div>
      ))}

      {queueOrder.length === 0 && pendingTokens.length === 0 && (
        <p className="empty-hint">No tokens yet</p>
      )}
    </div>
  );
});
