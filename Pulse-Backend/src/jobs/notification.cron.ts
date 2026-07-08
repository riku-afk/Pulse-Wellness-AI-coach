import cron from 'node-cron';
import { runReminderSweep, cleanupExpiredNotifications } from '../services/notification/notification.service';
import { phHour } from '../utils/ph-time';

// ── Catch-up on startup ──────────────────────────────────────────────────────
// node-cron schedules are in-memory. If Railway restarts the container (deploy,
// crash, scaling), an hourly tick can be silently missed. On startup we sweep
// the current PH hour plus the two before it; hasNotifiedToday() in the service
// prevents double-sends for anyone already covered by a real tick.
async function runStartupCatchUp(): Promise<void> {
    const hour = phHour();
    const window = [(hour + 22) % 24, (hour + 23) % 24, hour];
    console.log(`[Cron] Startup catch-up: sweeping PH hours ${window.join(', ')}`);
    await runReminderSweep(window).catch(e =>
        console.error('[Cron] Startup catch-up failed:', e)
    );
}

export function startNotificationCrons(): void {
    // ── Hourly reminder sweep ────────────────────────────────────────────────
    // Users choose their own morning/evening reminder hours (PH time), so the
    // sweep runs every hour and notifies whoever is due.
    cron.schedule('0 * * * *', async () => {
        try {
            await runReminderSweep();
        } catch (e) {
            console.error('[Cron] Reminder sweep failed:', e);
        }
    }, { timezone: 'UTC' });

    // ── Daily cleanup: midnight UTC ──────────────────────────────────────────
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Firing notification cleanup');
        try {
            await cleanupExpiredNotifications();
        } catch (e) {
            console.error('[Cron] Cleanup failed:', e);
        }
    }, { timezone: 'UTC' });

    console.log('[Cron] Notification cron jobs scheduled (hourly reminder sweep, midnight UTC cleanup)');

    // Run catch-up after registering the cron jobs
    runStartupCatchUp();
}
