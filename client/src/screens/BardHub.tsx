import { useEffect, useState } from 'react';
import {
  MOODS,
  MOOD_CYCLE,
  PHRASES,
  TEMPO_MIN,
  TEMPO_MAX,
  VOLUME_MIN,
  VOLUME_MAX,
  VOLUME_STEP,
  beatDice,
  isPlayable,
  moodName,
  phraseTone,
  sortPhrases,
  type SongMood,
} from '../data/bard';

interface Props {
  onBack: () => void;
}

const STORE_KEY = 'drews-bard-song';

interface Song {
  mood: SongMood;
  tempo: number;
  volume: number;
}

const FRESH: Song = { mood: 'none', tempo: 3, volume: 20 };

function loadSong(): Song {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return FRESH;
    const s = JSON.parse(raw);
    return {
      mood: MOOD_CYCLE.includes(s.mood) ? s.mood : FRESH.mood,
      tempo: clamp(s.tempo ?? FRESH.tempo, TEMPO_MIN, TEMPO_MAX),
      volume: clamp(s.volume ?? FRESH.volume, VOLUME_MIN, VOLUME_MAX),
    };
  } catch {
    return FRESH;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
}

/**
 * A Bard's song is three numbers and a colour, and the player needs to see at a
 * glance which Phrases they may actually play. So the song sits at the top and
 * the Phrases it unlocks float up under it.
 */
export default function BardHub({ onBack }: Props) {
  const [song, setSong] = useState<Song>(loadSong);

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(song));
    } catch {
      /* a phone in private mode still gets a working page, just no memory */
    }
  }, [song]);

  const stepMood = (dir: 1 | -1) => {
    const i = MOOD_CYCLE.indexOf(song.mood);
    const next = MOOD_CYCLE[(i + dir + MOOD_CYCLE.length) % MOOD_CYCLE.length];
    setSong({ ...song, mood: next });
  };

  const stepTempo = (dir: 1 | -1) =>
    setSong({ ...song, tempo: clamp(song.tempo + dir, TEMPO_MIN, TEMPO_MAX) });

  const stepVolume = (dir: 1 | -1) =>
    setSong({
      ...song,
      volume: clamp(song.volume + dir * VOLUME_STEP, VOLUME_MIN, VOLUME_MAX),
    });

  const current = MOODS.find((m) => m.id === song.mood);
  const ordered = sortPhrases(PHRASES, song.mood);
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
          onClick={() => setSong(FRESH)}
          title="End the song"
        >
          Reset
        </button>
      </header>

      <section className={'song-bar song-' + song.mood}>
        <div className="song-dial">
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

        <div className="song-dial">
          <span className="song-label">Tempo</span>
          <div className="song-stepper">
            <button
              className="step-btn"
              onClick={() => stepTempo(-1)}
              disabled={song.tempo <= TEMPO_MIN}
              aria-label="Slower"
            >
              ▾
            </button>
            <span className="song-value">{song.tempo}</span>
            <button
              className="step-btn"
              onClick={() => stepTempo(1)}
              disabled={song.tempo >= TEMPO_MAX}
              aria-label="Faster"
            >
              ▴
            </button>
          </div>
          <span className="song-note">Beat: {beatDice(song.tempo)}d10</span>
        </div>

        <div className="song-dial">
          <span className="song-label">Volume</span>
          <div className="song-stepper">
            <button
              className="step-btn"
              onClick={() => stepVolume(-1)}
              disabled={song.volume <= VOLUME_MIN}
              aria-label="Quieter"
            >
              ▾
            </button>
            <span className="song-value">{song.volume}ft</span>
            <button
              className="step-btn"
              onClick={() => stepVolume(1)}
              disabled={song.volume >= VOLUME_MAX}
              aria-label="Louder"
            >
              ▴
            </button>
          </div>
          <span className="song-note">{silent ? 'The song ends' : 'Casting range'}</span>
        </div>

        <div className="song-beat">
          <span className="song-label">On the Beat</span>
          <p>{current ? current.beat : 'Play an Intro to start the song.'}</p>
        </div>
      </section>

      <p className="hint-text bard-hint">
        {song.mood === 'none'
          ? 'No song yet — only the Intros are lit.'
          : `Lit cards are playable while the Mood is ${moodName(song.mood)}. Coda and Crescendo belong to no Mood, so they are always available.`}
      </p>

      <div className="phrase-grid">
        {ordered.map((p) => {
          const playable = isPlayable(p, song.mood);
          return (
            <article
              key={p.name}
              className={
                'phrase-card tone-' + phraseTone(p) + (playable ? ' phrase-live' : ' phrase-idle')
              }
            >
              <header className="phrase-head">
                <h3>{p.name}</h3>
                <span className="phrase-tag">
                  {p.requires === null
                    ? 'Intro'
                    : p.requires === 'any'
                      ? 'Any Mood'
                      : moodName(p.requires)}
                  {p.becomes && p.becomes !== p.requires && (
                    <span className="phrase-arrow">
                      → {p.becomes === 'any' ? 'Any' : moodName(p.becomes)}
                    </span>
                  )}
                </span>
              </header>
              <p className="phrase-effect">{p.effect}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
