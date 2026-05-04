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

interface TurnsRow {
  key: string;
  name: string;
  isNpc: boolean;
  count: number;
  npcTokenId?: number;
}

export default memo(function Queue({ isDm, onRemoveOwn }: Props) {
  const queueOrder = useStore((s) => s.queueOrder);
  const queueById = useStore((s) => s.queueById);
  const playersById = useStore((s) => s.playersById);
  const pendingTokens = useStore((s) => s.pendingTokens);
  const selfPlayerId = useStore((s) => s.self.playerId);
  const roundStarted = useStore((s) => s.roundStarted);
  const socket = getSocket();

  const removeToken = (tokenId: number) => {
    socket?.emit(C2S.DM_TOKEN_REMOVE, { tokenId });
  };

  const completedTokens = queueOrder.filter(id => queueById[id]?.completed);
  const pendingQueueTokens = queueOrder.filter(id => !queueById[id]?.completed);
  const currentTokenId = roundStarted ? (pendingQueueTokens[0] ?? null) : null;
  const currentToken = currentTokenId ? queueById[currentTokenId] : null;
  const upcomingIds = roundStarted ? pendingQueueTokens.slice(1) : pendingQueueTokens;

  const visibleUpcomingForPreRound = !isDm
    ? upcomingIds.filter(id => queueById[id]?.kind !== 'npc')
    : upcomingIds;

  // Turns-remaining table — DM-only mid-round view. Sorted alphabetically so
  // the order doesn't shift as turns are drawn.
  const turnsTable: TurnsRow[] = (() => {
    const rows: TurnsRow[] = [];
    const seenPlayers = new Set<number>();
    const allPending = currentToken ? [currentTokenId!, ...upcomingIds] : pendingQueueTokens;

    for (const id of allPending) {
      const t = queueById[id];
      if (!t) continue;
      if (t.playerId !== null) {
        if (seenPlayers.has(t.playerId)) continue;
        seenPlayers.add(t.playerId);
        const name = playersById[t.playerId]?.displayName ?? 'Unknown';
        const count = allPending.reduce(
          (acc, pid) => acc + (queueById[pid]?.playerId === t.playerId ? 1 : 0),
          0
        );
        rows.push({ key: `p${t.playerId}`, name, isNpc: false, count });
      } else {
        rows.push({ key: `n${t.id}`, name: t.displayName, isNpc: true, count: 1, npcTokenId: t.id });
      }
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  })();

  return (
    <div className="queue">
      {/* Current turn (top) */}
      {currentToken && (
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

      {/* Mid-round turns-remaining table — DM only. Sorted alphabetically and
          stable across turn advances. NPC rows get a Kill button. */}
      {roundStarted && isDm && turnsTable.length > 0 && (
        <>
          <div className="queue-section-label">Turns remaining</div>
          <div className="turns-remaining-table">
            {turnsTable.map((row) => (
              <div key={row.key} className="turns-remaining-row">
                <span className={`turns-remaining-name ${row.isNpc ? 'turns-remaining-npc' : ''}`}>
                  {row.name}
                </span>
                <span className="turns-remaining-count">{row.count}</span>
                {row.isNpc && row.npcTokenId !== undefined && (
                  <button
                    className="btn btn-ghost btn-tiny turns-remaining-kill"
                    onClick={() => removeToken(row.npcTokenId!)}
                  >
                    Kill
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pre-round: full pending list. Players don't see NPC tokens. */}
      {!roundStarted && visibleUpcomingForPreRound.length > 0 && (
        <>
          <div className="queue-section-label">Tokens added ({visibleUpcomingForPreRound.length})</div>
          {visibleUpcomingForPreRound.map((id) => {
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

      {/* Past turns (bottom) */}
      {completedTokens.length > 0 && (
        <>
          <div className="queue-section-label">Past turns</div>
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
        </>
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
