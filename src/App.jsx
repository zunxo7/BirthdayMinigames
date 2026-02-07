import { useState, useEffect } from 'react';
import { SignOut, SmileySad } from '@phosphor-icons/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './supabase';
import LoginModal from './components/LoginModal';
import MainMenu from './components/MainMenu';
import GameSelection from './components/GameSelection';
import GameCanvas from './components/GameCanvas';
import Shop from './components/Shop';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';
import AnnouncementBanner from './components/AnnouncementBanner';
import GlobalEffects from './components/GlobalEffects';
import UpdatingOverlay from './components/UpdatingOverlay';
import { CandyMultiplierProvider, CandyMultiplierBadge } from './context/CandyMultiplierContext';

const AppContent = () => {
  const { user, profile, loading, signOut } = useAuth();
  const [screen, setScreen] = useState('menu'); // 'menu' | 'games' | 'play' | 'shop' | 'leaderboard' | 'settings' | 'panel'
  const [gameType, setGameType] = useState('pinata');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch "updating" flag from DB (when authenticated); re-check on visibility so admin can clear it
  useEffect(() => {
    if (!user) {
      setIsUpdating(false);
      return;
    }
    const fetchUpdating = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'updating').maybeSingle();
      setIsUpdating(data?.value === 'true' || data?.value === '1');
    };
    fetchUpdating();
    const onVis = () => fetchUpdating();
    document.addEventListener('visibilitychange', onVis);
    const interval = setInterval(fetchUpdating, 20000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(interval);
    };
  }, [user]);

  // Show loading state
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginModal onSuccess={() => setScreen('menu')} />;
  }

  // Show banned screen if user is banned
  if (profile?.is_banned) {
    return (
      <div className="banned-overlay">
        <div className="banned-content">
          <div className="banned-logout-wrap">
            <button className="logout-btn" onClick={signOut} title="Logout">
              <SignOut size={20} weight="bold" />
            </button>
          </div>
          <SmileySad size={80} weight="fill" color="#ff4757" />
          <h1>You are Banned</h1>
          <p className="ban-sub">Your account has been restricted.</p>
          <div className="ban-reason-box">
            <p className="reason-label">Reason:</p>
            <p className="reason-text">{profile.ban_reason || 'No reason specified'}</p>
          </div>
          <p className="ban-logout-hint">You may log out.</p>
        </div>
      </div>
    );
  }

  // Main app screens
  return (
    <CandyMultiplierProvider>
      <div className="app-container">
        {/* Global announcement banner */}
        <AnnouncementBanner />
        <GlobalEffects />
        <CandyMultiplierBadge />

        {/* Updating overlay: blocks all interaction when DB app_settings.updating = true (hidden for admin so they can turn it off from Panel) */}
        {isUpdating && profile?.username?.toLowerCase() !== 'admin' && <UpdatingOverlay />}

      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('games')}
          onShop={() => setScreen('shop')}
          onLeaderboard={() => setScreen('leaderboard')}
          onSettings={() => setScreen('settings')}
          onPanel={() => setScreen('panel')}
        />
      )}
      {screen === 'games' && (
        <GameSelection
          onSelectGame={(gameId) => {
            setGameType(gameId);
            setScreen('play');
          }}
          onBack={() => setScreen('menu')}
        />
      )}
      {screen === 'play' && (
        <GameCanvas
          gameType={gameType}
          onBack={() => setScreen('games')}
        />
      )}
      {screen === 'shop' && (
        <Shop onBack={() => setScreen('menu')} />
      )}
      {screen === 'leaderboard' && (
        <Leaderboard onBack={() => setScreen('menu')} />
      )}
      {screen === 'settings' && (
        <Settings onBack={() => setScreen('menu')} />
      )}
      {screen === 'panel' && (
        <AdminPanel onBack={() => setScreen('menu')} />
      )}
      </div>
    </CandyMultiplierProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

