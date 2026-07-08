import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, Pressable, StyleSheet, useColorScheme,
    ActivityIndicator, Dimensions, ScrollView,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Cpu, Cloud, Check, WifiOff, Sparkles, Lock } from 'lucide-react-native';
import { useAppStore } from '../store/appStore';
import { updateUserPrefs, AiPlan } from '../services/auth';
import {
    subscribeModelState, refreshModelStatus, downloadModel, cancelDownload,
    getModelState, isDeviceSupported, ModelState, MODEL_SIZE_LABEL,
} from '../services/localAi/modelManager';
import { triggerHaptic } from '../utils/haptics';

const { width: SW } = Dimensions.get('window');
const s = (n: number) => Math.round((SW / 375) * n);

/**
 * Shown once after login/signup, before the app is usable: the user picks
 * which AI engine powers their coach. Free = on-device model (downloaded here,
 * blocking, so the daily pulse AI works from the very first Home visit).
 * Cloud = premium engine (payment flow lands later — free during beta).
 */
export default function ChoosePlan() {
    const isDark = useColorScheme() === 'dark';
    const styles = isDark ? darkStyles : lightStyles;
    const insets = useSafeAreaInsets();

    const { userId, token, setAiPlan, setUseLocalAi, showToast } = useAppStore(st => ({
        userId: st.userId,
        token: st.token,
        setAiPlan: st.setAiPlan,
        setUseLocalAi: st.setUseLocalAi,
        showToast: st.showToast,
    }));

    const deviceSupported = isDeviceSupported();
    const [selected, setSelected] = useState<AiPlan>(deviceSupported ? 'local' : 'cloud');
    const [modelState, setModelState] = useState<ModelState>(getModelState());
    const [isFinishing, setIsFinishing] = useState(false);
    // Set when the user tapped continue on the free plan and we're waiting
    // for the download — the effect below finishes the flow once it's ready.
    const waitingForModelRef = useRef(false);

    useEffect(() => {
        refreshModelStatus();
        return subscribeModelState(setModelState);
    }, []);

    const finish = async (plan: AiPlan) => {
        setIsFinishing(true);
        setAiPlan(plan);
        setUseLocalAi(plan === 'local');
        if (userId && token) {
            // Best-effort — the choice is already applied locally.
            updateUserPrefs(userId, token, { aiPlan: plan }).catch(() => {});
        }
        triggerHaptic('success');
        router.replace('/(tabs)/home');
    };

    // Auto-continue once the model download completes.
    useEffect(() => {
        if (waitingForModelRef.current && modelState.status === 'ready') {
            waitingForModelRef.current = false;
            finish('local');
        }
        if (waitingForModelRef.current && modelState.status === 'absent' && modelState.error) {
            waitingForModelRef.current = false;
            showToast('Download failed — check your connection and try again');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelState]);

    const handleContinue = () => {
        if (isFinishing) return;
        triggerHaptic('medium');

        if (selected === 'cloud') {
            finish('cloud');
            return;
        }

        // Free plan: the model must be on the device before the app is usable.
        if (modelState.status === 'ready') {
            finish('local');
        } else if (modelState.status !== 'downloading') {
            waitingForModelRef.current = true;
            downloadModel().catch(() => {
                waitingForModelRef.current = false;
                showToast('Download failed — check your connection and try again');
            });
        }
    };

    const handleCancelDownload = async () => {
        triggerHaptic('light');
        waitingForModelRef.current = false;
        await cancelDownload();
    };

    const isDownloading = modelState.status === 'downloading';
    const progressPct = Math.round(modelState.progress * 100);

    const continueLabel = selected === 'cloud'
        ? 'Continue with Cloud AI'
        : modelState.status === 'ready'
            ? 'Continue with On-device AI'
            : `Download AI & Continue (${MODEL_SIZE_LABEL})`;

    return (
        <View style={[styles.container, { paddingTop: insets.top + s(24), paddingBottom: insets.bottom + s(20) }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                <Animated.View entering={FadeInUp.duration(420)}>
                    <Text style={styles.title}>Choose your AI</Text>
                    <Text style={styles.subtitle}>
                        Pulse uses AI for your daily suggestions, weekly assessments and journal
                        reflections. Pick how it runs — you can change this later in Settings.
                    </Text>
                </Animated.View>

                {/* Free — On-device */}
                <Animated.View entering={FadeInDown.duration(420).delay(80)}>
                    <Pressable
                        style={[
                            styles.card,
                            selected === 'local' && styles.cardSelected,
                            !deviceSupported && styles.cardDisabled,
                        ]}
                        onPress={() => {
                            if (!deviceSupported || isDownloading) return;
                            triggerHaptic('selection');
                            setSelected('local');
                        }}
                        disabled={!deviceSupported}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(147,51,234,0.18)' : '#f3e8ff' }]}>
                                <Cpu size={s(20)} color="#9333ea" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>On-device AI</Text>
                                <Text style={styles.cardPrice}>Free</Text>
                            </View>
                            {selected === 'local' && deviceSupported && (
                                <View style={styles.checkBadge}><Check size={s(14)} color="#ffffff" /></View>
                            )}
                        </View>
                        <View style={styles.bullets}>
                            <View style={styles.bullet}>
                                <Lock size={s(13)} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={styles.bulletText}>Private — AI runs entirely on your phone</Text>
                            </View>
                            <View style={styles.bullet}>
                                <WifiOff size={s(13)} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={styles.bulletText}>Works without internet</Text>
                            </View>
                            <View style={styles.bullet}>
                                <Cpu size={s(13)} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={styles.bulletText}>
                                    {deviceSupported
                                        ? `One-time ${MODEL_SIZE_LABEL} download — Wi-Fi recommended`
                                        : 'Not available on this device (needs 3 GB+ RAM)'}
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>

                {/* Premium — Cloud */}
                <Animated.View entering={FadeInDown.duration(420).delay(160)}>
                    <Pressable
                        style={[styles.card, selected === 'cloud' && styles.cardSelected]}
                        onPress={() => {
                            if (isDownloading) return;
                            triggerHaptic('selection');
                            setSelected('cloud');
                        }}
                    >
                        <View style={styles.cardHeader}>
                            <View style={[styles.cardIcon, { backgroundColor: isDark ? 'rgba(14,165,233,0.18)' : '#e0f2fe' }]}>
                                <Cloud size={s(20)} color="#0ea5e9" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.cardTitle}>Cloud AI</Text>
                                <Text style={styles.cardPrice}>Premium — free during beta</Text>
                            </View>
                            {selected === 'cloud' && (
                                <View style={styles.checkBadge}><Check size={s(14)} color="#ffffff" /></View>
                            )}
                        </View>
                        <View style={styles.bullets}>
                            <View style={styles.bullet}>
                                <Sparkles size={s(13)} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={styles.bulletText}>Smarter, richer responses</Text>
                            </View>
                            <View style={styles.bullet}>
                                <Cloud size={s(13)} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={styles.bulletText}>No download — ready instantly</Text>
                            </View>
                            <View style={styles.bullet}>
                                <WifiOff size={s(13)} color={isDark ? '#94a3b8' : '#64748b'} />
                                <Text style={styles.bulletText}>Requires an internet connection</Text>
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>

                <View style={{ flex: 1 }} />

                {/* Download progress */}
                {isDownloading && (
                    <Animated.View entering={FadeInDown.duration(300)} style={styles.progressWrap}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressText}>Downloading your AI… {progressPct}%</Text>
                            <Pressable onPress={handleCancelDownload} hitSlop={8}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                        </View>
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                        </View>
                        <Text style={styles.progressHint}>Keep the app open — this only happens once.</Text>
                    </Animated.View>
                )}

                {/* Continue */}
                <Pressable
                    style={[styles.continueBtn, (isDownloading || isFinishing) && { opacity: 0.6 }]}
                    onPress={handleContinue}
                    disabled={isDownloading || isFinishing}
                >
                    {isDownloading || isFinishing ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text style={styles.continueText}>{continueLabel}</Text>
                    )}
                </Pressable>
            </ScrollView>
        </View>
    );
}

const base = {
    container: { flex: 1, paddingHorizontal: s(24) },
    title: { fontSize: s(26), fontWeight: '700' as const, marginBottom: s(8) },
    subtitle: { fontSize: s(14), lineHeight: s(20), marginBottom: s(24) },
    card: { borderRadius: s(20), borderWidth: 2, padding: s(16), marginBottom: s(14) },
    cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: s(12), marginBottom: s(12) },
    cardIcon: { width: s(40), height: s(40), borderRadius: s(12), alignItems: 'center' as const, justifyContent: 'center' as const },
    cardTitle: { fontSize: s(16), fontWeight: '700' as const },
    cardPrice: { fontSize: s(13), fontWeight: '600' as const, color: '#0ea5e9', marginTop: s(1) },
    checkBadge: { width: s(24), height: s(24), borderRadius: s(12), backgroundColor: '#0ea5e9', alignItems: 'center' as const, justifyContent: 'center' as const },
    bullets: { gap: s(7) },
    bullet: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: s(8) },
    bulletText: { fontSize: s(13), flexShrink: 1 },
    progressWrap: { marginBottom: s(14) },
    progressHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: s(8) },
    progressText: { fontSize: s(13), fontWeight: '600' as const },
    cancelText: { fontSize: s(13), fontWeight: '600' as const, color: '#ef4444' },
    progressTrack: { height: s(8), borderRadius: s(4), overflow: 'hidden' as const },
    progressFill: { height: '100%' as const, backgroundColor: '#0ea5e9', borderRadius: s(4) },
    progressHint: { fontSize: s(12), marginTop: s(8) },
    continueBtn: { height: s(52), borderRadius: s(16), backgroundColor: '#0ea5e9', alignItems: 'center' as const, justifyContent: 'center' as const },
    continueText: { fontSize: s(15), fontWeight: '700' as const, color: '#ffffff' },
    cardDisabled: { opacity: 0.5 },
};

const lightStyles = StyleSheet.create({
    ...base,
    container: { ...base.container, backgroundColor: '#f8fafc' },
    title: { ...base.title, color: '#0f172a' },
    subtitle: { ...base.subtitle, color: '#64748b' },
    card: { ...base.card, backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.06)' },
    cardSelected: { borderColor: '#0ea5e9' },
    cardTitle: { ...base.cardTitle, color: '#0f172a' },
    bulletText: { ...base.bulletText, color: '#475569' },
    progressText: { ...base.progressText, color: '#0f172a' },
    progressTrack: { ...base.progressTrack, backgroundColor: '#e2e8f0' },
    progressHint: { ...base.progressHint, color: '#94a3b8' },
});

const darkStyles = StyleSheet.create({
    ...base,
    container: { ...base.container, backgroundColor: '#0f172a' },
    title: { ...base.title, color: '#f1f5f9' },
    subtitle: { ...base.subtitle, color: '#94a3b8' },
    card: { ...base.card, backgroundColor: '#1e293b', borderColor: 'rgba(255,255,255,0.07)' },
    cardSelected: { borderColor: '#0ea5e9' },
    cardTitle: { ...base.cardTitle, color: '#f1f5f9' },
    bulletText: { ...base.bulletText, color: '#94a3b8' },
    progressText: { ...base.progressText, color: '#f1f5f9' },
    progressTrack: { ...base.progressTrack, backgroundColor: '#334155' },
    progressHint: { ...base.progressHint, color: '#64748b' },
});
