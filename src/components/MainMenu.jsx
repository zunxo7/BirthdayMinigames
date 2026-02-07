import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
    GameController,
    Storefront,
    Trophy,
    SignOut,
    Sparkle,
    Confetti,
    GearSix,
    SlidersHorizontal,
    Cake,
    Cookie
} from '@phosphor-icons/react';
import candyIcon from '../assets/Candy Icon.webp';

const FLOAT_CAKES = [
    { Icon: Cake, size: 40, top: '12%', left: '8%', delay: 0, duration: 5 },
    { Icon: Cookie, size: 28, top: '25%', right: '12%', delay: 0.5, duration: 6 },
    { Icon: Cake, size: 32, bottom: '25%', left: '15%', delay: 1, duration: 5.5 },
    { Icon: Cookie, size: 24, bottom: '15%', right: '18%', delay: 0.2, duration: 6.5 },
    { Icon: Cake, size: 36, top: '60%', left: '5%', delay: 1.2, duration: 5.2 },
    { Icon: Cookie, size: 30, top: '18%', right: '8%', delay: 0.8, duration: 6 },
];

const MainMenu = ({ onPlay, onShop, onLeaderboard, onSettings, onPanel }) => {
    const { profile, signOut } = useAuth();
    const isAdmin = profile?.username?.toLowerCase() === 'admin';

    return (
        <div className="main-menu">
            {/* Floating cakes/cookies in bg - motion for smoothness */}
            <div className="main-menu-bg-icons" aria-hidden>
                {FLOAT_CAKES.map(({ Icon, size, duration, delay, ...pos }, i) => (
                    <motion.div
                        key={i}
                        className="floating-bg-icon"
                        style={{
                            position: 'absolute',
                            color: '#ff6b9d',
                            opacity: 0.28,
                            pointerEvents: 'none',
                            top: pos.top,
                            left: pos.left,
                            right: pos.right,
                            bottom: pos.bottom,
                        }}
                        animate={{ y: [0, -14, 0], rotate: [0, 6, 0] }}
                        transition={{
                            duration: duration * 2.2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            delay,
                            ease: 'easeInOut',
                        }}
                    >
                        <Icon size={size} weight="fill" />
                    </motion.div>
                ))}
            </div>
            {/* Small sparkle/confetti accents - motion */}
            <motion.div className="floating-decoration dec-1" animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }} transition={{ duration: 12, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}>
                <Confetti size={32} weight="fill" />
            </motion.div>
            <motion.div className="floating-decoration dec-2" animate={{ y: [0, -12, 0], rotate: [0, -6, 0] }} transition={{ duration: 14, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}>
                <Sparkle size={24} weight="fill" />
            </motion.div>
            <motion.div className="floating-decoration dec-3" animate={{ y: [0, -12, 0], rotate: [0, 6, 0] }} transition={{ duration: 13, repeat: Infinity, repeatType: 'reverse', delay: 1, ease: 'easeInOut' }}>
                <Confetti size={28} weight="fill" />
            </motion.div>

            <motion.div
                className="user-bar"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
                <div className="user-info">
                    <div className="user-avatar">
                        {profile?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="user-name">{profile?.username || 'Player'}</span>
                    {isAdmin && <span className="admin-badge">Admin</span>}
                </div>
                <div className="user-stats">
                    <div className="candy-display">
                        <img src={candyIcon} alt="Candy" className="candy-icon" />
                        <span>{profile?.candies || 0}</span>
                    </div>
                    <button className="logout-btn" onClick={signOut} title="Logout">
                        <SignOut size={20} weight="bold" />
                    </button>
                </div>
            </motion.div>

            <div className="menu-content">
                <motion.h1
                    className="main-title"
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.95, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <span className="title-line">Birthday</span>
                    <span className="title-line accent">Minigames</span>
                </motion.h1>

                <motion.p
                    className="main-subtitle"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.85, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    Choose your adventure!
                </motion.p>

                <div className="menu-buttons">
                    {[
                        { onClick: onPlay, className: 'primary', Icon: GameController, label: 'Play' },
                        { onClick: onShop, className: 'secondary', Icon: Storefront, label: 'Shop' },
                        { onClick: onLeaderboard, className: 'secondary', Icon: Trophy, label: 'Leaderboard' },
                        { onClick: onSettings, className: 'secondary', Icon: SlidersHorizontal, label: 'Settings' },
                        ...(isAdmin ? [{ onClick: onPanel, className: 'admin', Icon: GearSix, label: 'Panel' }] : []),
                    ].map(({ onClick, className, Icon, label }, i) => (
                        <motion.button
                            key={label}
                            className={`menu-btn ${className}`}
                            onClick={onClick}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: 0.75,
                                delay: 0.3 + i * 0.12,
                                ease: [0.25, 0.46, 0.45, 0.94],
                            }}
                            whileHover={{ scale: 1.06, transition: { duration: 0.25 } }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Icon size={28} weight="fill" />
                            <span>{label}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MainMenu;

