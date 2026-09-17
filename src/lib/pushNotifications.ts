import { Capacitor } from '@capacitor/core';
import { LocalNotifications, Channel } from '@capacitor/local-notifications';
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

const CHANNEL_ID = 'godshop_reminders_v1';

export async function checkNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'granted') {
      await setupAndroidChannels();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
}

export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!Capacitor.isNativePlatform()) {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    return permission === 'granted' ? 'granted' : 'denied';
  }

  try {
    let permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'granted') {
      await setupAndroidChannels();
      return 'granted';
    }

    permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display === 'granted') {
      await setupAndroidChannels();
      return 'granted';
    }
    
    return 'denied';
  } catch (error) {
    console.error('Error requesting native notification permission:', error);
    return 'denied';
  }
}

export async function setupAndroidChannels() {
  if (Capacitor.getPlatform() !== 'android') return;

  try {
    const channel: Channel = {
      id: CHANNEL_ID,
      name: 'Lembretes de Faturas',
      description: 'Notificações para parcelas e faturas vencidas/a vencer',
      importance: 5, // High importance (heads-up notification)
      visibility: 1, // Public visibility
      vibration: true,
      sound: 'default'
    };
    
    await LocalNotifications.createChannel(channel);
  } catch (error) {
    console.error('Error creating Android notification channel:', error);
  }
}

export async function openNotificationSettings() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (Capacitor.getPlatform() === 'android') {
      await NativeSettings.openAndroid({
        option: AndroidSettings.AppNotification,
      });
    } else if (Capacitor.getPlatform() === 'ios') {
      await NativeSettings.openIOS({
        option: IOSSettings.App,
      });
    }
  } catch (error) {
    console.error('Error opening app settings:', error);
  }
}

interface NotificationPayload {
  id: number;
  title: string;
  body: string;
}

export async function showNotification(payload: NotificationPayload) {
  const isGranted = await checkNotificationPermission();
  if (!isGranted) return;

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: payload.id,
            title: payload.title,
            body: payload.body,
            channelId: CHANNEL_ID,
            
            sound: 'default',
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Error scheduling native notification:', error);
    }
  } else {
    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: '/logo.png',
        tag: String(payload.id),
        requireInteraction: true
      });
    } catch (error) {
      console.error('Error triggering web notification:', error);
    }
  }
}

export async function scheduleBackgroundNotifications(items: any[]) {
  if (!Capacitor.isNativePlatform()) return;
  const isGranted = await checkNotificationPermission();
  if (!isGranted) return;

  try {
    // Cancel all previously scheduled notifications to avoid duplicates
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending);
    }

    const notificationsToSchedule = [];
    const now = new Date();

    for (const item of items) {
      // Create a unique ID based on the notification item ID to ensure deterministic IDs
      // Assuming item.id is a string like UUID, we hash it to a number, or just generate one
      let numericId = 0;
      for (let i = 0; i < item.id.length; i++) {
        numericId = (numericId * 31 + item.id.charCodeAt(i)) & 0xffffffff;
      }
      numericId = Math.abs(numericId);

      // Parse the due date
      const dueDate = new Date(item.dueDate);
      
      // Schedule for 8:00 AM on the due date
      const scheduleDate = new Date(dueDate);
      scheduleDate.setHours(8, 0, 0, 0);

      // If the due date is in the future, schedule it!
      if (scheduleDate.getTime() > now.getTime()) {
        const expectedAmountStr = item.expectedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        notificationsToSchedule.push({
          id: numericId,
          title: `Lembrete GODSHOP: ${item.clientName}`,
          body: `A ${item.installmentIndex}ª parcela de ${expectedAmountStr} (Item: ${item.itemName}) vence hoje!`,
          channelId: CHANNEL_ID,
          
          sound: 'default',
          schedule: { at: scheduleDate },
          actionTypeId: '',
          extra: null
        });
      }
      
      // Also schedule a warning 1 day before (at 9:00 AM)
      const warningDate = new Date(dueDate);
      warningDate.setDate(warningDate.getDate() - 1);
      warningDate.setHours(9, 0, 0, 0);
      
      if (warningDate.getTime() > now.getTime()) {
        const expectedAmountStr = item.expectedAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        notificationsToSchedule.push({
          id: numericId + 1000000, // offset id
          title: `GODSHOP: Vencimento Amanhã`,
          body: `A parcela de ${item.clientName} no valor de ${expectedAmountStr} vence amanhã!`,
          channelId: CHANNEL_ID,
          
          sound: 'default',
          schedule: { at: warningDate },
          actionTypeId: '',
          extra: null
        });
      }
    }

    // Capacitor limits scheduling batch, but it's usually fine up to 50-100.
    // If there are many, we slice them.
    const MAX_SCHEDULE = 60; // schedule up to 60 upcoming notifications
    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule.slice(0, MAX_SCHEDULE)
      });
      console.log(`Scheduled ${Math.min(notificationsToSchedule.length, MAX_SCHEDULE)} background notifications.`);
    }
  } catch (error) {
    console.error('Error scheduling background notifications:', error);
  }
}
