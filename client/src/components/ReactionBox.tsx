import { memo } from 'react';
import type { ReactionBox as ReactionBoxType } from '../shared/types';

interface Props {
  box: ReactionBoxType;
}

/** Read-only face of a reaction box — what players see. */
export default memo(function ReactionBox({ box }: Props) {
  if (!box) return null;

  const bonus = box.bonus ?? 0;
  const values = box.values.map((v) => v + bonus);
  const best = values.length ? Math.max(...values) : null;

  return (
    <div className="reaction-box">
      <div className="box-label">{box.label}</div>
      <div className="box-values">
        {values.map((v, i) => (
          <span key={i} className={'box-value' + (v === best ? ' box-value-max' : '')}>
            {v}
          </span>
        ))}
        {box.armor != null && (
          <span className="box-armor" title="Armor">
            AC {box.armor}
          </span>
        )}
        {values.length === 0 && box.armor == null && <span className="box-empty">—</span>}
      </div>
      {box.previousValues.length > 0 && (
        <div className="box-previous">
          prev: {box.previousValues.map((v) => v + bonus).join(', ')}
        </div>
      )}
    </div>
  );
});
