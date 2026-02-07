import { useState, useEffect } from 'react';
import { ArrowLeft, Storefront, Megaphone, Plus, MagicWand, Users, Trash, Cake, Heart, Confetti, Gear, DotsSixVertical, Warning } from '@phosphor-icons/react';
import { supabase } from '../supabase';
import ContentEditor from './ContentEditor';
import AnnouncementManager from './AnnouncementManager';
import candyIcon from '../assets/Candy Icon.webp';

const AdminPanel = ({ onBack }) => {
    const [activeTab, setActiveTab] = useState('shop'); // 'shop' | 'announcements' | 'events' | 'users'
    const [shopItems, setShopItems] = useState([]);
    const [editingItem, setEditingItem] = useState(null);
    const [showEditor, setShowEditor] = useState(false);
    const [loading, setLoading] = useState(true);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [users, setUsers] = useState([]);
    const [birthdayName, setBirthdayName] = useState('');
    const [candyMultiplierDuration, setCandyMultiplierDuration] = useState(5); // minutes
    const [candyMultiplierValue, setCandyMultiplierValue] = useState(2);
    const [candyUpdate, setCandyUpdate] = useState({ userId: null, amount: '' });
    const [banConfig, setBanConfig] = useState({ userId: null, username: '', reason: '' });
    const [showBanModal, setShowBanModal] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
    const [confirmDeleteUsername, setConfirmDeleteUsername] = useState('');
    const [toastMessage, setToastMessage] = useState(null); // { message, type: 'success' | 'error' }
    const [dragItemId, setDragItemId] = useState(null);
    const [dragOverItemId, setDragOverItemId] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');
    const [editingPriceId, setEditingPriceId] = useState(null);
    const [editingPriceValue, setEditingPriceValue] = useState('');
    const [editingUsernameId, setEditingUsernameId] = useState(null);
    const [editingUsernameValue, setEditingUsernameValue] = useState('');
    const [updatingMode, setUpdatingMode] = useState(false);
    const [updatingModeLoading, setUpdatingModeLoading] = useState(false);

    const showToast = (message, type = 'success') => {
        setToastMessage({ message, type });
        setTimeout(() => setToastMessage(null), 3000);
    };

    useEffect(() => {
        if (activeTab === 'shop') fetchShopItems();
        if (activeTab === 'users') fetchUsers();
    }, [activeTab]);

    useEffect(() => {
        const fetchUpdating = async () => {
            const { data } = await supabase.from('app_settings').select('value').eq('key', 'updating').maybeSingle();
            setUpdatingMode(data?.value === 'true' || data?.value === '1');
        };
        fetchUpdating();
    }, []);

    const fetchShopItems = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shop_items')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const sorted = [...data].sort((a, b) => {
                const orderA = a.sort_order != null ? a.sort_order : 1e9;
                const orderB = b.sort_order != null ? b.sort_order : 1e9;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setShopItems(sorted);
        }
        setLoading(false);
    };

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('username', { ascending: true });

        if (!error && data) {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleCreateNew = () => {
        setEditingItem(null);
        setShowEditor(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setShowEditor(true);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDeleteId) return;

        const { error } = await supabase
            .from('shop_items')
            .delete()
            .eq('id', confirmDeleteId);

        if (!error) {
            fetchShopItems();
            setConfirmDeleteId(null);
        }
    };

    const handleToggleActive = async (item) => {
        const { error } = await supabase
            .from('shop_items')
            .update({ is_active: !item.is_active })
            .eq('id', item.id);

        if (!error) {
            fetchShopItems();
        }
    };

    const handleDragStart = (e, item) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
        setDragItemId(item.id);
    };

    const handleDragOver = (e, item) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (item.id !== dragItemId) setDragOverItemId(item.id);
    };

    const handleDragLeave = () => setDragOverItemId(null);

    const handleDrop = async (e, targetItem) => {
        e.preventDefault();
        setDragOverItemId(null);
        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || sourceId === targetItem.id) return;
        setDragItemId(null);

        const fromIndex = shopItems.findIndex((i) => i.id === sourceId);
        const toIndex = shopItems.findIndex((i) => i.id === targetItem.id);
        if (fromIndex === -1 || toIndex === -1) return;

        const reordered = [...shopItems];
        const [removed] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, removed);
        setShopItems(reordered);

        let err = null;
        for (let i = 0; i < reordered.length; i++) {
            const { error } = await supabase.from('shop_items').update({ sort_order: i }).eq('id', reordered[i].id);
            if (error) err = error;
        }
        if (!err) showToast('Order saved');
        else showToast(err.message || 'Failed to save order (add sort_order column if missing)', 'error');
    };

    const handleDragEnd = () => {
        setDragItemId(null);
        setDragOverItemId(null);
    };

    const startEditingTitle = (item) => {
        setEditingTitleId(item.id);
        setEditingTitleValue(item.title || '');
    };

    const saveTitle = async () => {
        if (!editingTitleId) return;
        const value = editingTitleValue.trim();
        if (!value) {
            setEditingTitleId(null);
            return;
        }
        const { error } = await supabase
            .from('shop_items')
            .update({ title: value })
            .eq('id', editingTitleId);
        if (!error) {
            setShopItems((prev) => prev.map((it) => (it.id === editingTitleId ? { ...it, title: value } : it)));
            showToast('Title updated');
        } else showToast(error.message || 'Failed to update title', 'error');
        setEditingTitleId(null);
    };

    const startEditingPrice = (item) => {
        setEditingPriceId(item.id);
        setEditingPriceValue(String(item.price ?? 0));
    };

    const savePrice = async () => {
        if (!editingPriceId) return;
        const parsed = parseInt(editingPriceValue, 10);
        const value = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        const { error } = await supabase
            .from('shop_items')
            .update({ price: value })
            .eq('id', editingPriceId);
        if (!error) {
            setShopItems((prev) => prev.map((it) => (it.id === editingPriceId ? { ...it, price: value } : it)));
            showToast('Price updated');
        } else {
            showToast(error.message || 'Failed to update price', 'error');
        }
        setEditingPriceId(null);
    };

    const handleSaveItem = async (itemData) => {
        if (editingItem) {
            // Update existing
            const { error } = await supabase
                .from('shop_items')
                .update(itemData)
                .eq('id', editingItem.id);

            if (!error) {
                fetchShopItems();
                showToast('Item saved successfully!', 'success');
                setTimeout(() => setShowEditor(false), 1500); // Close after showing toast
            } else {
                showToast(`Error saving item: ${error.message}`, 'error');
            }
        } else {
            // Create new
            const { error } = await supabase
                .from('shop_items')
                .insert(itemData);

            if (!error) {
                fetchShopItems();
                showToast('Item created successfully!', 'success');
                setTimeout(() => setShowEditor(false), 1500);
            } else {
                showToast(`Error creating item: ${error.message}`, 'error');
            }
        }
    };

    const EVENT_CANDY = { confetti: 25, hearts: 25, birthday: 50 };

    const triggerEffect = async (type, data = {}) => {
        const candy = EVENT_CANDY[type] || 0;
        await supabase.channel('global_effects').send({
            type: 'broadcast',
            event: 'trigger_effect',
            payload: { type, data, candy }
        });
    };

    const handleUpdateCandies = async (userId) => {
        const amount = parseInt(candyUpdate.amount);
        if (!amount || isNaN(amount)) return;

        const { error } = await supabase.rpc('update_user_candies', {
            user_id: userId,
            amount_to_add: amount
        });

        // If RPC fails (likely not created), fallback to manual fetch/update
        if (error) {
            const { data: user } = await supabase.from('profiles').select('candies').eq('id', userId).single();
            if (user) {
                await supabase.from('profiles').update({ candies: (user.candies || 0) + amount }).eq('id', userId);
            }
        }

        setCandyUpdate({ userId: null, amount: '' });
        fetchUsers();
    };

    const handleBanUser = async () => {
        const { userId, reason } = banConfig;
        if (!userId) return;

        const { error } = await supabase
            .from('profiles')
            .update({
                is_banned: true,
                ban_reason: reason || 'Reason not specified'
            })
            .eq('id', userId);

        if (!error) {
            showToast(`User banned successfully`, 'success');
            setShowBanModal(false);
            setBanConfig({ userId: null, username: '', reason: '' });
            fetchUsers();
        } else {
            showToast(`Error: ${error.message}`, 'error');
        }
    };

    const handleUnbanUser = async (userId) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_banned: false, ban_reason: null })
            .eq('id', userId);

        if (!error) {
            showToast(`User unbanned`, 'success');
            fetchUsers();
        }
    };

    const startEditingUsername = (user) => {
        setEditingUsernameId(user.id);
        setEditingUsernameValue(user.username || '');
    };

    const saveUsername = async () => {
        if (!editingUsernameId) return;
        const value = editingUsernameValue.trim();
        if (!value) {
            setEditingUsernameId(null);
            return;
        }
        const { error } = await supabase
            .from('profiles')
            .update({ username: value })
            .eq('id', editingUsernameId);
        if (!error) {
            setUsers((prev) => prev.map((u) => (u.id === editingUsernameId ? { ...u, username: value } : u)));
            showToast('Username updated');
        } else {
            showToast(error?.message || 'Failed to update username', 'error');
        }
        setEditingUsernameId(null);
    };

    const handleDeleteAccount = async () => {
        const userId = confirmDeleteUserId;
        if (!userId) return;

        setLoading(true);
        try {
            await supabase.from('purchases').delete().eq('user_id', userId);
            await supabase.from('game_stats').delete().eq('user_id', userId);
            const { error } = await supabase.from('profiles').delete().eq('id', userId);
            if (error) throw error;
            showToast('Account deleted');
            setConfirmDeleteUserId(null);
            setConfirmDeleteUsername('');
            fetchUsers();
        } catch (err) {
            showToast(err?.message || 'Failed to delete', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEnableUpdatingMode = async () => {
        setUpdatingModeLoading(true);
        const { error } = await supabase.from('app_settings').upsert({ key: 'updating', value: 'true' }, { onConflict: 'key' });
        if (!error) {
            setUpdatingMode(true);
            showToast('Updating mode enabled. All users now see the overlay.');
        } else {
            showToast('Failed to enable', 'error');
        }
        setUpdatingModeLoading(false);
    };

    const handleDisableUpdatingMode = async () => {
        setUpdatingModeLoading(true);
        const { error } = await supabase.from('app_settings').upsert({ key: 'updating', value: 'false' }, { onConflict: 'key' });
        if (!error) {
            setUpdatingMode(false);
            showToast('Updating mode disabled.');
        } else {
            showToast('Failed to disable', 'error');
        }
        setUpdatingModeLoading(false);
    };

    const handleGlobalReset = async () => {
        setLoading(true);
        try {
            // 1. Wipe all high scores
            await supabase.from('game_stats').delete().neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

            // 2. Wipe all purchases
            await supabase.from('purchases').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');

            // 3. Reset all user candies to 0
            await supabase.from('profiles').update({ candies: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');

            showToast('Global reset complete!', 'success');
            setShowResetConfirm(false);
            fetchUsers();
            fetchShopItems();
        } catch (err) {
            showToast('Reset failed!', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (showEditor) {
        return (
            <ContentEditor
                item={editingItem}
                onSave={handleSaveItem}
                onCancel={() => setShowEditor(false)}
            />
        );
    }

    return (
        <div className="admin-panel">
            {/* Toast Notification */}
            {toastMessage && (
                <div className={`admin-toast ${toastMessage.type}`}>
                    {toastMessage.type === 'success' ? <Gear size={20} weight="fill" /> : <Megaphone size={20} weight="fill" />}
                    <span>{toastMessage.message}</span>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Delete Item?</h2>
                        <p className="modal-subtitle">This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => setConfirmDeleteId(null)}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleDeleteConfirm}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Modal */}
            {showBanModal && (
                <div className="modal-backdrop" onClick={() => setShowBanModal(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Plus size={32} weight="fill" className="rotate-45" />
                        </div>
                        <h2 className="modal-title">Ban {banConfig.username}?</h2>
                        <p className="modal-subtitle">Enter a reason for this ban.</p>
                        <textarea
                            className="admin-textarea"
                            placeholder="Reason (e.g., Harassment, Cheating)"
                            value={banConfig.reason}
                            onChange={e => setBanConfig({ ...banConfig, reason: e.target.value })}
                        />
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => setShowBanModal(false)}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleBanUser}>
                                Ban Player
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete user confirmation */}
            {confirmDeleteUserId && (
                <div className="modal-backdrop" onClick={() => { setConfirmDeleteUserId(null); setConfirmDeleteUsername(''); }}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Delete?</h2>
                        <p className="modal-subtitle">
                            Permanently delete <strong>{confirmDeleteUsername}</strong>? All their candies, scores, and purchases will be removed. They will not be able to use the app. This cannot be undone.
                        </p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => { setConfirmDeleteUserId(null); setConfirmDeleteUsername(''); }}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleDeleteAccount}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Reset Modal */}
            {showResetConfirm && (
                <div className="modal-backdrop" onClick={() => setShowResetConfirm(false)}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon delete">
                            <Trash size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">Global Reset?</h2>
                        <p className="modal-subtitle">This will clear ALL high scores, candies, and items for EVERYONE.</p>
                        <div className="modal-actions">
                            <button className="modal-btn" onClick={() => setShowResetConfirm(false)}>
                                Cancel
                            </button>
                            <button className="modal-btn delete" onClick={handleGlobalReset}>
                                YES, RESET EVERYTHING
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="admin-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Admin Panel</h1>
                <div className="header-spacer"></div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs-container">
                <div className="admin-tabs">
                    <button
                        className={`admin-tab ${activeTab === 'shop' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shop')}
                    >
                        <Storefront size={20} weight="fill" />
                        <span>Shop</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'announcements' ? 'active' : ''}`}
                        onClick={() => setActiveTab('announcements')}
                    >
                        <Megaphone size={20} weight="fill" />
                        <span>Announcements</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'events' ? 'active' : ''}`}
                        onClick={() => setActiveTab('events')}
                    >
                        <MagicWand size={20} weight="fill" />
                        <span>Events</span>
                    </button>
                    <button
                        className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={20} weight="fill" />
                        <span>Users</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="admin-content">
                {/* Updating overlay control */}
                <div className="admin-updating-card">
                    <div className="admin-updating-status">
                        <span className="admin-updating-label">Updating overlay:</span>
                        <span className={`admin-updating-badge ${updatingMode ? 'on' : 'off'}`}>
                            {updatingMode ? 'ON' : 'OFF'}
                        </span>
                    </div>
                    {!updatingMode ? (
                        <button
                            type="button"
                            className="admin-updating-btn"
                            onClick={handleEnableUpdatingMode}
                            disabled={updatingModeLoading}
                        >
                            <Warning size={18} weight="fill" />
                            <span>Enable Updating mode</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="admin-updating-btn admin-updating-btn-off"
                            onClick={handleDisableUpdatingMode}
                            disabled={updatingModeLoading}
                        >
                            <span>Disable Updating mode</span>
                        </button>
                    )}
                </div>

                {activeTab === 'shop' && (
                    <div className="shop-management">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
                                <h2>Shop Items</h2>
                                <p>Create and manage premium items for the candy marketplace</p>
                            </div>
                            <button className="add-btn btn-yellow" onClick={handleCreateNew}>
                                <Plus size={20} weight="bold" />
                                <span>New Item</span>
                            </button>
                        </div>
                        {loading ? (
                            <div className="loading-spinner"></div>
                        ) : shopItems.length === 0 ? (
                            <div className="empty-state">
                                <Storefront size={48} weight="light" />
                                <p>No shop items yet</p>
                            </div>
                        ) : (
                            <div className="admin-grid-layout">
                                {shopItems.map(item => (
                                    <div
                                        key={item.id}
                                        className={`admin-card shop-item-card ${!item.is_active ? 'inactive' : ''} ${dragOverItemId === item.id ? 'drag-over' : ''} ${dragItemId === item.id ? 'dragging' : ''}`}
                                        onDragOver={(e) => handleDragOver(e, item)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, item)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="admin-card-header">
                                            <div className="admin-card-header-left">
                                                <div
                                                    className="admin-card-drag-handle"
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, item)}
                                                    title="Drag to reorder"
                                                >
                                                    <DotsSixVertical size={20} weight="bold" />
                                                </div>
                                                <div className="admin-card-icon icon-bg-yellow black-border">
                                                    <Storefront size={24} weight="fill" color="#ffd93d" />
                                                </div>
                                                <div className="admin-card-title-wrap">
                                                    {editingTitleId === item.id ? (
                                                        <input
                                                            className="admin-card-title-input"
                                                            value={editingTitleValue}
                                                            onChange={(e) => setEditingTitleValue(e.target.value)}
                                                            onBlur={saveTitle}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveTitle();
                                                                if (e.key === 'Escape') setEditingTitleId(null);
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3 className="admin-card-title" onClick={() => startEditingTitle(item)} title="Click to rename">
                                                            {item.title}
                                                        </h3>
                                                    )}
                                                    <span className={`item-status ${item.is_active ? 'active' : 'inactive'}`}>
                                                        {item.is_active ? 'Active' : 'Hidden'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="admin-card-price">
                                                {editingPriceId === item.id ? (
                                                    <div className="price-tag price-tag-editing">
                                                        <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="admin-card-price-input"
                                                            value={editingPriceValue}
                                                            onChange={(e) => setEditingPriceValue(e.target.value)}
                                                            onBlur={savePrice}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') savePrice();
                                                                if (e.key === 'Escape') setEditingPriceId(null);
                                                            }}
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="price-tag" onClick={() => startEditingPrice(item)} title="Click to edit price">
                                                        <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                                        <span>{item.price}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="admin-card-content">
                                            {item.canvas_width}x{item.canvas_height} Canvas • {item.content?.length || 0} Elements
                                        </div>

                                        <div className="admin-card-actions">
                                            <button className="admin-btn admin-btn-secondary" onClick={() => handleEdit(item)}>
                                                Edit
                                            </button>
                                            <button className={`admin-btn ${item.is_active ? 'btn-red' : 'btn-green'}`} onClick={() => handleToggleActive(item)}>
                                                {item.is_active ? 'Hide' : 'Show'}
                                            </button>
                                            <button className="admin-btn admin-btn-danger" onClick={() => setConfirmDeleteId(item.id)}>
                                                <Trash size={18} weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'announcements' && (
                    <AnnouncementManager />
                )}

                {activeTab === 'events' && (
                    <div className="events-panel">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
<h2>Events</h2>
                            <p>Deploy visual particles and immersive events to all active players</p>
                            </div>
                        </div>
                        <div className="admin-grid-layout">
                            <div className="admin-card event-card">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-yellow black-border">
                                        <Confetti size={32} weight="fill" color="#ffd93d" />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Confetti Party</h3>
                                        <span className="admin-card-subtitle">Celebration Wave</span>
                                    </div>
                                </div>
                                <p className="admin-card-description">
                                    Triggers a massive confetti explosion on everyone's screen.
                                </p>
                                <button className="trigger-btn btn-yellow" onClick={() => triggerEffect('confetti')}>
                                    Trigger Rain
                                </button>
                                <div className="event-candy-badge" title="Candy reward">
                                    <img src={candyIcon} alt="" className="event-candy-icon" />
                                    <span>×{EVENT_CANDY.confetti}</span>
                                </div>
                            </div>

                            <div className="admin-card event-card">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-pink">
                                        <Heart size={32} weight="fill" color="#ff6b9d" />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Heart Gush</h3>
                                        <span className="admin-card-subtitle">Love is in the air</span>
                                    </div>
                                </div>
                                <p className="admin-card-description">
                                    Releases floating heart particles on everyone's screen.
                                </p>
                                <button className="trigger-btn" onClick={() => triggerEffect('hearts')}>
                                    Spread Love
                                </button>
                                <div className="event-candy-badge" title="Candy reward">
                                    <img src={candyIcon} alt="" className="event-candy-icon" />
                                    <span>×{EVENT_CANDY.hearts}</span>
                                </div>
                            </div>

                            <div className="admin-card event-card">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-red">
                                        <Cake size={32} weight="fill" color="#ff9ec4" />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Birthday Wish</h3>
                                        <span className="admin-card-subtitle">Personal Celebration</span>
                                    </div>
                                </div>
                                <div className="effect-inputs">
                                    <input
                                        type="text"
                                        placeholder="Whose bday?"
                                        value={birthdayName}
                                        onChange={(e) => setBirthdayName(e.target.value)}
                                        className="birthday-input"
                                    />
                                    <button
                                        className="birthday-btn"
                                        onClick={() => triggerEffect('birthday', { name: birthdayName })}
                                        disabled={!birthdayName.trim()}
                                    >
                                        Go!
                                    </button>
                                </div>
                                <div className="event-candy-badge" title="Candy reward">
                                    <img src={candyIcon} alt="" className="event-candy-icon" />
                                    <span>×{EVENT_CANDY.birthday}</span>
                                </div>
                            </div>

                            <div className="admin-card event-card">
                                <div className="admin-card-header-left">
                                    <div className="admin-card-icon icon-bg-yellow black-border">
                                        <img src={candyIcon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                                    </div>
                                    <div>
                                        <h3 className="admin-card-title">Candy Multiplier</h3>
                                        <span className="admin-card-subtitle">2× or 3× candy for all players</span>
                                    </div>
                                </div>
                                <p className="admin-card-description">
                                    All players earn multiplied candy for the duration. Shows on every screen with a countdown.
                                </p>
                                <div className="effect-inputs">
                                    <label className="effect-label">Multiplier</label>
                                    <select
                                        value={candyMultiplierValue}
                                        onChange={(e) => setCandyMultiplierValue(Number(e.target.value))}
                                        className="effect-select"
                                    >
                                        <option value={2}>2×</option>
                                        <option value={3}>3×</option>
                                    </select>
                                    <label className="effect-label">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={120}
                                        value={candyMultiplierDuration}
                                        onChange={(e) => setCandyMultiplierDuration(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                                        className="birthday-input"
                                    />
                                    <button
                                        className="trigger-btn"
                                        onClick={() => triggerEffect('candy_multiplier', {
                                            multiplier: candyMultiplierValue,
                                            durationSeconds: candyMultiplierDuration * 60
                                        })}
                                    >
                                        Start ×{candyMultiplierValue} for {candyMultiplierDuration} min
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="users-panel">
                        <div className="admin-section-header">
                            <div className="admin-section-header-content">
                                <h2>User Management</h2>
                                <p>Monitor players, manage account statuses, and perform system resets</p>
                            </div>
                            <button
                                className="admin-btn admin-btn-danger max-w-200"
                                onClick={() => setShowResetConfirm(true)}
                            >
                                <Trash size={20} weight="fill" />
                                Global Reset
                            </button>
                        </div>
                        {loading ? (
                            <div className="loading-spinner"></div>
                        ) : (
                            <div className="admin-grid-layout">
                                {users.map(user => (
                                    <div key={user.id} className="admin-card">
                                        <div className="user-card-header">
                                            <div className="user-info">
                                                <div className={`user-avatar-circle ${user.is_banned ? 'btn-toggle-active' : 'primary-bg'}`}>
                                                    {(editingUsernameId === user.id ? editingUsernameValue : user.username)?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    {editingUsernameId === user.id ? (
                                                        <input
                                                            type="text"
                                                            className="user-username-input"
                                                            value={editingUsernameValue}
                                                            onChange={(e) => setEditingUsernameValue(e.target.value)}
                                                            onBlur={saveUsername}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') saveUsername();
                                                                if (e.key === 'Escape') setEditingUsernameId(null);
                                                            }}
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <h3 className="user-username" onClick={() => startEditingUsername(user)} title="Click to edit username">
                                                            {user.username}
                                                        </h3>
                                                    )}
                                                    <span className={`user-role ${(editingUsernameId === user.id ? editingUsernameValue : user.username)?.toLowerCase() === 'admin' ? 'admin' : ''}`}>
                                                        {(editingUsernameId === user.id ? editingUsernameValue : user.username)?.toLowerCase() === 'admin' ? 'Administrator' : 'Player'}
                                                    </span>
                                                </div>
                                            </div>
                                            {user.is_banned && (
                                                <span className="banned-tag">BANNED</span>
                                            )}
                                        </div>

                                        <div className="user-stats-bar">
                                            <img src={candyIcon} alt="Candy" className="candy-icon-small" />
                                            <span className="user-candies-text">{user.candies} Candies</span>
                                        </div>

                                        <div className="user-candy-actions">
                                            <div className="candy-input-wrapper">
                                                <input
                                                    type="number"
                                                    placeholder="+ Amount"
                                                    className="candy-input"
                                                    value={candyUpdate.userId === user.id ? candyUpdate.amount : ''}
                                                    onChange={(e) => setCandyUpdate({ userId: user.id, amount: e.target.value })}
                                                />
                                            </div>
                                            <button
                                                className="add-candy-btn"
                                                onClick={() => handleUpdateCandies(user.id)}
                                                disabled={candyUpdate.userId !== user.id || !candyUpdate.amount}
                                            >
                                                Add
                                            </button>
                                        </div>

                                        <div className="user-danger-actions">
                                            {user.username?.toLowerCase() !== 'admin' && (
                                                <>
                                                    {user.is_banned ? (
                                                        <button
                                                            className="unban-btn"
                                                            onClick={() => handleUnbanUser(user.id)}
                                                        >
                                                            Unban Player
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="ban-btn-trigger"
                                                            onClick={() => {
                                                                setBanConfig({ userId: user.id, username: user.username, reason: '' });
                                                                setShowBanModal(true);
                                                            }}
                                                        >
                                                            Ban Player
                                                        </button>
                                                    )}
                                                    <button
                                                        className="admin-btn admin-btn-danger delete-account-btn"
                                                        onClick={() => {
                                                            setConfirmDeleteUserId(user.id);
                                                            setConfirmDeleteUsername(user.username || 'this user');
                                                        }}
                                                    >
                                                        <Trash size={16} weight="bold" />
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
