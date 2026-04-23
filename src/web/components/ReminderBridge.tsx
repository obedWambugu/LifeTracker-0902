import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getNextReminderDate, getNextWeeklyReportDate, showBrowserNotification, hasNotificationSupport } from '../lib/reminders';

export default function ReminderBridge() {
  const { user } = useAuth();
  const dailyTimer = useRef<number | null>(null);
  const weeklyTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const clearTimers = () => {
      if (dailyTimer.current) window.clearTimeout(dailyTimer.current);
      if (weeklyTimer.current) window.clearTimeout(weeklyTimer.current);
      dailyTimer.current = null;
      weeklyTimer.current = null;
    };

    const notify = (title: string, body: string, url = '/dashboard') => {
      if (!showBrowserNotification(title, body, url)) {
        toast.info(`${title}: ${body}`);
      }
    };

    const scheduleDaily = (reminderTime: string) => {
      const next = getNextReminderDate(reminderTime);
      const delay = Math.max(1000, next.getTime() - Date.now());
      dailyTimer.current = window.setTimeout(() => {
        notify('Daily check-in', 'Take 10 seconds to update your habits, spending, or mood.', '/dashboard?checkin=1');
        if (mounted.current) {
          scheduleDaily(reminderTime);
        }
      }, delay);
    };

    const scheduleWeekly = () => {
      const next = getNextWeeklyReportDate();
      const delay = Math.max(1000, next.getTime() - Date.now());
      weeklyTimer.current = window.setTimeout(async () => {
        let body = 'Your weekly life report is ready.';
        try {
          const report = await api.get('/weekly-report');
          body = report?.locked ? report.summary : report?.summary || body;
        } catch {
          // Keep the generic reminder if the report fetch fails.
        }
        notify('Weekly Life Report', body, '/dashboard');
        if (mounted.current) {
          scheduleWeekly();
        }
      }, delay);
    };

    const sync = async () => {
      clearTimers();

      try {
        const prefs = await api.get('/preferences');
        if (!mounted.current) return;

        if (prefs?.remindersEnabled) {
          if (hasNotificationSupport() && Notification.permission === 'granted') {
            scheduleDaily(prefs.reminderTime || '20:00');
          } else {
            scheduleDaily(prefs.reminderTime || '20:00');
          }
        }

        if (prefs?.weeklyReportEnabled) {
          scheduleWeekly();
        }
      } catch {
        // Silently ignore reminder sync failures.
      }
    };

    const handlePrefUpdate = () => {
      void sync();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    };

    void sync();
    window.addEventListener('lt-preferences-updated', handlePrefUpdate);
    window.addEventListener('storage', handlePrefUpdate);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimers();
      window.removeEventListener('lt-preferences-updated', handlePrefUpdate);
      window.removeEventListener('storage', handlePrefUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  return null;
}
