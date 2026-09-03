import { useEffect, useRef, useState } from 'react';
import {
  WHEEL,
  WEDGE_COUNT,
  wedgeType,
  chipAbbrev,
  type Chip,
  type WedgeType,
} from '../shared/types';
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
  /** drives the hour hand — one hour per round, wrapping every ten */
  round?: number;
}

/** Chapter-ring tints, muted so the dial still reads as a dial. */
const BAND: Record<WedgeType, string> = {
  player: '#8ea9c1',
  enemy: '#b0524a',
  status: '#5f9184',
  environment: '#5f9184',
};

const CX = 200;
const CY = 200;

/* Dial geometry, outside in. */
const R_CASE = 196;
const R_BEZEL = 187;
const R_BAND_OUT = 185;
const R_BAND_IN = 150;
const R_NUMERAL = 168;
const R_TICK_IN = 140;
const R_SUBTICK_IN = 145;
const R_LABEL = 132;

function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}

function bandPath(i: number, rIn: number, rOut: number): string {
  const a0 = i * 36;
  const a1 = (i + 1) * 36;
  const [x0, y0] = polar(rOut, a0);
  const [x1, y1] = polar(rOut, a1);
  const [x2, y2] = polar(rIn, a1);
  const [x3, y3] = polar(rIn, a0);
  return `M${x0},${y0} A${rOut},${rOut} 0 0 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 0 0 ${x3},${y3} Z`;
}

/**
 * Chips sit in the open dial under their numeral. Past three they wrap to an
 * inner row rather than spilling sideways into the neighbouring hour.
 */
function chipSlot(k: number, n: number): { r: number; offset: number } {
  const perRow = n <= 3 ? n : Math.ceil(n / 2);
  const inFirstRow = k < perRow;
  const inRow = inFirstRow ? k : k - perRow;
  const rowCount = inFirstRow ? perRow : n - perRow;
  // Spread is set so three 24px chips clear each other at that radius without
  // the row growing wider than the 36 degrees the hour owns.
  return {
    r: inFirstRow ? 118 : 89,
    offset: (inRow - (rowCount - 1) / 2) * (inFirstRow ? 13 : 17),
  };
}

function chipFontSize(text: string): number {
  if (text.length >= 4) return 8;
  if (text.length === 3) return 9.5;
  return 11;
}

const MAX_CHIPS_DRAWN = 6;

/* The centre readout: whoever is up, drawn large where the hands pin. */
const HUB_R = 19;
const HUB_GAP = 46;
const HUB_PER_ROW = 3;

function hubFontSize(text: string): number {
  if (text.length >= 4) return 12;
  if (text.length === 3) return 15;
  return 18;
}

function hubSlot(k: number, n: number): { x: number; y: number } {
  const rows = Math.ceil(n / HUB_PER_ROW);
  const row = Math.floor(k / HUB_PER_ROW);
  const inRow = k % HUB_PER_ROW;
  const rowCount = Math.min(HUB_PER_ROW, n - row * HUB_PER_ROW);
  return {
    x: CX + (inRow - (rowCount - 1) / 2) * HUB_GAP,
    y: CY + (row - (rows - 1) / 2) * HUB_GAP,
  };
}

export default function Clock({
  chips,
  currentWedge,
  entryWedge,
  liveWedges,
  onWedgeClick,
  ownPlayerId,
  hiddenChipCount = 0,
  round = 1,
}: Props) {
  const pointerWedge = currentWedge ?? entryWedge;
  const hubChips = currentWedge == null ? [] : chips.filter((c) => c.wedge === currentWedge);
  const hubType = currentWedge == null ? null : wedgeType(currentWedge);
  const hubIsSpecial = hubType === 'status' || hubType === 'environment';

  /**
   * The hand only ever sweeps forward, the way a real one does — going from
   * hour 10 to hour 1 winds on round the top rather than snapping backwards.
   */
  const sweptRef = useRef<number | null>(null);
  const [handAngle, setHandAngle] = useState(0);

  /**
   * The hour hand counts rounds rather than wedges — one hour per round, so it
   * comes back round to the top every tenth. Like the wedge hand it only winds
   * forward, because rounds only ever go up.
   */
  const hourRef = useRef<number | null>(null);
  const [hourAngle, setHourAngle] = useState(0);

  useEffect(() => {
    const target = (((round - 1) % WEDGE_COUNT) + WEDGE_COUNT) % WEDGE_COUNT * 36 + 18;

    const swept = hourRef.current;
    if (swept === null) {
      hourRef.current = target;
      setHourAngle(target);
      return;
    }

    const forward = (((target - swept) % 360) + 360) % 360;
    if (forward === 0) return;
    const next = swept + forward;
    hourRef.current = next;
    setHourAngle(next);
  }, [round]);

  useEffect(() => {
    if (pointerWedge == null) return;
    const target = (pointerWedge - 1) * 36 + 18;

    const swept = sweptRef.current;
    if (swept === null) {
      sweptRef.current = target;
      setHandAngle(target);
      return;
    }

    const forward = (((target - swept) % 360) + 360) % 360;
    if (forward === 0) return;
    const next = swept + forward;
    sweptRef.current = next;
    setHandAngle(next);
  }, [pointerWedge]);

  return (
    <div className="clock">
      <svg viewBox="0 0 400 400" role="img" aria-label="Initiative clock">
        <circle cx={CX} cy={CY} r={R_CASE} className="clock-case" />
        <circle cx={CX} cy={CY} r={R_BEZEL} className="clock-bezel" />
        <circle cx={CX} cy={CY} r={R_BAND_OUT} className="clock-dial" />

        {/* Dial furniture first, so the hand and then the chips lay over it. */}
        {WHEEL.map((w, i) => {
          const isCurrent = currentWedge === w.wedge;
          const live = !!liveWedges?.includes(w.wedge);
          const dim = !!liveWedges && !live && !isCurrent;
          const type = wedgeType(w.wedge);

          return (
            <g
              key={w.wedge}
              className={
                'hour' +
                (live ? ' hour-live' : '') +
                (dim ? ' hour-dim' : '') +
                (isCurrent ? ' hour-current' : '')
              }
            >
              <path
                d={bandPath(i, R_BAND_IN, R_BAND_OUT)}
                fill={BAND[type]}
                className="hour-band"
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
                const [x1, y1] = polar(R_BAND_IN, i * 36);
                const [x2, y2] = polar(R_TICK_IN, i * 36);
                return <line x1={x1} y1={y1} x2={x2} y2={y2} className="clock-tick" />;
              })()}

              {[1, 2, 3, 4].map((s) => {
                const [x1, y1] = polar(R_BAND_IN, i * 36 + s * 7.2);
                const [x2, y2] = polar(R_SUBTICK_IN, i * 36 + s * 7.2);
                return (
                  <line key={s} x1={x1} y1={y1} x2={x2} y2={y2} className="clock-subtick" />
                );
              })}

              {(() => {
                const [x, y] = polar(R_NUMERAL, i * 36 + 18);
                return (
                  <text x={x} y={y + 6} className="hour-num" textAnchor="middle">
                    {w.wedge}
                  </text>
                );
              })()}

              {(type === 'status' || type === 'environment') &&
                (() => {
                  const [x, y] = polar(R_LABEL, i * 36 + 18);
                  return (
                    <text x={x} y={y + 3} className="hour-label" textAnchor="middle">
                      {type === 'status' ? 'STATUS' : 'ENVIRON'}
                    </text>
                  );
                })()}

            </g>
          );
        })}

        {/* Hour hand: short and heavy, so it reads as the slower of the two. */}
        <g className="clock-hour-hand" transform={`rotate(${hourAngle} ${CX} ${CY})`}>
          <path
            d={`M${CX},104 L${CX + 7.5},134 L${CX + 5},${CY + 14} L${CX - 5},${CY + 14} L${CX - 7.5},134 Z`}
          />
        </g>

        {pointerWedge != null && (
          <g className="clock-hand" transform={`rotate(${handAngle} ${CX} ${CY})`}>
            <circle cx={CX} cy={CY + 26} r={10} />
            <path d={`M${CX},56 L${CX + 4},140 L${CX + 2.5},${CY + 26} L${CX - 2.5},${CY + 26} L${CX - 4},140 Z`} />
          </g>
        )}

        {/* The pivot only shows when nothing has taken the middle. */}
        {!hubIsSpecial && hubChips.length === 0 && (
          <>
            <circle cx={CX} cy={CY} r={7} className="clock-pivot" />
            <circle cx={CX} cy={CY} r={2.4} className="clock-pivot-cap" />
          </>
        )}

        {/* Who is up, in the middle where the eye already is. */}
        {hubIsSpecial && (
          <text x={CX} y={CY + 6} className="hub-special" textAnchor="middle">
            {hubType === 'status' ? 'STATUS' : 'ENVIRONMENT'}
          </text>
        )}

        {!hubIsSpecial &&
          hubChips.map((c, k) => {
            const { x, y } = hubSlot(k, hubChips.length);
            const isEnemy = c.actorKind === 'npc';
            const mine = ownPlayerId != null && c.playerId === ownPlayerId;
            const face = chipAbbrev(c.displayName);
            return (
              <g key={c.id} className="hub-chip">
                <title>{c.displayName}</title>
                <circle
                  cx={x}
                  cy={y}
                  r={HUB_R}
                  fill={isEnemy ? '#22181a' : playerColor(c.playerId ?? 0)}
                  stroke={mine ? '#8a6d3f' : '#2b2620'}
                  strokeWidth={mine ? 3.4 : 1.6}
                />
                <text
                  x={x}
                  y={y + hubFontSize(face) / 3}
                  className="hub-chip-face"
                  textAnchor="middle"
                  fontSize={hubFontSize(face)}
                  fill={isEnemy ? '#f2ece0' : '#22181a'}
                >
                  {face}
                </text>
              </g>
            );
          })}

        {/* Chips last — the hand must never hide who is on the wedge it points at. */}
        {WHEEL.map((w, i) => {
          const onWedge = chips.filter((c) => c.wedge === w.wedge);
          if (onWedge.length === 0) return null;
          const overflow = onWedge.length - MAX_CHIPS_DRAWN;

          return (
            <g key={w.wedge}>
              {onWedge.slice(0, MAX_CHIPS_DRAWN).map((c, k, arr) => {
                const slot = chipSlot(k, arr.length);
                const [cx, cy] = polar(slot.r, i * 36 + 18 + slot.offset);
                const isEnemy = c.actorKind === 'npc';
                const mine = ownPlayerId != null && c.playerId === ownPlayerId;
                const face = chipAbbrev(c.displayName);
                return (
                  <g key={c.id} className={'chip' + (c.resolved ? ' chip-resolved' : '')}>
                    <title>{c.displayName}</title>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={12}
                      fill={isEnemy ? '#22181a' : playerColor(c.playerId ?? 0)}
                      stroke={mine ? '#2b2620' : isEnemy ? '#e6dfd1' : '#2b2620'}
                      strokeWidth={mine ? 2.6 : 1.2}
                    />
                    <text
                      x={cx}
                      y={cy + chipFontSize(face) / 3}
                      className="chip-face"
                      textAnchor="middle"
                      fontSize={chipFontSize(face)}
                      fill={isEnemy ? '#f2ece0' : '#22181a'}
                    >
                      {face}
                    </text>
                  </g>
                );
              })}

              {overflow > 0 &&
                (() => {
                  const [x, y] = polar(66, i * 36 + 18);
                  return (
                    <text x={x} y={y + 3} className="chip-overflow" textAnchor="middle">
                      +{overflow}
                    </text>
                  );
                })()}
            </g>
          );
        })}
      </svg>

      {/* No wedge number anywhere — the hand pointing at it is the readout. */}
      {hiddenChipCount > 0 && (
        <div className="clock-plate">
          <span className="plate-hidden">
            {hiddenChipCount} chip{hiddenChipCount === 1 ? '' : 's'} still hidden
          </span>
        </div>
      )}
    </div>
  );
}
