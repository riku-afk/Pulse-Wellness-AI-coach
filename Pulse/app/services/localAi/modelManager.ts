import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Manages the on-device LLM model file: download (with progress), presence
 * check, and deletion. Status is 'unavailable' on devices below the RAM floor
 * (see isDeviceSupported).
 *
 * Default model: Gemma 3 1B instruction-tuned, Q4_K_M GGUF (~0.8 GB) — the
 * same model family the backend's Ollama provider uses, so prompt behavior
 * matches the cloud dev setup. Override with EXPO_PUBLIC_LOCAL_MODEL_URL
 * (e.g. to self-host the file on your own CDN for production).
 */

export const MODEL_URL =
    process.env.EXPO_PUBLIC_LOCAL_MODEL_URL
    || 'https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf';

export const MODEL_LABEL = 'Gemma 3 1B (Q4)';
export const MODEL_SIZE_LABEL = '~0.8 GB';

const MODEL_DIR = `${FileSystem.documentDirectory}models`;
export const MODEL_PATH = `${MODEL_DIR}/local-llm.gguf`;

// A 1B Q4 model needs ~1.5 GB free at inference time; phones below 3 GB total
// RAM would swap/crash, so the download is gated on this floor.
export const MIN_TOTAL_MEMORY_BYTES = 3 * 1024 * 1024 * 1024;

/**
 * Can this device run the on-device model? False for phones under the RAM
 * floor (and for the browser dev preview, which has no filesystem/native
 * runtime). When the OS doesn't report memory, we give the benefit of the doubt.
 */
export function isDeviceSupported(): boolean {
    if (Platform.OS === 'web') return false;
    return Device.totalMemory == null || Device.totalMemory >= MIN_TOTAL_MEMORY_BYTES;
}

export type ModelStatus = 'unavailable' | 'absent' | 'downloading' | 'ready';

export interface ModelState {
    status: ModelStatus;
    /** 0..1 while downloading */
    progress: number;
    error?: string;
}

let state: ModelState = {
    status: isDeviceSupported() ? 'absent' : 'unavailable',
    progress: 0,
};

const listeners = new Set<(s: ModelState) => void>();

function setState(next: ModelState): void {
    state = next;
    listeners.forEach(l => l(state));
}

export function getModelState(): ModelState {
    return state;
}

/** Subscribe to state changes. Immediately calls back with the current state. */
export function subscribeModelState(cb: (s: ModelState) => void): () => void {
    listeners.add(cb);
    cb(state);
    return () => { listeners.delete(cb); };
}

/** Re-check whether the model file exists on disk. Call once at screen mount. */
export async function refreshModelStatus(): Promise<void> {
    if (!isDeviceSupported() || state.status === 'downloading') return;
    try {
        const info = await FileSystem.getInfoAsync(MODEL_PATH);
        setState({ status: info.exists ? 'ready' : 'absent', progress: info.exists ? 1 : 0 });
    } catch {
        setState({ status: 'absent', progress: 0 });
    }
}

let download: FileSystem.DownloadResumable | null = null;

export async function downloadModel(): Promise<void> {
    if (!isDeviceSupported() || state.status === 'downloading' || state.status === 'ready') return;

    setState({ status: 'downloading', progress: 0 });
    try {
        await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true }).catch(() => {});

        download = FileSystem.createDownloadResumable(
            MODEL_URL,
            MODEL_PATH,
            {},
            (p) => {
                const progress = p.totalBytesExpectedToWrite > 0
                    ? p.totalBytesWritten / p.totalBytesExpectedToWrite
                    : 0;
                setState({ status: 'downloading', progress });
            },
        );

        const result = await download.downloadAsync();
        download = null;

        if (result && result.status >= 200 && result.status < 300) {
            setState({ status: 'ready', progress: 1 });
        } else {
            await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }).catch(() => {});
            setState({ status: 'absent', progress: 0, error: `Download failed (HTTP ${result?.status ?? '?'})` });
        }
    } catch (e) {
        download = null;
        await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }).catch(() => {});
        setState({
            status: 'absent',
            progress: 0,
            error: e instanceof Error ? e.message : 'Download failed',
        });
    }
}

export async function cancelDownload(): Promise<void> {
    if (!download) return;
    try { await download.cancelAsync(); } catch { /* already stopped */ }
    download = null;
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }).catch(() => {});
    setState({ status: 'absent', progress: 0 });
}

export async function deleteModel(): Promise<void> {
    if (state.status === 'downloading') { await cancelDownload(); return; }
    await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }).catch(() => {});
    setState({ status: 'absent', progress: 0 });
}
