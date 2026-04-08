import cron from 'node-cron';
import { checkAndNotifyUsers, cleanupExpiredNotifications } from '../services/notification/notification.service';

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
}
