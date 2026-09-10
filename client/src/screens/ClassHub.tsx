interface Props {
  onOpen: (klass: 'bard') => void;
  onBack: () => void;
}

/**
 * Somewhere to put the classes whose turn is more than "roll and hit". Only the
 * Bard so far; the list is the part meant to grow.
 */
export default function ClassHub({ onOpen, onBack }: Props) {
  return (
    <div className="hub-view">
      <header className="hub-header">
        <button className="btn btn-ghost btn-small" onClick={onBack}>
          ← Back
        </button>
        <h1>Classes</h1>
        <span className="hub-header-spacer" />
      </header>

      <p className="hint-text">
        Trackers for the classes with more to keep hold of mid-fight.
      </p>

      <div className="class-grid">
        <button className="class-card class-card-bard" onClick={() => onOpen('bard')}>
          <span className="class-name">Bard</span>
          <span className="class-blurb">
            Song tracker — Mood, Tempo and Volume, with every Phrase to hand and the
            playable ones on top.
          </span>
        </button>
      </div>
    </div>
  );
}
