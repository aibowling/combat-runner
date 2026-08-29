import { useState, useEffect, memo } from 'react';
import { useStore } from '../store';
import { getSocket } from '../socket';
import { C2S, MAX_BOX_VALUES, MAX_NAME_LENGTH, REACTION_DIE, rollReaction } from '../shared/types';

interface Props {
  boxId: number;
}

export default memo(function ReactionBoxEditor({ boxId }: Props) {
  const box = useStore((s) => s.boxesById[boxId]);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const [bonusStr, setBonusStr] = useState('');
  const [armorStr, setArmorStr] = useState('');
  const socket = getSocket();

  useEffect(() => {
    if (!box) return;
    setBonusStr(box.bonus == null ? '' : String(box.bonus));
    setArmorStr(box.armor == null ? '' : String(box.armor));
  }, [box?.bonus, box?.armor]);

  if (!box) return null;

  const best = box.values.length ? Math.max(...box.values) : null;
  const emit = (patch: Record<string, unknown>) =>
    socket?.emit(C2S.DM_BOX_UPDATE, { boxId, ...patch });

  /**
   * Dice are nudged and rerolled constantly, and waiting on the server round
   * trip for each one felt sluggish. Paint the new value at once; the
   * broadcast that follows agrees with it.
   */
  const setValues = (values: number[]) => {
    useStore.getState().setBoxValues(boxId, values);
    emit({ values });
  };

  const saveLabel = () => {
    const clean = label.trim();
    if (clean && clean !== box.label) emit({ label: clean });
    setEditing(false);
  };

  const addValue = () => setValues([...box.values, rollReaction()]);
  const removeValue = (i: number) => setValues(box.values.filter((_, k) => k !== i));

  const adjustValue = (i: number, delta: number) => {
    const next = [...box.values];
    next[i] = Math.max(1, Math.min(REACTION_DIE, next[i] + delta));
    setValues(next);
  };

  /** A reroll is an attempt to improve, so it never hands back a worse die. */
  const rerollValue = (i: number) => {
    const next = [...box.values];
    next[i] = Math.max(next[i], rollReaction());
    setValues(next);
  };

  const saveNumber = (raw: string, key: 'bonus' | 'armor') => {
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '-') {
      emit({ [key]: null });
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed)) emit({ [key]: parsed });
  };

  return (
    <div className="reaction-box reaction-box-editor">
      <div className="box-header">
        {editing ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={saveLabel}
            onKeyDown={(e) => e.key === 'Enter' && saveLabel()}
            autoFocus
            maxLength={MAX_NAME_LENGTH}
          />
        ) : (
          <div
            className="box-label clickable"
            onClick={() => {
              setLabel(box.label);
              setEditing(true);
            }}
          >
            {box.label}
          </div>
        )}
        <button
          className="btn btn-ghost btn-tiny"
          title="Delete box"
          onClick={() => {
            if (confirm(`Delete "${box.label}"?`)) socket?.emit(C2S.DM_BOX_DELETE, { boxId });
          }}
        >
          ×
        </button>
      </div>

      <div className="box-values-edit">
        {box.values.map((v, i) => (
          <div key={i} className={'value-chip' + (v === best ? ' value-chip-max' : '')}>
            <button className="adj-btn" onClick={() => adjustValue(i, -1)} aria-label="Lower">
              −
            </button>
            <button
              type="button"
              className="value-num value-num-reroll"
              onClick={() => rerollValue(i)}
              title="Click to reroll"
              aria-label={`Reroll ${v}`}
            >
              <span className="value-num-text">{v}</span>
              <span className="value-num-hint">reroll</span>
            </button>
            <button className="adj-btn" onClick={() => adjustValue(i, 1)} aria-label="Raise">
              +
            </button>
            <button
              className="adj-btn remove-btn"
              onClick={() => removeValue(i)}
              aria-label="Remove die"
            >
              ×
            </button>
          </div>
        ))}
        {box.values.length < MAX_BOX_VALUES && (
          <button className="btn btn-small add-value-btn" onClick={addValue}>
            + d{REACTION_DIE}
          </button>
        )}
      </div>

      <div className="box-meta-row">
        <label className="box-meta-field">
          <span className="box-meta-label">Bonus</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="—"
            value={bonusStr}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || v === '-' || /^-?\d{1,2}$/.test(v)) setBonusStr(v);
            }}
            onBlur={() => saveNumber(bonusStr, 'bonus')}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="box-meta-input"
          />
        </label>
        <label className="box-meta-field">
          <span className="box-meta-label">Armor</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="—"
            value={armorStr}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || /^\d{1,2}$/.test(v)) setArmorStr(v);
            }}
            onBlur={() => saveNumber(armorStr, 'armor')}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className="box-meta-input"
          />
        </label>
      </div>

      {box.previousValues.length > 0 && (
        <div className="box-previous">prev: {box.previousValues.join(', ')}</div>
      )}
    </div>
  );
});
