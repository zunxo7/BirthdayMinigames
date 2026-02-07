import { useState, useEffect } from 'react';
import { ArrowLeft, Storefront, ShoppingCart, Eye, CaretLeft, CaretRight } from '@phosphor-icons/react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';
import ShopItemView from './ShopItemView';
import candyIcon from '../assets/Candy Icon.webp';

const ITEMS_PER_PAGE = 9;

const Shop = ({ onBack }) => {
    const { user, profile, updateCandies, fetchProfile } = useAuth();
    const [items, setItems] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewingItem, setViewingItem] = useState(null);
    const [purchasing, setPurchasing] = useState(null);
    const [errorModal, setErrorModal] = useState(null); // { title: string, message: string }
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchData();
    }, [user]);

    // Realtime: sync shop_items (prices, active state) without refresh
    useEffect(() => {
        const channel = supabase
            .channel('shop_items_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_items' }, () => {
                fetchData();
            })
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const fetchData = async () => {
        setLoading(true);

        // Fetch active shop items (order by sort_order then created_at)
        const { data: itemsData } = await supabase
            .from('shop_items')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (itemsData) {
            const sorted = [...itemsData].sort((a, b) => {
                const orderA = a.sort_order != null ? a.sort_order : 1e9;
                const orderB = b.sort_order != null ? b.sort_order : 1e9;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.created_at) - new Date(a.created_at);
            });
            setItems(sorted);
        }

        // Fetch user's purchases
        if (user) {
            const { data: purchasesData } = await supabase
                .from('purchases')
                .select('item_id')
                .eq('user_id', user.id);

            if (purchasesData) {
                setPurchases(purchasesData.map(p => p.item_id));
            }
        }

        setLoading(false);
    };

    const handlePurchase = async (item) => {
        if (!user || !profile) return;

        // Check if already purchased
        if (purchases.includes(item.id)) {
            setViewingItem(item);
            return;
        }

        // Check if enough candies
        if (profile.candies < item.price) {
            setErrorModal({
                title: 'Not enough candies!',
                message: `You need ${item.price} to buy this, but you only have ${profile.candies}.`
            });
            return;
        }

        setPurchasing(item.id);

        try {
            // Create purchase record
            const { error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                    user_id: user.id,
                    item_id: item.id
                });

            if (purchaseError) throw purchaseError;

            // Deduct candies
            await updateCandies(-item.price);

            // Refresh data
            await fetchData();
            await fetchProfile(user.id);

            // Show content
            setViewingItem(item);
        } catch (error) {
            console.error('Purchase failed:', error);
            setErrorModal({
                title: 'Purchase failed',
                message: 'Something went wrong. Please try again later.'
            });
        } finally {
            setPurchasing(null);
        }
    };

    const isPurchased = (itemId) => purchases.includes(itemId);

    const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
    const pageItems = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [totalPages, page]);

    if (viewingItem) {
        return (
            <ShopItemView
                item={viewingItem}
                onBack={() => setViewingItem(null)}
            />
        );
    }

    return (
        <div className="shop-page">
            {/* Error Modal */}
            {errorModal && (
                <div className="modal-backdrop" onClick={() => setErrorModal(null)}>
                    <div className="shop-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-icon error">
                            <ShoppingCart size={32} weight="fill" />
                        </div>
                        <h2 className="modal-title">{errorModal.title}</h2>
                        <p className="modal-subtitle">{errorModal.message}</p>
                        <button className="modal-btn primary" onClick={() => setErrorModal(null)}>
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="shop-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">Shop</h1>
                <div className="candy-display">
                    <img src={candyIcon} alt="Candy" className="candy-icon" />
                    <span>{profile?.candies || 0}</span>
                </div>
            </div>

            {/* Content */}
            <div className="shop-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="loading-spinner"></div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="empty-state">
                        <Storefront size={64} weight="light" />
                        <p>No items in shop yet</p>
                        <span>Check back later!</span>
                    </div>
                ) : (
                    <>
                        <div className="shop-grid">
                            {pageItems.map(item => (
                                <div key={item.id} className={`shop-card ${isPurchased(item.id) ? 'purchased' : ''}`}>
                                    <div className="shop-card-header">
                                        <div className="shop-card-icon">
                                            <ShoppingCart size={24} weight="fill" />
                                        </div>
                                        <div className="shop-card-info">
                                            <h3>{item.title}</h3>
                                            <span className="shop-card-subtitle">
                                                {isPurchased(item.id) ? 'You own this item' : 'Exclusive content'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="shop-card-footer">
                                        {isPurchased(item.id) ? (
                                            <button
                                                className="shop-btn view"
                                                onClick={() => setViewingItem(item)}
                                            >
                                                <Eye size={20} weight="bold" />
                                                <span>View Content</span>
                                            </button>
                                        ) : (
                                            <button
                                                className="shop-btn buy"
                                                onClick={() => handlePurchase(item)}
                                                disabled={purchasing === item.id || (profile && profile.candies < item.price)}
                                            >
                                                <img src={candyIcon} alt="" className="candy-icon-small" />
                                                <span>{item.price}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="shop-pagination">
                                <button
                                    className="shop-pagination-btn"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    aria-label="Previous page"
                                >
                                    <CaretLeft size={24} weight="bold" />
                                </button>
                                <span className="shop-pagination-info">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    className="shop-pagination-btn"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    aria-label="Next page"
                                >
                                    <CaretRight size={24} weight="bold" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Shop;
