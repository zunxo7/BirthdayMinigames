import { ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';

const Settings = ({ onBack }) => {
    const { profile, updateProfileSetting } = useAuth();
    const showTutorials = profile?.show_tutorials !== false;

    const handleTutorialToggle = async () => {
        await updateProfileSetting('show_tutorials', !showTutorials);
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <button className="back-btn" onClick={onBack} aria-label="Back">
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Settings</h1>
                <div className="header-spacer" />
            </div>
            <div className="settings-content">
                <div className="settings-card">
                    <label className="settings-row">
                        <span className="settings-label">Show tutorials before each game</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={showTutorials}
                            className={`settings-toggle ${showTutorials ? 'on' : 'off'}`}
                            onClick={handleTutorialToggle}
                        >
                            <span className="settings-toggle-knob" />
                        </button>
                    </label>
                    <p className="settings-hint">When on, you’ll see controls and goals before starting a game.</p>
                </div>
            </div>
        </div>
    );
};

export default Settings;
