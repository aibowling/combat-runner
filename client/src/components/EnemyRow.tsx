import { useState, useEffect, memo } from 'react';
import { getSocket } from '../socket';
import { C2S, MAX_HP, type Npc } from '../shared/types';

interface Props {
  npc: Npc;
  chipCount: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

/** One enemy on the DM's screen: name, hit points, and its chips on the clock. */
export default memo(function EnemyRow({
  npc,
  chipCount,
  selected,
  onSelect,
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

  const hp = npc.hp;
  const max = npc.maxHp;
  const ratio = hp != null && max != null && max > 0 ? Math.max(0, Math.min(1, hp / max)) : null;
  const down = hp != null && hp <= 0;

  return (
    <li className={'enemy-row' + (selected ? ' selected' : '') + (down ? ' enemy-down' : '')}>
      <div className="enemy-top" onClick={onSelect}>
        <span className="dot dot-enemy" />
        <span className="enemy-name">{npc.name}</span>
        <span className="muted enemy-chips">{chipCount}/4</span>
        <button
          className="btn btn-ghost btn-tiny"
          title="Remove enemy"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
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
