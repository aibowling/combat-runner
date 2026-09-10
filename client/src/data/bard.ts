/**
 * The Bard, from terradnd.wordpress.com/bard/.
 *
 * Effect text is lightly corrected against the rules page — the fixes are
 * listed in CORRECTIONS below so they can be pushed back to the source. Each
 * Phrase also carries its song changes as data, so tapping a card can move the
 * Mood, Tempo and Volume rather than leaving the player to do it by hand.
 */

export type Mood = 'heroic' | 'violent' | 'somber';

/** 'none' is a song that has not started, when only the Intros are playable. */
export type SongMood = Mood | 'none';

export interface Song {
  mood: SongMood;
  tempo: number;
  volume: number;
  /** Coda is in play: the next Phrase may come from any Mood. */
  open: boolean;
}

export const TEMPO_MIN = 1;
export const TEMPO_MAX = 5;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 50;
/** Every Phrase that touches Volume moves it in fives. */
export const VOLUME_STEP = 5;

export const FRESH_SONG: Song = { mood: 'none', tempo: 3, volume: 20, open: false };

/** Glyphs used on the cards, kept here so the legend cannot drift from them. */
export const TEMPO_MARK = '♩';
export const VOLUME_MARK = '↔';

export interface MoodInfo {
  id: Mood;
  name: string;
  /** what any creature acting on the Beat gets */
  beat: string;
}

export const MOODS: readonly MoodInfo[] = [
  { id: 'heroic', name: 'Heroic', beat: 'Gain a focus die for the action' },
  { id: 'violent', name: 'Violent', beat: 'Deal 3 extra damage when damaging' },
  { id: 'somber', name: 'Somber', beat: 'Lose a focus die for the action' },
] as const;

export const MOOD_CYCLE: readonly SongMood[] = ['none', 'heroic', 'violent', 'somber'] as const;

/** A rider that only applies at certain Tempos, split out from the main effect. */
export interface TempoRider {
  /** the Tempo condition, short enough for a pill: "3", "≤ 2", "4+" */
  at: string;
  then: string;
}

export interface SongChange {
  becomes?: Mood;
  /** Coda: the next Phrase may come from any Mood */
  opensAny?: boolean;
  setTempo?: number;
  setVolume?: number;
  tempo?: number;
  volume?: number;
  /** applied only if the test passes against the Tempo as it was before this Phrase */
  ifTempo?: {
    at: string;
    test: (tempo: number) => boolean;
    tempo?: number;
    volume?: number;
  };
}

export interface Phrase {
  name: string;
  /** the Mood the song must be in — null for Intros, 'any' for Coda and Crescendo */
  requires: Mood | 'any' | null;
  effect: string;
  riders?: TempoRider[];
  changes?: SongChange;
  /** standing restriction, shown as a footnote */
  note?: string;
  /** Coda cannot open a song */
  cannotStart?: boolean;
  /** Crescendo is priced per Focus Die, so it is tapped once per die */
  repeatable?: boolean;
}

export const PHRASES: readonly Phrase[] = [
  {
    name: 'Heroic Intro',
    requires: null,
    effect: 'Opens the song in a Heroic Mood.',
    changes: { becomes: 'heroic', setTempo: 3, setVolume: 20 },
  },
  {
    name: 'Violent Intro',
    requires: null,
    effect: 'Opens the song in a Violent Mood.',
    changes: { becomes: 'violent', setTempo: 3, setVolume: 20 },
  },
  {
    name: 'Somber Intro',
    requires: null,
    effect: 'Opens the song in a Somber Mood.',
    changes: { becomes: 'somber', setTempo: 3, setVolume: 20 },
  },

  {
    name: 'Chilling Harmonics',
    requires: 'somber',
    effect:
      "Target one creature's Passive Reaction with a Finesse roll. If your roll beats the DC, the target's Speed is reduced by 10ft for the round.",
    riders: [{ at: '3', then: 'Their Speed becomes 0 for the round instead.' }],
    changes: { tempo: -1 },
  },
  {
    name: 'Funeral Drone',
    requires: 'somber',
    effect:
      'Target a damaged creature with a Mind roll. If your roll beats the DC, they become Frightened.',
    changes: { ifTempo: { at: '≠ 2', test: (t) => t !== 2, volume: -5 } },
  },
  {
    name: 'Echoes From Below',
    requires: 'somber',
    effect:
      'Target one creature with a Mind roll. If your roll beats the DC, they fall prone and take 2 bludgeoning damage.',
    riders: [{ at: '4+', then: 'They take 5 bludgeoning damage instead.' }],
    changes: { tempo: -2 },
  },
  {
    name: 'Rattling Rhythm',
    requires: 'somber',
    effect:
      "Target one creature's Passive Reaction with a Finesse roll. If your roll beats the DC, they become Overwhelmed 1.",
    riders: [{ at: '≤ 2', then: 'They become Overwhelmed 2 instead.' }],
    changes: { becomes: 'violent', tempo: 1 },
  },
  {
    name: 'Ghostlight Overture',
    requires: 'somber',
    effect:
      "Target one creature's Passive Reaction with a Might roll. If your roll beats the DC, the target becomes flanked until the end of the round.",
    changes: {
      becomes: 'heroic',
      ifTempo: { at: '1', test: (t) => t === 1, volume: 5 },
    },
  },

  {
    name: 'Bloodbeat Percussion',
    requires: 'violent',
    effect:
      'Target up to 2 creatures with a Might roll. On failure, they take 3 bludgeoning damage.',
    riders: [{ at: '≠ 2', then: 'You take 3 damage.' }],
    changes: { tempo: 2 },
  },
  {
    name: 'Frenzy Fanfare',
    requires: 'violent',
    effect:
      'Make a Mind roll. An ally may make an attack as a reaction. Give a bonus to their attack roll equal to your roll divided by 5, rounded down.',
    changes: { ifTempo: { at: '≤ 2', test: (t) => t <= 2, volume: 5 } },
  },
  {
    name: 'A Celebration of Burning Flesh',
    requires: 'violent',
    effect:
      'Target one creature with a Mind roll. If your roll beats the DC, the target becomes Burning 7.',
    riders: [{ at: '5', then: 'They become Burning 12 instead.' }],
    changes: { tempo: -1 },
  },
  {
    name: 'Deadly Decrescendo',
    requires: 'violent',
    effect:
      "Target one creature's Passive Reaction with a Finesse roll. If your roll beats the DC, the target gains −3 DR for the rest of the Round.",
    changes: {
      becomes: 'somber',
      volume: -5,
      ifTempo: { at: '≤ 3', test: (t) => t <= 3, volume: -10 },
    },
  },
  {
    name: 'Clash of Chords',
    requires: 'violent',
    effect:
      'Make a Might roll against DC 13. On success, swap the locations of you, your ally and the target creature, with nobody ending in their original location.',
    riders: [{ at: '3', then: 'The DC is 7 instead.' }],
    changes: { becomes: 'heroic', tempo: 1 },
  },

  {
    name: 'March of the Unbroken',
    requires: 'heroic',
    effect: 'Make a Might roll against DC 13. On success, give 2 Stamina to an ally.',
    riders: [{ at: '2', then: 'The DC is 7 instead.' }],
    note: 'Cannot be attempted more than once per hour.',
  },
  {
    name: 'Defiant Refrain',
    requires: 'heroic',
    effect:
      "A dying creature that can hear you doesn't lose a die at the end of the turn.",
    riders: [{ at: '4', then: 'They also gain 10ft of Bonus Movement.' }],
    changes: { tempo: 1 },
  },
  {
    name: 'Reverberate',
    requires: 'heroic',
    effect:
      'Target one creature with a Might roll. After resolving the attack, recursively apply the attack roll, reducing it by 6 each iteration until the roll is less than 1 — a 14 yields three attacks, 14 / 8 / 2. These attacks deal 0 damage.',
    riders: [{ at: '2 or 4', then: 'The roll is reduced by 5 each iteration instead.' }],
    changes: { tempo: -1 },
  },
  {
    name: 'The Requiem',
    requires: 'heroic',
    effect:
      'Make a Mind roll against DC 10. All allies within range gain an Anchor of 4 to their Dodge rolls this Round.',
    riders: [{ at: '≤ 2', then: 'The Anchor increases to 6.' }],
    changes: { becomes: 'somber', volume: -5 },
  },
  {
    name: 'Fucking Gnarly Riff',
    requires: 'heroic',
    effect:
      'Make a Finesse roll against DC 13. If successful, all allies gain +2 to hit this turn.',
    riders: [{ at: '< 3', then: 'The DC is 7 instead.' }],
    changes: { becomes: 'violent', volume: 5 },
  },

  {
    name: 'Coda',
    requires: 'any',
    effect: 'The next Phrase may come from any Mood, and the song takes that Phrase’s Mood.',
    note: 'Cannot start a song.',
    cannotStart: true,
    changes: { opensAny: true, volume: -5 },
  },
  {
    name: 'Crescendo',
    requires: 'any',
    effect: 'Increase the Volume by 5ft per Focus Die expended.',
    note: 'Tap once per Focus Die spent.',
    repeatable: true,
    changes: { volume: 5 },
  },
] as const;

/**
 * Differences between these cards and the rules page, so they can be fixed at
 * the source. Shown nowhere in the UI — this is a note for the author.
 */
export const CORRECTIONS: readonly string[] = [
  'Chilling Harmonics: "the target’s speed i reduced" → "is reduced".',
  'Deadly Decrescendo: "The Tempo decreases by 5ft" → Volume. Tempo has no unit, and the next clause reduces Volume by "an additional 10ft".',
  'A Celebration of Burning Flesh: "If The Tempo is 5" → "the".',
  'Deadly Decrescendo: "If the Tempo is three or less" → "3 or less", matching every other Phrase.',
  'Clash of Chords and Fucking Gnarly Riff: "DC13" → "DC 13".',
  'Somber’s Beat effect ended in a full stop where Heroic’s and Violent’s did not.',
] as const;

/* ---------------------------- derived ---------------------------- */

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
}

/** How many d10 you roll to find the Beat, from the current Tempo. */
export function beatDice(tempo: number): number {
  if (tempo >= TEMPO_MAX) return 3;
  if (tempo >= 3) return 2;
  return 1;
}

export function moodName(mood: SongMood): string {
  return MOODS.find((m) => m.id === mood)?.name ?? 'No song';
}

/**
 * Playable right now. Coda opens the next Phrase up to any Mood, which is the
 * whole reason it exists, so that flag beats the Mood check.
 */
export function isPlayable(phrase: Phrase, song: Song): boolean {
  if (song.mood === 'none') return phrase.requires === null;
  if (song.open) return true;
  if (phrase.requires === null) return false;
  if (phrase.requires === 'any') return true;
  return phrase.requires === song.mood;
}

/**
 * Playable Phrases first, then the ones outside any Mood, then the rest grouped
 * by the Mood they belong to.
 */
export function sortPhrases(phrases: readonly Phrase[], song: Song): Phrase[] {
  const rank = (p: Phrase): number => {
    if (isPlayable(p, song)) return p.requires === 'any' ? 1 : 0;
    if (p.requires === 'any') return 2;
    if (p.requires === null) return 4;
    return 3;
  };

  return [...phrases]
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map((x) => x.p);
}

/** Which colour a card wears. Intros take the Mood they open with. */
export function phraseTone(phrase: Phrase): Mood | 'any' {
  if (phrase.requires === null) return phrase.changes?.becomes ?? 'any';
  return phrase.requires;
}

export interface Applied {
  song: Song;
  /** which dials moved, so the song bar can call attention to them */
  moved: { mood: boolean; tempo: boolean; volume: boolean };
  /** Volume reached 0, so the song is over */
  ended: boolean;
}

/**
 * Play a Phrase. Every Tempo condition is measured against the Tempo as it was
 * before this Phrase resolved, which is how the rules read them, and matters
 * for the Phrases that both test the Tempo and then change it.
 */
export function applyPhrase(song: Song, phrase: Phrase): Applied {
  const c = phrase.changes;
  if (!c) {
    return {
      song: { ...song, open: false },
      moved: { mood: false, tempo: false, volume: false },
      ended: false,
    };
  }

  const rider = c.ifTempo && c.ifTempo.test(song.tempo) ? c.ifTempo : undefined;

  let tempo = c.setTempo ?? clamp(song.tempo + (c.tempo ?? 0) + (rider?.tempo ?? 0), TEMPO_MIN, TEMPO_MAX);
  let volume = c.setVolume ?? clamp(song.volume + (c.volume ?? 0) + (rider?.volume ?? 0), VOLUME_MIN, VOLUME_MAX);
  let mood: SongMood = c.becomes ?? song.mood;

  const ended = volume <= VOLUME_MIN;
  if (ended) mood = 'none';

  return {
    song: { mood, tempo, volume, open: ended ? false : !!c.opensAny },
    moved: {
      mood: mood !== song.mood,
      tempo: tempo !== song.tempo,
      volume: volume !== song.volume,
    },
    ended,
  };
}

/** The song changes a card advertises, before it is played. */
export interface Delta {
  kind: 'mood' | 'tempo' | 'volume';
  text: string;
  /** only applies at certain Tempos */
  at?: string;
}

export function phraseDeltas(phrase: Phrase): Delta[] {
  const c = phrase.changes;
  if (!c) return [];
  const out: Delta[] = [];

  if (c.becomes) out.push({ kind: 'mood', text: moodName(c.becomes) });
  if (c.opensAny) out.push({ kind: 'mood', text: 'Any Mood next' });

  if (c.setTempo != null) out.push({ kind: 'tempo', text: `= ${c.setTempo}` });
  else if (c.tempo) out.push({ kind: 'tempo', text: signed(c.tempo) });

  if (c.setVolume != null) out.push({ kind: 'volume', text: `= ${c.setVolume}ft` });
  else if (c.volume) out.push({ kind: 'volume', text: `${signed(c.volume)}ft` });

  if (c.ifTempo?.tempo) {
    out.push({ kind: 'tempo', text: signed(c.ifTempo.tempo), at: c.ifTempo.at });
  }
  if (c.ifTempo?.volume) {
    out.push({ kind: 'volume', text: `${signed(c.ifTempo.volume)}ft`, at: c.ifTempo.at });
  }

  return out;
}

function signed(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}
