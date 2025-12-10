import { Router } from 'express';
import {
  sendPushNotification,
  subscribeToPush,
  unsubscribeFromPush,
  getNotifications,
  markNotificationAsRead,
  deleteNotification,
  sendBroadcastNotification,
} from '../handlers/pushNotificationHandler.js';

const router = Router();

/**
 * Push Notification Routes
 */

// Send notification to a specific user
router.post('/send-push-notification', sendPushNotification);

// Store push subscription for Web Push API
router.post('/subscribe-push', subscribeToPush);

// Remove push subscription
router.delete('/subscribe-push/:userId', unsubscribeFromPush);

// Get notifications for a user
router.get('/notifications/:userId', getNotifications);

// Mark notification as read
router.patch('/notifications/:notificationId/read', markNotificationAsRead);

// Delete a notification
router.delete('/notifications/:notificationId', deleteNotification);

// Send broadcast notification to multiple users
router.post('/send-broadcast-notification', sendBroadcastNotification);

export default router;
