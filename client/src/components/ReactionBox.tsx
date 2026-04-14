import { memo } from 'react';
import type { ReactionBox as RBType } from '../shared/types';

interface Props {
  box: RBType;
}

export default memo(function ReactionBox({ box }: Props) {
  if (!box) return null;
  const bonus = box.bonus ?? 0;
  const displayValues = box.values.map(v => v + bonus);
  const maxVal = displayValues.length > 0 ? Math.max(...displayValues) : null;

  return (
    <div className="reaction-box">
      <div className="box-label">{box.label}</div>
      <div className="box-values">
        {displayValues.map((v, i) => (
          <span
            key={i}
            className={`box-value ${v === maxVal ? 'box-value-max' : ''}`}
          >
            {v}
          </span>
        ))}
        {box.armor !== null && box.armor !== undefined && (
          <span className="box-armor" title="Armor">
            AC {box.armor}
          </span>
        )}
        {displayValues.length === 0 && box.armor === null && <span className="box-empty">—</span>}
      </div>
      {box.previousValues.length > 0 && (
        <div className="box-previous">
          prev: {box.previousValues.map(v => v + bonus).join(', ')}
        </div>
      )}
    </div>
  );
});
