import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../services/auth';

export interface StoredChatMessage {
    type: 'ai' | 'user';
    content: string;
    timestamp: string;
}

interface AppState {
    userId: string | null;
    token: string | null;
    refreshToken: string | null;
    profile: UserProfile | null;
    hasSeenLanding: boolean;
    lastPulseCheckedAt: number | null;
    // AI chat history — keyed by PH date string (YYYY-MM-DD), reset at midnight PH
    aiChatHistory: StoredChatMessage[];
    aiChatDate: string | null;
    // Global in-app toast (not persisted)
    toastMessage: string | null;
    setSession: (userId: string, token: string, refreshToken?: string) => void;
    setToken: (token: string, refreshToken?: string) => void;
    setProfile: (profile: UserProfile) => void;
    clearSession: () => void;
    setHasSeenLanding: (value: boolean) => void;
    setLastPulseCheckedAt: (ts: number | null) => void;
    saveChatHistory: (messages: StoredChatMessage[], phDate: string) => void;
    clearChatHistory: () => void;
    showToast: (message: string) => void;
    clearToast: () => void;
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            userId: null,
            token: null,
            refreshToken: null,
            profile: null,
            hasSeenLanding: false,
            lastPulseCheckedAt: null,
            aiChatHistory: [],
            aiChatDate: null,
            toastMessage: null,
            setSession: (userId, token, refreshToken) => set({ userId, token, refreshToken: refreshToken ?? null }),
            setToken: (token, refreshToken) => set({ token, ...(refreshToken ? { refreshToken } : {}) }),
            setProfile: (profile) => set({ profile }),
            clearSession: () => set({
                userId: null,
                token: null,
                refreshToken: null,
                profile: null,
                hasSeenLanding: false,
                lastPulseCheckedAt: null,
                aiChatHistory: [],
                aiChatDate: null,
            }),
            setHasSeenLanding: (value) => set({ hasSeenLanding: value }),
            setLastPulseCheckedAt: (ts: number | null) => set({ lastPulseCheckedAt: ts }),
            saveChatHistory: (messages, phDate) => set({ aiChatHistory: messages, aiChatDate: phDate }),
            clearChatHistory: () => set({ aiChatHistory: [], aiChatDate: null }),
            showToast: (message) => set({ toastMessage: message }),
            clearToast: () => set({ toastMessage: null }),
        }),
        {
            name: 'pulse-user-store',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist session & chat — behavioural flags are fetched from Firestore per user
            partialize: (state) => ({
                userId: state.userId,
                token: state.token,
                refreshToken: state.refreshToken,
                profile: state.profile,
                aiChatHistory: state.aiChatHistory,
                aiChatDate: state.aiChatDate,
            }),
        }
    )
);
