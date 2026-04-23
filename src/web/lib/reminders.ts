export function hasNotificationSupport() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNextReminderDate(reminderTime: string, now = new Date()) {
  const [hourPart, minutePart] = reminderTime.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const next = new Date(now);
  next.setHours(Number.isFinite(hour) ? hour : 20, Number.isFinite(minute) ? minute : 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export function getNextWeeklyReportDate(now = new Date()) {
  const next = new Date(now);
  const targetDay = 0; // Sunday
  const currentDay = next.getDay();
  let daysUntil = (targetDay - currentDay + 7) % 7;
  next.setDate(next.getDate() + daysUntil);
  next.setHours(18, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 7);
  }
  return next;
}

export function showBrowserNotification(title: string, body: string, url = '/dashboard') {
  if (!hasNotificationSupport() || Notification.permission !== 'granted') {
    return false;
  }

  const notification = new Notification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = url;
    notification.close();
  };

  return true;
}
