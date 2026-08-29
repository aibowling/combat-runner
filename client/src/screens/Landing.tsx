import { useState } from 'react';
import type { Role } from '../shared/types';

interface Props {
  onJoin: (role: Role, name?: string) => void;
  error: string;
}

export default function Landing({ onJoin, error }: Props) {
  const [name, setName] = useState('');

  return (
    <div className="landing">
      <h1>The Clock</h1>
      <p className="subtitle">Terra initiative tracker</p>

      <div className="landing-actions">
        <button className="btn btn-large role-btn" onClick={() => onJoin('dm')}>
          <span className="role-btn-name">I'm the DM</span>
          <span className="role-btn-note">Your laptop. Hit points and enemies — keep it hidden.</span>
        </button>

        <button className="btn btn-large role-btn" onClick={() => onJoin('party')}>
          <span className="role-btn-name">Party screen</span>
          <span className="role-btn-note">The shared display. Clock and reactions, nothing secret.</span>
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
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            className="btn btn-primary btn-large"
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
