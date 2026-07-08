import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
// type-only: keeps the appStore → auth → apiClient → appStore cycle out of the runtime graph
import type { UserProfile } from '../services/auth';

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
    lastPulseCheckedAt: number | null;
    // AI chat history — keyed by PH date string (YYYY-MM-DD), reset at midnight PH
    aiChatHistory: StoredChatMessage[];
    aiChatDate: string | null;
    // Global in-app toast (not persisted)
    toastMessage: string | null;
    // Free plan: run AI on-device with the downloaded local model (native only)
    useLocalAi: boolean;
    setUseLocalAi: (value: boolean) => void;
    // Plan chosen after login ('local' | 'cloud'); null routes to choose-plan.
    // Fetched from Firestore per user — not persisted.
    aiPlan: 'local' | 'cloud' | null;
    setAiPlan: (value: 'local' | 'cloud' | null) => void;
    // Journal-aware AI opt-in — mirrored from Firestore prefs at boot/login so
    // the local engine and Settings don't depend on a live prefs fetch.
    journalAiEnabled: boolean;
    setJournalAiEnabled: (value: boolean) => void;
    setSession: (userId: string, token: string, refreshToken?: string) => void;
    setToken: (token: string, refreshToken?: string) => void;
    setProfile: (profile: UserProfile) => void;
    clearSession: () => void;
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
            lastPulseCheckedAt: null,
            aiChatHistory: [],
            aiChatDate: null,
            toastMessage: null,
            useLocalAi: false,
            setUseLocalAi: (value) => set({ useLocalAi: value }),
            aiPlan: null,
            setAiPlan: (value) => set({ aiPlan: value }),
            journalAiEnabled: false,
            setJournalAiEnabled: (value) => set({ journalAiEnabled: value }),
            setSession: (userId, token, refreshToken) => set({ userId, token, refreshToken: refreshToken ?? null }),
            setToken: (token, refreshToken) => set({ token, ...(refreshToken ? { refreshToken } : {}) }),
            setProfile: (profile) => set({ profile }),
            clearSession: () => set({
                userId: null,
                token: null,
                refreshToken: null,
                profile: null,
                lastPulseCheckedAt: null,
                aiChatHistory: [],
                aiChatDate: null,
                aiPlan: null,
                journalAiEnabled: false,
            }),
            setLastPulseCheckedAt: (ts: number | null) => set({ lastPulseCheckedAt: ts }),
            saveChatHistory: (messages, phDate) => set({ aiChatHistory: messages, aiChatDate: phDate }),
            clearChatHistory: () => set({ aiChatHistory: [], aiChatDate: null }),
            showToast: (message) => set({ toastMessage: message }),
            clearToast: () => set({ toastMessage: null }),
        }),
        {
            name: 'pulse-user-store',
            storage: createJSONStorage(() => AsyncStorage),
            // Persist session, chat, and lastPulseCheckedAt (so an offline app
            // open still knows today's check-in is done and doesn't re-prompt).
            // Other behavioural flags are fetched from Firestore per user.
            partialize: (state) => ({
                userId: state.userId,
                token: state.token,
                refreshToken: state.refreshToken,
                profile: state.profile,
                aiChatHistory: state.aiChatHistory,
                aiChatDate: state.aiChatDate,
                useLocalAi: state.useLocalAi,
                lastPulseCheckedAt: state.lastPulseCheckedAt,
            }),
        }
    )
);
