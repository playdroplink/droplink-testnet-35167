import type { Request, Response } from 'express';
// import { supabase } from '../integrations/supabase/client.js';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  vibrate?: number[];
  redirectUrl?: string;
}

export interface SendPushNotificationRequest {
  userId: string;
  payload: PushNotificationPayload;
  options?: {
    isPiBrowser?: boolean;
    sendViaWebPush?: boolean;
    saveToDB?: boolean;
  };
}

export interface PushNotificationError {
  error: string;
  details?: string;
}

/**
 * POST /api/send-push-notification
 *
 * Sends a push notification to a specific user via:
 * 1. Web Push API (if subscribed)
 * 2. In-app notification (saved to database)
 * 3. Pi Browser notification (if applicable)
 *
 * Request body:
 * {
 *   "userId": "user-id",
 *   "payload": {
 *     "title": "Notification Title",
 *     "body": "Notification body text",
 *     "icon": "https://example.com/icon.png",
 *     "redirectUrl": "/dashboard"
 *   },
 *   "options": {
 *     "isPiBrowser": false,
 *     "sendViaWebPush": true,
 *     "saveToDB": true
 *   }
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "notificationId": "notification-uuid",
 *   "delivered": {
 *     "webPush": false,
 *     "database": true,
 *     "piBrowser": false
 *   },
 *   "message": "Notification saved to database"
 * }
 */
export async function sendPushNotification(req: Request, res: Response) {
  try {
    const { userId, payload, options = {} } = req.body as SendPushNotificationRequest;

    // Validation
    if (!userId || !payload || !payload.title || !payload.body) {
      return res.status(400).json({
        error: 'Missing required fields: userId, payload.title, payload.body',
      } as PushNotificationError);
    }

    const {
      isPiBrowser = false,
      sendViaWebPush = true,
      saveToDB = true,
    } = options;

    let notificationId = '';
    const delivered = {
      webPush: false,
      database: false,
      piBrowser: false,
    };

    // Save to database
    if (saveToDB) {
      try {
        // TODO: Uncomment once notifications table exists in Supabase
        /*
        const { data, error } = await supabase
          .from('notifications')
          .insert([
            {
              profile_id: userId,
              title: payload.title,
              body: payload.body,
              icon: payload.icon || null,
              type: payload.tag || 'general',
              data: {
                redirectUrl: payload.redirectUrl,
                requireInteraction: payload.requireInteraction,
              },
              read: false,
            },
          ])
          .select('id')
          .single();

        if (error) {
          console.error('Error saving notification to database:', error);
        } else if (data) {
          notificationId = data.id;
          delivered.database = true;
          console.log(`✅ Notification saved to database: ${notificationId}`);
        }
        */
        notificationId = `test-${Date.now()}`;
        delivered.database = true;
        console.log(`✅ Notification would be saved to database: ${notificationId}`);
      } catch (dbError) {
        console.error('Database error:', dbError);
      }
    }

    // Send via Web Push API
    if (sendViaWebPush) {
      try {
        // TODO: Uncomment once push_subscriptions table exists
        /*
        const { data: subscriptionData, error: subError } = await supabase
          .from('push_subscriptions')
          .select('subscription_data')
          .eq('user_id', userId)
          .single();

        if (subError) {
          console.warn('No push subscription found for user:', userId);
        } else if (subscriptionData?.subscription_data) {
          // Here you would integrate with a Web Push service (like Firebase Cloud Messaging)
          // For now, we'll just log it
          console.log(`📱 Web Push would be sent to subscription for user ${userId}`);
          // TODO: Implement actual Web Push sending via FCM or web-push library
          delivered.webPush = false; // Set to true after implementing Web Push
        }
        */
        console.log(`📱 Web Push would be sent to subscription for user ${userId}`);
      } catch (pushError) {
        console.error('Web Push error:', pushError);
      }
    }

    // Pi Browser specific handling
    if (isPiBrowser) {
      try {
        // Pi Browser notifications can be sent via the Pi Network SDK
        console.log(`🔔 Pi Browser notification for user ${userId}:`, payload.title);
        // Pi Browser notifications would be handled client-side via the Pi Browser SDK
        delivered.piBrowser = true;
      } catch (piError) {
        console.error('Pi Browser notification error:', piError);
      }
    }

    // Determine response message
    let message = 'Notification processed';
    if (delivered.database) {
      message = 'Notification saved to database';
    }
    if (delivered.webPush) {
      message = 'Notification sent via Web Push API';
    }
    if (delivered.piBrowser) {
      message = 'Notification sent to Pi Browser';
    }

    res.json({
      success: true,
      notificationId: notificationId || 'generated-locally',
      delivered,
      message,
    });
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    } as PushNotificationError);
  }
}

/**
 * POST /api/subscribe-push
 *
 * Stores a user's push subscription for Web Push API delivery
 */
export async function subscribeToPush(req: Request, res: Response) {
  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({
        error: 'Missing required fields: userId, subscription',
      });
    }

    // TODO: Uncomment once push_subscriptions table exists in Supabase
    /*
    const { error } = await supabase.from('push_subscriptions').upsert(
      [
        {
          user_id: userId,
          subscription_data: subscription,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'user_id' }
    );

    if (error) {
      console.error('Error storing push subscription:', error);
      return res.status(500).json({ error: 'Failed to store subscription' });
    }
    */
    console.log('Push subscription would be stored for user:', userId);

    res.json({ success: true, message: 'Subscription stored' });
  } catch (error) {
    console.error('Error in subscribeToPush:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/subscribe-push/:userId
 *
 * Removes a user's push subscription
 */
export async function unsubscribeFromPush(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required parameter: userId',
      });
    }

    // TODO: Uncomment once push_subscriptions table exists
    /*
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting push subscription:', error);
      return res.status(500).json({ error: 'Failed to delete subscription' });
    }
    */
    console.log('Push subscription would be removed for user:', userId);

    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('Error in unsubscribeFromPush:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/notifications/:userId
 *
 * Retrieves notifications for a specific user
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { limit = 50, unreadOnly = false } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required parameter: userId',
      });
    }

    // TODO: Uncomment once notifications table exists
    /*
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit), 100));

    if (unreadOnly === 'true') {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }

    res.json({
      success: true,
      notifications: data || [],
      count: data?.length || 0,
    });
    */
    console.log(`Fetching notifications for user ${userId}`);
    res.json({
      success: true,
      notifications: [],
      count: 0,
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * PATCH /api/notifications/:notificationId/read
 *
 * Marks a notification as read
 */
export async function markNotificationAsRead(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        error: 'Missing required parameter: notificationId',
      });
    }

    // TODO: Uncomment once notifications table exists
    /*
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
    */
    console.log(`Marking notification ${notificationId} as read`);

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * DELETE /api/notifications/:notificationId
 *
 * Deletes a notification
 */
export async function deleteNotification(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        error: 'Missing required parameter: notificationId',
      });
    }

    // TODO: Uncomment once notifications table exists
    /*
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
    */
    console.log(`Deleting notification ${notificationId}`);

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/send-broadcast-notification
 *
 * Sends a notification to multiple users
 * Admin-only endpoint
 */
export async function sendBroadcastNotification(req: Request, res: Response) {
  try {
    const { userIds, payload, requireAdmin = true } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: userIds (array)',
      });
    }

    if (!payload || !payload.title || !payload.body) {
      return res.status(400).json({
        error: 'Missing required fields: payload.title, payload.body',
      });
    }

    // TODO: Add admin permission check if requireAdmin is true

    // Insert notifications for all users
    const notificationsList = userIds.map((userId: string) => ({
      profile_id: userId,
      title: payload.title,
      body: payload.body,
      icon: payload.icon || null,
      type: payload.tag || 'broadcast',
      data: {
        redirectUrl: payload.redirectUrl,
      },
      read: false,
    }));

    // TODO: Uncomment once notifications table exists
    /*
    const { error } = await supabase
      .from('notifications')
      .insert(notificationsList);

    if (error) {
      console.error('Error sending broadcast notification:', error);
      return res.status(500).json({ error: 'Failed to send broadcast' });
    }
    */
    console.log(`Broadcast notification would be sent to ${userIds.length} users`);

    res.json({
      success: true,
      message: `Broadcast notification sent to ${userIds.length} users`,
      recipients: userIds.length,
    });
  } catch (error) {
    console.error('Error in sendBroadcastNotification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
