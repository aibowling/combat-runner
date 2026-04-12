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
  const socket = getSocket();

  const removeToken = (tokenId: number) => {
    socket?.emit(C2S.DM_TOKEN_REMOVE, { tokenId });
  };

  return (
    <div className="queue">
      {queueOrder.length === 0 && pendingTokens.length === 0 && (
        <p className="empty-hint">Queue is empty</p>
      )}
      {queueOrder.map((id, index) => {
        const token = queueById[id];
        if (!token) return null;
        const isTop = index === 0;
        const isOwn = token.playerId === selfPlayerId && selfPlayerId != null;

        return (
          <div key={id} className={`queue-token ${isTop ? 'queue-token-active' : ''} ${token.kind === 'npc' ? 'queue-token-npc' : ''}`}>
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
      {pendingTokens.map((pt) => (
        <div key={pt.tempId} className="queue-token queue-token-pending">
          <span className="token-kind-badge">{KIND_LABELS[pt.kind] || pt.kind}</span>
          <span className="token-name">{pt.displayName}</span>
          <span className="pending-indicator">...</span>
        </div>
      ))}
    </div>
  );
});
