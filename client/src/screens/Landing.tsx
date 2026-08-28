import { useState } from 'react';

interface Props {
  onJoin: (role: 'dm' | 'player', name?: string) => void;
  error: string;
}

export default function Landing({ onJoin, error }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="landing">
      <h1>The Clock</h1>
      <p className="subtitle">Terra initiative tracker</p>

      <div className="landing-actions">
        <button
          className="btn btn-primary btn-large"
          onClick={() => onJoin('dm')}
        >
          I'm the DM
        </button>

        <div className="divider">or</div>

        <div className="player-join">
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onJoin('player', name.trim())}
            maxLength={40}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            className="btn btn-secondary btn-large"
            onClick={() => name.trim() && onJoin('player', name.trim())}
            disabled={!name.trim()}
          >
            Join as Player
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
