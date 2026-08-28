import { WHEEL, wedgeType, type Chip, type WedgeType } from '../shared/types';
import { playerColor } from '../store';

interface Props {
  chips: Chip[];
  currentWedge: number | null;
  entryWedge: number | null;
  /** wedges the viewer may click; everything else dims */
  liveWedges?: number[];
  onWedgeClick?: (wedge: number) => void;
  /** chips this viewer owns, drawn with a ring so they stand out */
  ownPlayerId?: number;
  hiddenChipCount?: number;
}

const FILL: Record<WedgeType, string> = {
  player: '#e6dfd1',
  enemy: '#8c302b',
  status: '#4e8a7c',
  environment: '#4e8a7c',
};

const CX = 200;
const CY = 200;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function wedgePath(i: number, rIn: number, rOut: number): string {
  const a0 = i * 36;
  const a1 = (i + 1) * 36;
  const [x0, y0] = polar(rOut, a0);
  const [x1, y1] = polar(rOut, a1);
  const [x2, y2] = polar(rIn, a1);
  const [x3, y3] = polar(rIn, a0);
  return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
}

export default function Wheel({
  chips,
  currentWedge,
  entryWedge,
  liveWedges,
  onWedgeClick,
  ownPlayerId,
  hiddenChipCount = 0,
}: Props) {
  const pointerWedge = currentWedge ?? entryWedge;

  return (
    <div className="wheel">
      <svg viewBox="0 0 400 400" role="img" aria-label="Initiative wheel">
        <circle cx={CX} cy={CY} r={192} className="wheel-rim" />

        {WHEEL.map((w, i) => {
          const onWedge = chips.filter((c) => c.wedge === w.wedge);
          const isCurrent = currentWedge === w.wedge;
          const live = !!liveWedges?.includes(w.wedge);
          const dim = !!liveWedges && !live && !isCurrent;
          const type = wedgeType(w.wedge);

          return (
            <g key={w.wedge}>
              <path
                d={wedgePath(i, 74, 178)}
                fill={FILL[type]}
                className={
                  'wedge' +
                  (live ? ' wedge-live' : '') +
                  (dim ? ' wedge-dim' : '') +
                  (isCurrent ? ' wedge-current' : '')
                }
                onClick={live && onWedgeClick ? () => onWedgeClick(w.wedge) : undefined}
                role={live ? 'button' : undefined}
                tabIndex={live ? 0 : undefined}
                aria-label={live ? `Wedge ${w.wedge}` : undefined}
                onKeyDown={
                  live && onWedgeClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onWedgeClick(w.wedge);
                        }
                      }
                    : undefined
                }
              />

              {(() => {
                const [x, y] = polar(163, i * 36 + 18);
                return (
                  <text x={x} y={y + 4} className="wedge-num" textAnchor="middle">
                    {w.wedge}
                  </text>
                );
              })()}

              {(type === 'status' || type === 'environment') &&
                (() => {
                  const [x, y] = polar(120, i * 36 + 18);
                  return (
                    <text x={x} y={y + 3} className="wedge-special" textAnchor="middle">
                      {type === 'status' ? 'STATUS' : 'ENVIRON'}
                    </text>
                  );
                })()}

              {onWedge.slice(0, 6).map((c, k, arr) => {
                const deg = i * 36 + 18 + (k - (arr.length - 1) / 2) * 8.5;
                const [cx, cy] = polar(122, deg);
                const isEnemy = c.actorKind === 'npc';
                const mine = ownPlayerId != null && c.playerId === ownPlayerId;
                return (
                  <g
                    key={c.id}
                    className={'chip' + (c.resolved ? ' chip-resolved' : '')}
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={11}
                      fill={isEnemy ? '#1a1012' : playerColor(c.playerId ?? 0)}
                      stroke={mine ? '#ffffff' : isEnemy ? '#e6dfd1' : '#101a20'}
                      strokeWidth={mine ? 2.4 : 1.4}
                    />
                    <text
                      x={cx}
                      y={cy + 3.5}
                      className="chip-letter"
                      textAnchor="middle"
                      fill={isEnemy ? '#e6dfd1' : '#101a20'}
                    >
                      {c.displayName.slice(0, 1).toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}

        <circle cx={CX} cy={CY} r={72} className="wheel-hub" />

        {pointerWedge == null ? (
          <>
            <text x={CX} y={194} className="hub-small" textAnchor="middle">
              ENTRY
            </text>
            <text x={CX} y={224} className="hub-big hub-big-empty" textAnchor="middle">
              —
            </text>
          </>
        ) : (
          <>
            <text x={CX} y={184} className="hub-small" textAnchor="middle">
              {currentWedge ? 'NOW' : 'ENTRY'}
            </text>
            <text x={CX} y={220} className="hub-big" textAnchor="middle">
              {pointerWedge}
            </text>
          </>
        )}

        {hiddenChipCount > 0 && (
          <text x={CX} y={244} className="hub-small" textAnchor="middle">
            {hiddenChipCount} HIDDEN
          </text>
        )}

        {pointerWedge != null && (
          <g
            className="wheel-pointer"
            transform={`rotate(${(pointerWedge - 1) * 36 + 18} ${CX} ${CY})`}
          >
            <path d={`M${CX},8 L${CX + 7},26 L${CX - 7},26 Z`} />
          </g>
        )}
      </svg>
    </div>
  );
}
