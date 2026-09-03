import { useState, useEffect, memo } from 'react';
import { getSocket } from '../socket';
import { C2S, MAX_HP, type Npc } from '../shared/types';

interface Props {
  npc: Npc;
  chipCount: number;
  canDrop: boolean;
  onDrop: () => void;
  onUndrop: () => void;
  onRemove: () => void;
}

/**
 * One enemy on the DM's screen. Tapping the name drops a chip on the clock —
 * tap twice for two — and hit points live here and nowhere else.
 */
export default memo(function EnemyRow({
  npc,
  chipCount,
  canDrop,
  onDrop,
  onUndrop,
  onRemove,
}: Props) {
  const socket = getSocket();
  const [hpStr, setHpStr] = useState('');
  const [maxStr, setMaxStr] = useState('');

  useEffect(() => {
    setHpStr(npc.hp == null ? '' : String(npc.hp));
  }, [npc.hp]);

  useEffect(() => {
    setMaxStr(npc.maxHp == null ? '' : String(npc.maxHp));
  }, [npc.maxHp]);

  const save = (raw: string, key: 'hp' | 'maxHp') => {
    const trimmed = raw.trim();
    const value = trimmed === '' ? null : parseInt(trimmed, 10);
    if (trimmed !== '' && Number.isNaN(value)) return;
    socket?.emit(C2S.DM_NPC_SET_HP, { npcId: npc.id, [key]: value });
  };

  const nudge = (delta: number) => {
    const base = npc.hp ?? npc.maxHp ?? 0;
    const next = Math.max(0, Math.min(MAX_HP, base + delta));
    setHpStr(String(next));
    socket?.emit(C2S.DM_NPC_SET_HP, { npcId: npc.id, hp: next });
  };

  const ratio =
    npc.hp != null && npc.maxHp != null && npc.maxHp > 0
      ? Math.max(0, Math.min(1, npc.hp / npc.maxHp))
      : null;
  const down = npc.hp != null && npc.hp <= 0;

  return (
    <li className={'actor-row' + (down ? ' actor-down' : '')}>
      <div className="actor-top">
        <button
          className="actor-drop"
          onClick={onDrop}
          disabled={!canDrop}
          title={canDrop ? 'Drop a chip on the clock' : 'Every enemy wedge already has one'}
        >
          <span className="dot dot-enemy" />
          <span className="actor-name">{npc.name}</span>
          <span className="actor-chips">{chipCount}</span>
        </button>
        <button
          className="btn btn-ghost btn-tiny"
          onClick={onUndrop}
          disabled={chipCount === 0}
          title="Take back a chip"
        >
          −
        </button>
        <button className="btn btn-ghost btn-tiny" onClick={onRemove} title="Remove enemy">
          ×
        </button>
      </div>

      <div className="enemy-hp">
        <button className="adj-btn" onClick={() => nudge(-1)} aria-label="Damage 1">
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="hp-input"
          aria-label={`${npc.name} current hit points`}
          value={hpStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d{1,3}$/.test(v)) setHpStr(v);
          }}
          onBlur={() => save(hpStr, 'hp')}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <span className="hp-slash">/</span>
        <input
          type="text"
          inputMode="numeric"
          className="hp-input"
          aria-label={`${npc.name} maximum hit points`}
          placeholder="—"
          value={maxStr}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^\d{1,3}$/.test(v)) setMaxStr(v);
          }}
          onBlur={() => save(maxStr, 'maxHp')}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
        <button className="adj-btn" onClick={() => nudge(1)} aria-label="Heal 1">
          +
        </button>

        {ratio != null && (
          <div className="hp-bar" aria-hidden="true">
            <div className="hp-bar-fill" style={{ width: `${ratio * 100}%` }} />
          </div>
        )}
        {down && <span className="enemy-down-tag">down</span>}
      </div>
    </li>
  );
});
