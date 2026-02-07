/**
 * Full-screen overlay shown when app is in "Updating" mode (DB: app_settings key "updating" = "true").
 * Blocks all user interaction until the flag is cleared.
 */
const UpdatingOverlay = () => {
    return (
        <div className="updating-overlay" role="alert" aria-live="polite">
            <div className="updating-content">
                <div className="updating-spinner" aria-hidden />
                <h1 className="updating-title">Updating</h1>
                <p className="updating-sub">Please wait. You can’t use the app right now.</p>
            </div>
        </div>
    );
};

export default UpdatingOverlay;
