import { useState, memo } from 'react';
import { useStore } from '../store';
import { getSocket } from '../socket';
import { C2S } from '@shared/types';

interface Props {
  boxId: number;
}

export default memo(function ReactionBoxEditor({ boxId }: Props) {
  const box = useStore((s) => s.boxesById[boxId]);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState('');
  const socket = getSocket();

  if (!box) return null;

  const maxVal = box.values.length > 0 ? Math.max(...box.values) : null;

  const startEdit = () => {
    setLabel(box.label);
    setEditing(true);
  };

  const saveLabel = () => {
    if (label.trim() && label.trim() !== box.label) {
      socket?.emit(C2S.DM_BOX_UPDATE, { boxId, label: label.trim() });
    }
    setEditing(false);
  };

  const addValue = () => {
    const newVal = Math.floor(Math.random() * 20) + 1;
    socket?.emit(C2S.DM_BOX_UPDATE, { boxId, values: [...box.values, newVal] });
  };

  const removeValue = (index: number) => {
    const newValues = box.values.filter((_, i) => i !== index);
    socket?.emit(C2S.DM_BOX_UPDATE, { boxId, values: newValues });
  };

  const adjustValue = (index: number, delta: number) => {
    const newValues = [...box.values];
    newValues[index] = Math.max(1, Math.min(99, newValues[index] + delta));
    socket?.emit(C2S.DM_BOX_UPDATE, { boxId, values: newValues });
  };

  const deleteBox = () => {
    if (confirm(`Delete "${box.label}"?`)) {
      socket?.emit(C2S.DM_BOX_DELETE, { boxId });
    }
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
            maxLength={40}
          />
        ) : (
          <div className="box-label clickable" onClick={startEdit}>{box.label}</div>
        )}
        <button className="btn btn-ghost btn-tiny" onClick={deleteBox}>×</button>
      </div>

      <div className="box-values-edit">
        {box.values.map((v, i) => (
          <div key={i} className={`value-chip ${v === maxVal ? 'value-chip-max' : ''}`}>
            <button className="adj-btn" onClick={() => adjustValue(i, -1)}>−</button>
            <span className="value-num">{v}</span>
            <button className="adj-btn" onClick={() => adjustValue(i, 1)}>+</button>
            <button className="adj-btn remove-btn" onClick={() => removeValue(i)}>×</button>
          </div>
        ))}
        <button className="btn btn-small add-value-btn" onClick={addValue}>+ Value</button>
      </div>

      {box.previousValues.length > 0 && (
        <div className="box-previous">
          prev: {box.previousValues.join(', ')}
        </div>
      )}
    </div>
  );
});
