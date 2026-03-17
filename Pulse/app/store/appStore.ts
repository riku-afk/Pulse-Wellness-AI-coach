import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../services/auth';

interface AppState {
    userId: string | null;
    token: string | null;
    profile: UserProfile | null;
    setSession: (userId: string, token: string) => void;
    setProfile: (profile: UserProfile) => void;
    clearSession: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            userId: null,
            token: null,
            profile: null,
            setSession: (userId, token) => set({ userId, token }),
            setProfile: (profile) => set({ profile }),
            clearSession: () => set({ userId: null, token: null, profile: null }),
        }),
        {
            name: 'pulse-user-store',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
