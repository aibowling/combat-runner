import { memo } from 'react';
import type { ReactionBox as RBType } from '../shared/types';

interface Props {
  box: RBType;
}

export default memo(function ReactionBox({ box }: Props) {
  if (!box) return null;
  const maxVal = box.values.length > 0 ? Math.max(...box.values) : null;

  return (
    <div className="reaction-box">
      <div className="box-label">{box.label}</div>
      <div className="box-values">
        {box.values.map((v, i) => (
          <span
            key={i}
            className={`box-value ${v === maxVal ? 'box-value-max' : ''}`}
          >
            {v}
          </span>
        ))}
        {box.values.length === 0 && <span className="box-empty">—</span>}
      </div>
      {box.previousValues.length > 0 && (
        <div className="box-previous">
          prev: {box.previousValues.join(', ')}
        </div>
      )}
    </div>
  );
});
