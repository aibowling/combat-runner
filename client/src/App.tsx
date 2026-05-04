import { useState, useEffect } from 'react';
import { useStore } from './store';
import { initSession, connectSocket, sendHello } from './socket';
import Landing from './screens/Landing';
import DmView from './screens/DmView';
import PlayerView from './screens/PlayerView';
import ConnectionBanner from './components/ConnectionBanner';
import TurnBanner from './components/TurnBanner';

type Screen = 'loading' | 'landing' | 'dm' | 'player';

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
                setScreen(ack.isDm ? 'dm' : 'player');
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

  const handleJoin = (role: 'dm' | 'player', name?: string) => {
    setError('');
    sendHello({ role, name }, (ack) => {
      if (ack.ok) {
        setScreen(ack.isDm ? 'dm' : 'player');
      } else {
        setError(ack.message || 'Failed to join');
      }
    });
  };

  const handleLeave = () => {
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
      {screen === 'player' && <PlayerView onLeave={handleLeave} />}
    </div>
  );
}
