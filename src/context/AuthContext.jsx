import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch profile data
    const fetchProfile = async (userId) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!error && data) {
            setProfile(data);
        }
        return data;
    };

    // Sign up with username
    const signUp = async (username) => {
        const email = `${username.toLowerCase()}@minigames.local`;
        const password = username.toLowerCase();

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) throw error;

        // Create profile
        if (data.user) {
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    username: username, // Keep original case
                    candies: 0
                });

            if (profileError) throw profileError;
            await fetchProfile(data.user.id);
        }

        return data;
    };

    // Sign in with username
    const signIn = async (username) => {
        const email = `${username.toLowerCase()}@minigames.local`;
        const password = username.toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            await fetchProfile(data.user.id);
        }

        return data;
    };

    // Sign in as admin with password
    const signInAdmin = async (password) => {
        // Admin uses a specific email set up in Supabase Auth
        const email = 'admin@minigames.local';

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        if (data.user) {
            // Check if profile exists, if not create it
            const existingProfile = await fetchProfile(data.user.id);
            if (!existingProfile) {
                await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        username: 'admin',
                        candies: 9999
                    });
                await fetchProfile(data.user.id);
            }
        }

        return data;
    };

    // Sign out
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setProfile(null);
    };

    // Update candies
    const updateCandies = async (amount) => {
        if (!user) return;

        const newAmount = (profile?.candies || 0) + amount;
        const { error } = await supabase
            .from('profiles')
            .update({ candies: newAmount })
            .eq('id', user.id);

        if (!error) {
            setProfile(prev => ({ ...prev, candies: newAmount }));
        }
    };

    // Update user setting (e.g. show_tutorials)
    const updateProfileSetting = async (key, value) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update({ [key]: value })
            .eq('id', user.id);
        if (!error) {
            setProfile(prev => ({ ...prev, [key]: value }));
        }
        return !error;
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            signUp,
            signIn,
            signInAdmin,
            signOut,
            updateCandies,
            updateProfileSetting,
            fetchProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
};
