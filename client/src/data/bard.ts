/**
 * The Bard, transcribed from terradnd.wordpress.com/bard/.
 *
 * Effect text is copied verbatim, typos and all — this is a reference the
 * player reads at the table, so it has to match the rules page rather than
 * what the rules page probably meant.
 */

export type Mood = 'heroic' | 'violent' | 'somber';

/** 'none' is a song that has not started yet, when only Intros are playable. */
export type SongMood = Mood | 'none';

export interface MoodInfo {
  id: Mood;
  name: string;
  /** what any creature acting on the Beat gets */
  beat: string;
}

export const MOODS: readonly MoodInfo[] = [
  { id: 'heroic', name: 'Heroic', beat: 'Gain a focus die for the action' },
  { id: 'violent', name: 'Violent', beat: 'Deal 3 extra damage when damaging' },
  { id: 'somber', name: 'Somber', beat: 'Lose a focus die for the action.' },
] as const;

/** The order the Mood control cycles through, starting from no song. */
export const MOOD_CYCLE: readonly SongMood[] = ['none', 'heroic', 'violent', 'somber'] as const;

export interface Phrase {
  name: string;
  /** the Mood a song must already be in to play this — null for Intros, 'any' for Coda/Crescendo */
  requires: Mood | 'any' | null;
  /** the Mood the song is in afterwards, when the Phrase moves it */
  becomes?: Mood | 'any';
  effect: string;
}

export const PHRASES: readonly Phrase[] = [
  {
    name: 'Heroic Intro',
    requires: null,
    becomes: 'heroic',
    effect: 'The Mood becomes Heroic, the Tempo becomes 3, and the Volume becomes 20ft.',
  },
  {
    name: 'Violent Intro',
    requires: null,
    becomes: 'violent',
    effect: 'The Mood becomes Violent, the Tempo becomes 3, and the Volume becomes 20ft.',
  },
  {
    name: 'Somber Intro',
    requires: null,
    becomes: 'somber',
    effect: 'The Mood becomes Somber, the Tempo becomes 3, and the Volume becomes 20ft.',
  },

  {
    name: 'Chilling Harmonics',
    requires: 'somber',
    effect:
      "Target one creature's Passive Reaction with a Finesse roll. If your roll beats the DC, then the target's speed i reduced by 10ft for the round. If the Tempo is 3, their Speed becomes 0 for the round. The Tempo decreases by 1.",
  },
  {
    name: 'Funeral Drone',
    requires: 'somber',
    effect:
      'Target a damaged creature with a Mind roll. If your roll beats the DC, they become Frightened. If the Tempo is not 2, the Volume decreases by 5ft.',
  },
  {
    name: 'Echoes From Below',
    requires: 'somber',
    effect:
      'Target one creature with a Mind roll. If your roll beats the DC, they fall prone and take 2 bludgeoning damage. If the Tempo is 4 or greater, they instead take 5 bludgeoning damage. The Tempo decreases by 2.',
  },
  {
    name: 'Rattling Rhythm',
    requires: 'somber',
    becomes: 'violent',
    effect:
      "Target one creature's Passive Reaction with a Finesse roll. If your roll beats the DC, they become Overwhelmed 1. If the Tempo is 2 or less, they become Overwhelmed 2. The Mood becomes Violent. The Tempo increases by 1.",
  },
  {
    name: 'Ghostlight Overture',
    requires: 'somber',
    becomes: 'heroic',
    effect:
      "Target one creature's Passive Reaction with a Might roll. If your roll beats the DC, the target becomes flanked until the end of the round. The Mood becomes Heroic. If the Tempo is 1, the Volume increases by 5ft.",
  },

  {
    name: 'Bloodbeat Percussion',
    requires: 'violent',
    effect:
      'Target up to 2 creatures with a Might roll. On failure, they take 3 bludgeoning damage. If the Tempo is not 2, you take 3 damage. Increase the Tempo by 2.',
  },
  {
    name: 'Frenzy Fanfare',
    requires: 'violent',
    effect:
      'Make a Mind roll. An ally may make an attack as a reaction. Give a bonus to their attack roll equal to the result of your roll divided by 5, rounded down. If the Tempo is 2 or less, the Volume increases by 5ft.',
  },
  {
    name: 'A Celebration of Burning Flesh',
    requires: 'violent',
    effect:
      'Target one creature with a Mind roll. If your roll beats the DC, then the target becomes Burning 7. If The Tempo is 5, they are instead Burning 12. The Tempo decreases by 1.',
  },
  {
    name: 'Deadly Decrescendo',
    requires: 'violent',
    becomes: 'somber',
    effect:
      "Target one creature's Passive Reaction with a Finesse roll. If your roll beats the DC, then the target gains -3 DR for the rest of the Round. The Tempo decreases by 5ft. If the Tempo is three or less, the Volume decreases by an additional 10ft. The Mood becomes Somber.",
  },
  {
    name: 'Clash of Chords',
    requires: 'violent',
    becomes: 'heroic',
    effect:
      'Make a Might roll against a DC13. On success, you must swap the locations of you, your ally, and target creature with the result being nobody in their original location. If the Tempo is 3, the DC is instead 7. The Mood becomes Heroic. The Tempo increases by 1.',
  },

  {
    name: 'March of the Unbroken',
    requires: 'heroic',
    effect:
      'Make a Might roll against a DC of 13. On success, give 2 Stamina to an ally. If the Tempo is 2, the DC is instead 7. This Phrase cannot be attempted more than once per hour.',
  },
  {
    name: 'Defiant Refrain',
    requires: 'heroic',
    effect:
      "A dying creature that can hear you doesn't lose a die at the end of the turn. If the Tempo is 4, they also gain 10ft of Bonus Movement. Increase the Tempo by 1.",
  },
  {
    name: 'Reverberate',
    requires: 'heroic',
    effect:
      'Target one creature with a Might roll. After resolving the attack, recursively apply the attack roll while reducing it by 6 each iteration until the roll is less than 1 (for example, attack with 14 would yield three consecutive attacks – 14 / 8 / 2). These attacks deal 0 damage. If the Tempo is 2 or 4, then the roll is only recursively reduced by 5. Reduce the Tempo by 1.',
  },
  {
    name: 'The Requiem',
    requires: 'heroic',
    becomes: 'somber',
    effect:
      'Make a Mind roll against a DC of 10. All allies within range gain an Anchor of 4 to their Dodge rolls this Round. If the Tempo is 2 or less, the Anchor increases to 6. The Mood becomes Somber. The Volume decreases by 5ft.',
  },
  {
    name: 'Fucking Gnarly Riff',
    requires: 'heroic',
    becomes: 'violent',
    effect:
      'Make a Finesse roll against a DC13. If successful, all allies gain +2 to hit this turn. If the Tempo is less than 3, then the DC is instead 7. The Mood becomes Violent. The Volume increases by 5ft.',
  },

  {
    name: 'Coda',
    requires: 'any',
    becomes: 'any',
    effect:
      'You may play a Phrase of any Mood after this one, and the Mood becomes the one associated with that Phrase. Coda cannot start a song. Decrease the Volume by 5ft.',
  },
  {
    name: 'Crescendo',
    requires: 'any',
    effect: 'Increase the Volume by 5ft per Focus Die expended.',
  },
] as const;

/* --------------------------- song values --------------------------- */

export const TEMPO_MIN = 1;
export const TEMPO_MAX = 5;
export const VOLUME_MIN = 0;
export const VOLUME_MAX = 50;
/** Every Phrase that touches Volume moves it in fives. */
export const VOLUME_STEP = 5;

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
 * Playable right now: the current Mood's Phrases, plus Coda and Crescendo,
 * which sit outside any Mood. Before a song starts only the Intros are.
 */
export function isPlayable(phrase: Phrase, mood: SongMood): boolean {
  if (mood === 'none') return phrase.requires === null;
  return phrase.requires === mood || phrase.requires === 'any';
}

/**
 * The current Mood's Phrases come first, then the ones playable in any Mood,
 * then everything else grouped by the Mood it belongs to.
 */
export function sortPhrases(phrases: readonly Phrase[], mood: SongMood): Phrase[] {
  const rank = (p: Phrase): number => {
    if (mood === 'none') {
      if (p.requires === null) return 0;
      return p.requires === 'any' ? 1 : 2;
    }
    if (p.requires === mood) return 0;
    if (p.requires === 'any') return 1;
    if (p.requires === null) return 3;
    return 2;
  };

  return [...phrases]
    .map((p, i) => ({ p, i }))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map((x) => x.p);
}

/** Which colour a card wears: its own Mood, or neutral when it has none. */
export function phraseTone(phrase: Phrase): Mood | 'none' | 'any' {
  if (phrase.requires === null) return phrase.becomes === 'any' ? 'any' : (phrase.becomes as Mood);
  return phrase.requires;
}
