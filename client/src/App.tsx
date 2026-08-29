import { useState, useEffect } from 'react';
import { useStore } from './store';
import type { Role } from './shared/types';
import { initSession, connectSocket, sendHello, clearHello } from './socket';
import Landing from './screens/Landing';
import DmView from './screens/DmView';
import PartyView from './screens/PartyView';
import PlayerView from './screens/PlayerView';
import ConnectionBanner from './components/ConnectionBanner';
import TurnBanner from './components/TurnBanner';

type Screen = 'loading' | 'landing' | 'dm' | 'party' | 'player';

export default function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [error, setError] = useState('');
  const connected = useStore((s) => s.connected);

  useEffect(() => {
    (async () => {
      try {
        await initSession();

        connectSocket();

        const stored = localStorage.getItem('drews-session');
        if (stored) {
          const info = JSON.parse(stored);
          sendHello(
            { role: info.role, name: info.name },
            (ack) => {
              if (ack.ok) {
                setScreen(ack.role);
              } else {
                localStorage.removeItem('drews-session');
                setScreen('landing');
              }
            }
          );
        } else {
          setScreen('landing');
        }
      } catch {
        setScreen('landing');
      }
    })();
  }, []);

  const handleJoin = (role: Role, name?: string) => {
    setError('');
    sendHello({ role, name }, (ack) => {
      if (ack.ok) {
        setScreen(ack.role);
      } else {
        setError(ack.message || 'Failed to join');
      }
    });
  };

  const handleLeave = () => {
    clearHello();
    localStorage.removeItem('drews-session');
    setScreen('landing');
  };

  return (
    <div className="app">
      <ConnectionBanner />
      <TurnBanner />
      {screen === 'loading' && <div className="loading">Connecting...</div>}
      {screen === 'landing' && <Landing onJoin={handleJoin} error={error} />}
      {screen === 'dm' && <DmView onLeave={handleLeave} />}
      {screen === 'party' && <PartyView onLeave={handleLeave} />}
      {screen === 'player' && <PlayerView onLeave={handleLeave} />}
    </div>
  );
}
