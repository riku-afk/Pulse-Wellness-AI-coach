import cron from 'node-cron';
import { checkAndNotifyUsers, cleanupExpiredNotifications } from '../services/notification/notification.service';

// ── Catch-up on startup ──────────────────────────────────────────────────────
// node-cron schedules are in-memory. If Railway restarts the container (deploy,
// crash, scaling), a scheduled window can be silently missed. On startup we
// check the current PH time and fire the relevant check if we're inside a
// notification window. hasNotifiedToday() in the service prevents double-sends.
async function runStartupCatchUp(): Promise<void> {
    const phOffset = 8 * 60 * 60 * 1000;
    const phNow = new Date(Date.now() + phOffset);
    const phHour = phNow.getUTCHours(); // UTC hours of the PH-shifted date = PH hour

    if (phHour >= 7 && phHour < 10) {
        console.log('[Cron] Startup catch-up: morning window (7–10am PH), running morning check');
        await checkAndNotifyUsers('morning_reminder').catch(e =>
            console.error('[Cron] Startup morning catch-up failed:', e)
        );
    } else if (phHour >= 18 && phHour < 22) {
        console.log('[Cron] Startup catch-up: evening window (6–10pm PH), running evening check');
        await checkAndNotifyUsers('evening_reminder').catch(e =>
            console.error('[Cron] Startup evening catch-up failed:', e)
        );
    } else {
        console.log(`[Cron] Startup catch-up: outside notification windows (PH hour=${phHour}), no catch-up needed`);
    }
}

export function startNotificationCrons(): void {
    // ── Morning reminder: 7:00 AM Philippines time (UTC+8) ──────────────────
    // 7am PH = 23:00 UTC (previous calendar day in UTC terms)
    cron.schedule('0 23 * * *', async () => {
        console.log('[Cron] Firing morning pulse reminder (7am PH)');
        try {
            await checkAndNotifyUsers('morning_reminder');
        } catch (e) {
            console.error('[Cron] Morning reminder failed:', e);
        }
    }, { timezone: 'UTC' });

    // ── Evening reminder: 6:00 PM Philippines time (UTC+8) ───────────────────
    // 6pm PH = 10:00 UTC
    cron.schedule('0 10 * * *', async () => {
        console.log('[Cron] Firing evening pulse reminder (6pm PH)');
        try {
            await checkAndNotifyUsers('evening_reminder');
        } catch (e) {
            console.error('[Cron] Evening reminder failed:', e);
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

    console.log('[Cron] Notification cron jobs scheduled (7am PH, 6pm PH, midnight UTC cleanup)');

    // Run catch-up after registering the cron jobs
    runStartupCatchUp();
}
