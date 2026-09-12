import { useEffect, useRef, useState } from 'react';
import {
  FRESH_SONG,
  MOODS,
  MOOD_CYCLE,
  PHRASES,
  TEMPO_MARK,
  TEMPO_MAX,
  TEMPO_MIN,
  VOLUME_MARK,
  VOLUME_MAX,
  VOLUME_MIN,
  VOLUME_STEP,
  applyPhrase,
  beatDice,
  clamp,
  rollBeat,
  isPlayable,
  moodName,
  phraseDeltas,
  phraseTone,
  sortPhrases,
  type Phrase,
  type Song,
} from '../data/bard';

interface Props {
  onBack: () => void;
}

const STORE_KEY = 'drews-bard-song';
const BEAT_KEY = 'drews-bard-beat';

function loadSong(): Song {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return FRESH_SONG;
    const s = JSON.parse(raw);
    return {
      mood: MOOD_CYCLE.includes(s.mood) ? s.mood : FRESH_SONG.mood,
      tempo: clamp(s.tempo ?? FRESH_SONG.tempo, TEMPO_MIN, TEMPO_MAX),
      volume: clamp(s.volume ?? FRESH_SONG.volume, VOLUME_MIN, VOLUME_MAX),
      open: !!s.open,
    };
  } catch {
    return FRESH_SONG;
  }
}

function loadBeat(): number[] | null {
  try {
    const raw = localStorage.getItem(BEAT_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.every((n) => typeof n === 'number') ? v : null;
  } catch {
    return null;
  }
}

type Moved = { mood: boolean; tempo: boolean; volume: boolean };
const NOTHING_MOVED: Moved = { mood: false, tempo: false, volume: false };

/**
 * A Bard's song is three numbers and a colour. The song sits at the top, the
 * Phrases it unlocks float up beneath it, and playing one is a tap — the card
 * knows what it does to the song, so the player never works the dials by hand
 * mid-fight unless they want to.
 */
export default function BardHub({ onBack }: Props) {
  const [song, setSong] = useState<Song>(loadSong);
  const [played, setPlayed] = useState<string | null>(null);
  const [moved, setMoved] = useState<Moved>(NOTHING_MOVED);
  const [ended, setEnded] = useState(false);
  // The Beat stands until it is rolled again. Changing the Tempo changes how
  // many dice the *next* roll uses, but the dice already on the table keep
  // whatever they came up as.
  const [beat, setBeat] = useState<number[] | null>(loadBeat);
  const [beatRolled, setBeatRolled] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(song));
    } catch {
      /* private browsing still gets a working page, just no memory */
    }
  }, [song]);

  useEffect(() => {
    try {
      if (beat) localStorage.setItem(BEAT_KEY, JSON.stringify(beat));
      else localStorage.removeItem(BEAT_KEY);
    } catch {
      /* no memory in private mode, but the roller still works */
    }
  }, [beat]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const flash = (name: string, what: Moved) => {
    timers.current.forEach(window.clearTimeout);
    setPlayed(null);
    setMoved(NOTHING_MOVED);
    requestAnimationFrame(() => {
      setPlayed(name);
      setMoved(what);
    });
    timers.current = [
      window.setTimeout(() => setPlayed(null), 900),
      window.setTimeout(() => setMoved(NOTHING_MOVED), 900),
    ];
  };

  const play = (p: Phrase) => {
    const result = applyPhrase(song, p);
    setSong(result.song);
    setEnded(result.ended);
    flash(p.name, result.moved);
  };

  const nudge = (patch: Partial<Song>) => {
    setEnded(false);
    setSong({ ...song, ...patch });
  };

  const stepMood = (dir: 1 | -1) => {
    const i = MOOD_CYCLE.indexOf(song.mood);
    nudge({ mood: MOOD_CYCLE[(i + dir + MOOD_CYCLE.length) % MOOD_CYCLE.length] });
  };

  const dice = beatDice(song.tempo);

  const rollTheBeat = () => {
    setBeat(rollBeat(dice));
    setBeatRolled(false);
    requestAnimationFrame(() => setBeatRolled(true));
    timers.current.push(window.setTimeout(() => setBeatRolled(false), 900));
  };

  const current = MOODS.find((m) => m.id === song.mood);
  const ordered = sortPhrases(PHRASES, song);
  const silent = song.volume <= VOLUME_MIN;

  return (
    <div className="bard-view">
      <header className="hub-header">
        <button className="btn btn-ghost btn-small" onClick={onBack}>
          ← Classes
        </button>
        <h1>Bard</h1>
        <button
          className="btn btn-ghost btn-small"
          onClick={() => {
            setSong(FRESH_SONG);
            setEnded(false);
          }}
        >
          Reset
        </button>
      </header>

      <section className={'song-bar song-' + song.mood}>
        <div className={'song-dial song-dial-mood' + (moved.mood ? ' dial-moved' : '')}>
          <span className="song-label">Mood</span>
          <div className="song-stepper">
            <button className="step-btn" onClick={() => stepMood(-1)} aria-label="Previous mood">
              ▾
            </button>
            <span className="song-value song-value-mood">{moodName(song.mood)}</span>
            <button className="step-btn" onClick={() => stepMood(1)} aria-label="Next mood">
              ▴
            </button>
          </div>
        </div>

        <div className={'song-dial' + (moved.tempo ? ' dial-moved' : '')}>
          <span className="song-label">{TEMPO_MARK} Tempo</span>
          <div className="song-stepper">
            <button
              className="step-btn"
              onClick={() => nudge({ tempo: clamp(song.tempo - 1, TEMPO_MIN, TEMPO_MAX) })}
              disabled={song.tempo <= TEMPO_MIN}
              aria-label="Slower"
            >
              ▾
            </button>
            <span className="song-value">{song.tempo}</span>
            <button
              className="step-btn"
              onClick={() => nudge({ tempo: clamp(song.tempo + 1, TEMPO_MIN, TEMPO_MAX) })}
              disabled={song.tempo >= TEMPO_MAX}
              aria-label="Faster"
            >
              ▴
            </button>
          </div>
          <span className="song-note">Beat {dice}d10</span>
        </div>

        <div className={'song-dial' + (moved.volume ? ' dial-moved' : '')}>
          <span className="song-label">{VOLUME_MARK} Volume</span>
          <div className="song-stepper">
            <button
              className="step-btn"
              onClick={() =>
                nudge({ volume: clamp(song.volume - VOLUME_STEP, VOLUME_MIN, VOLUME_MAX) })
              }
              disabled={song.volume <= VOLUME_MIN}
              aria-label="Quieter"
            >
              ▾
            </button>
            <span className="song-value">{song.volume}ft</span>
            <button
              className="step-btn"
              onClick={() =>
                nudge({ volume: clamp(song.volume + VOLUME_STEP, VOLUME_MIN, VOLUME_MAX) })
              }
              disabled={song.volume >= VOLUME_MAX}
              aria-label="Louder"
            >
              ▴
            </button>
          </div>
          <span className="song-note">{silent ? 'Silent' : 'Casting range'}</span>
        </div>

        <div className="song-beat">
          <span className="song-label">On the Beat</span>
          <p>{current ? current.beat : 'Play an Intro to open the song.'}</p>

          <div className="beat-roller">
            <button className="btn btn-small beat-roll" onClick={rollTheBeat}>
              Roll {dice}d10
            </button>
            {beat && (
              <span className={'beat-dice' + (beatRolled ? ' beat-rolled' : '')}>
                {beat.map((v) => (
                  <span key={v} className="beat-die">
                    {v}
                  </span>
                ))}
              </span>
            )}
          </div>

          {beat && beat.length !== dice && (
            <span className="beat-stale">
              Rolled on {beat.length}d10 — the Tempo now calls for {dice}d10.
            </span>
          )}
        </div>
      </section>

      {ended && (
        <p className="song-ended">The Volume reached 0ft — the song ends. Play an Intro to start again.</p>
      )}
      {song.open && !ended && (
        <p className="song-open">Coda is ringing — the next Phrase may come from any Mood.</p>
      )}

      <p className="hint-text bard-hint">
        Tap a Phrase to play it and move the song. {TEMPO_MARK} tempo, {VOLUME_MARK} volume.
      </p>

      <div className="phrase-grid">
        {ordered.map((p) => {
          const live = isPlayable(p, song);
          const deltas = phraseDeltas(p);
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => play(p)}
              className={
                'phrase-card tone-' +
                phraseTone(p) +
                (live ? ' phrase-live' : ' phrase-idle') +
                (played === p.name ? ' phrase-played' : '')
              }
            >
              <span className="phrase-head">
                <span className="phrase-name">{p.name}</span>
                <span className="phrase-tag">
                  {p.requires === null
                    ? 'Intro'
                    : p.requires === 'any'
                      ? 'Any Mood'
                      : moodName(p.requires)}
                </span>
              </span>

              <span className="phrase-effect">{p.effect}</span>

              {p.riders?.map((r) => (
                <span key={r.at} className="phrase-rider">
                  <span className="rider-at">
                    {TEMPO_MARK} {r.at}
                  </span>
                  <span className="rider-then">{r.then}</span>
                </span>
              ))}

              {p.note && <span className="phrase-note">{p.note}</span>}

              {deltas.length > 0 && (
                <span className="phrase-deltas">
                  {deltas.map((d, i) => (
                    <span key={i} className={'delta delta-' + d.kind}>
                      {d.kind === 'mood' ? '♪' : d.kind === 'tempo' ? TEMPO_MARK : VOLUME_MARK}{' '}
                      {d.text}
                      {d.at && (
                        <em className="delta-at">
                          at {TEMPO_MARK} {d.at}
                        </em>
                      )}
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
