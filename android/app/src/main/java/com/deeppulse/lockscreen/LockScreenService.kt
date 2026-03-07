package com.deeppulse.lockscreen

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import android.util.Log

/**
 * LockScreenService — Foreground service that listens for screen ON events
 * and displays the LockScreenAdActivity overlay.
 *
 * Features:
 * - Listens to ACTION_SCREEN_ON / ACTION_USER_PRESENT
 * - Enforces max 15 ads/day and max 3 ads/hour
 * - Tracks daily/hourly counters in SharedPreferences
 * - Runs as a foreground service with persistent notification
 * - Receives swipe results via broadcast to accumulate points
 */
class LockScreenService : Service() {

    companion object {
        const val TAG = "LockScreenService"
        const val CHANNEL_ID = "deep_pulse_lockscreen"
        const val NOTIFICATION_ID = 1001
        const val PREFS_NAME = "lockscreen_prefs"

        const val KEY_ENABLED = "lockscreen_enabled"
        const val KEY_ADS_TODAY = "ads_shown_today"
        const val KEY_ADS_THIS_HOUR = "ads_shown_hour"
        const val KEY_LAST_DAY = "last_day"
        const val KEY_LAST_HOUR = "last_hour"
        const val KEY_TOTAL_POINTS = "total_points"

        const val MAX_ADS_PER_DAY = 15
        const val MAX_ADS_PER_HOUR = 3

        // Ad queue — in production, this comes from Firebase/API
        // For now, a simple list managed from React Native
        const val KEY_AD_QUEUE = "ad_queue_json"
    }

    private lateinit var prefs: SharedPreferences
    private var screenReceiver: BroadcastReceiver? = null
    private var swipeReceiver: BroadcastReceiver? = null

    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        createNotificationChannel()
        startForegroundService()
        registerScreenReceiver()
        registerSwipeReceiver()
        Log.d(TAG, "LockScreen Service started")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY // Restart if killed
    }

    override fun onBind(intent: Intent?): IBinder? = null

    /**
     * Create the notification channel for the foreground service.
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "DEEP Pulse Lock Screen",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Displays sponsored content on your lock screen. Earn points with every swipe!"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    /**
     * Start the foreground service with a persistent notification.
     */
    private fun startForegroundService() {
        val notificationIntent = Intent(this, Class.forName("com.deeppulse.MainActivity"))
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val totalPoints = prefs.getInt(KEY_TOTAL_POINTS, 0)
        val adsToday = prefs.getInt(KEY_ADS_TODAY, 0)

        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }.apply {
            setContentTitle("DEEP Pulse")
            setContentText("Swipe-to-Earn active \u2022 $adsToday/$MAX_ADS_PER_DAY today \u2022 $totalPoints pts")
            setSmallIcon(android.R.drawable.ic_dialog_info) // TODO: Replace with app icon
            setContentIntent(pendingIntent)
            setOngoing(true)
        }.build()

        startForeground(NOTIFICATION_ID, notification)
    }

    /**
     * Register broadcast receiver for screen ON events.
     * When the screen turns on, check if we should show an ad.
     */
    private fun registerScreenReceiver() {
        screenReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.action) {
                    Intent.ACTION_SCREEN_ON -> {
                        Log.d(TAG, "Screen ON detected")
                        showAdIfAllowed()
                    }
                    Intent.ACTION_USER_PRESENT -> {
                        // User unlocked the device (after PIN/pattern)
                        Log.d(TAG, "User present (unlocked)")
                    }
                }
            }
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON)
            addAction(Intent.ACTION_USER_PRESENT)
        }

        // RECEIVER_EXPORTED required for system broadcasts (ACTION_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
    }

    /**
     * Register broadcast receiver for swipe results from LockScreenAdActivity.
     */
    private fun registerSwipeReceiver() {
        swipeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.getStringExtra("action") ?: return
                val pointsX10 = intent.getIntExtra("points_x10", 0)

                Log.d(TAG, "Swipe result: action=$action, pointsX10=$pointsX10")

                if (pointsX10 > 0) {
                    val totalPoints = prefs.getInt(KEY_TOTAL_POINTS, 0) + pointsX10
                    prefs.edit().putInt(KEY_TOTAL_POINTS, totalPoints).apply()
                    Log.d(TAG, "Points updated: $totalPoints total (x10)")

                    // Update notification
                    updateNotification()
                }
            }
        }

        val filter = IntentFilter("com.deeppulse.LOCKSCREEN_SWIPE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(swipeReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(swipeReceiver, filter)
        }
    }

    /**
     * Check rate limits and show an ad if allowed.
     */
    private fun showAdIfAllowed() {
        val calendar = java.util.Calendar.getInstance()
        val currentDay = calendar.get(java.util.Calendar.DAY_OF_YEAR)
        val currentHour = calendar.get(java.util.Calendar.HOUR_OF_DAY)

        // Reset daily counter
        val lastDay = prefs.getInt(KEY_LAST_DAY, -1)
        if (lastDay != currentDay) {
            prefs.edit()
                .putInt(KEY_ADS_TODAY, 0)
                .putInt(KEY_LAST_DAY, currentDay)
                .putInt(KEY_ADS_THIS_HOUR, 0)
                .putInt(KEY_LAST_HOUR, currentHour)
                .apply()
        }

        // Reset hourly counter
        val lastHour = prefs.getInt(KEY_LAST_HOUR, -1)
        if (lastHour != currentHour) {
            prefs.edit()
                .putInt(KEY_ADS_THIS_HOUR, 0)
                .putInt(KEY_LAST_HOUR, currentHour)
                .apply()
        }

        val adsToday = prefs.getInt(KEY_ADS_TODAY, 0)
        val adsThisHour = prefs.getInt(KEY_ADS_THIS_HOUR, 0)

        // Check limits
        if (adsToday >= MAX_ADS_PER_DAY) {
            Log.d(TAG, "Daily limit reached ($MAX_ADS_PER_DAY)")
            return
        }
        if (adsThisHour >= MAX_ADS_PER_HOUR) {
            Log.d(TAG, "Hourly limit reached ($MAX_ADS_PER_HOUR)")
            return
        }

        // Check if enabled
        if (!prefs.getBoolean(KEY_ENABLED, true)) {
            Log.d(TAG, "LockScreen ads disabled by user")
            return
        }

        // Get next ad from queue
        val adData = getNextAd()

        // Show the ad
        val adIntent = Intent(this, LockScreenAdActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra(LockScreenAdActivity.EXTRA_AD_CONTENT_URL, adData?.get("contentUrl"))
            putExtra(LockScreenAdActivity.EXTRA_AD_TITLE, adData?.get("title") ?: "Discover something new")
            putExtra(LockScreenAdActivity.EXTRA_AD_BRAND, adData?.get("brand") ?: "DEEP Pulse")
            putExtra(LockScreenAdActivity.EXTRA_AD_CLICK_URL, adData?.get("clickUrl"))
            putExtra(LockScreenAdActivity.EXTRA_AD_INDEX, adsToday + 1)
            putExtra(LockScreenAdActivity.EXTRA_ADS_TODAY, MAX_ADS_PER_DAY)
        }
        startActivity(adIntent)

        // Update counters
        prefs.edit()
            .putInt(KEY_ADS_TODAY, adsToday + 1)
            .putInt(KEY_ADS_THIS_HOUR, adsThisHour + 1)
            .apply()

        Log.d(TAG, "Ad shown: ${adsToday + 1}/$MAX_ADS_PER_DAY today, ${adsThisHour + 1}/$MAX_ADS_PER_HOUR this hour")
    }

    /**
     * Get the next ad from the queue.
     * In production, this pulls from Firebase or local cache.
     * For now, returns mock data or data set from React Native.
     */
    private fun getNextAd(): Map<String, String>? {
        val queueJson = prefs.getString(KEY_AD_QUEUE, null)
        if (queueJson != null) {
            try {
                // Parse JSON array of ad objects
                val jsonArray = org.json.JSONArray(queueJson)
                val adsToday = prefs.getInt(KEY_ADS_TODAY, 0)
                if (jsonArray.length() > 0) {
                    val adIndex = adsToday % jsonArray.length()  // Circular rotation
                    val adObj = jsonArray.getJSONObject(adIndex)
                    return mapOf(
                        "contentUrl" to (adObj.optString("contentUrl", "")),
                        "title" to (adObj.optString("title", "Sponsored Content")),
                        "brand" to (adObj.optString("brand", "")),
                        "clickUrl" to (adObj.optString("clickUrl", ""))
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing ad queue", e)
            }
        }

        // Return null for default template
        return null
    }

    /**
     * Update the foreground notification with current stats.
     */
    private fun updateNotification() {
        val totalPoints = prefs.getInt(KEY_TOTAL_POINTS, 0)
        val adsToday = prefs.getInt(KEY_ADS_TODAY, 0)

        val notificationIntent = Intent(this, Class.forName("com.deeppulse.MainActivity"))
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }.apply {
            setContentTitle("DEEP Pulse")
            setContentText("Swipe-to-Earn active \u2022 $adsToday/$MAX_ADS_PER_DAY today \u2022 $totalPoints pts")
            setSmallIcon(android.R.drawable.ic_dialog_info)
            setContentIntent(pendingIntent)
            setOngoing(true)
        }.build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(NOTIFICATION_ID, notification)
    }

    /**
     * Called when user swipes the app from recents.
     * Schedule a restart via AlarmManager so the service survives.
     */
    override fun onTaskRemoved(rootIntent: Intent?) {
        Log.d(TAG, "App removed from recents — scheduling service restart")
        scheduleRestart()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        screenReceiver?.let { unregisterReceiver(it) }
        swipeReceiver?.let { unregisterReceiver(it) }

        // Only schedule restart if the service should be running
        if (prefs.getBoolean(KEY_ENABLED, false)) {
            Log.d(TAG, "Service destroyed while enabled — scheduling restart")
            scheduleRestart()
        }

        Log.d(TAG, "LockScreen Service stopped")
        super.onDestroy()
    }

    /**
     * Schedule a service restart via AlarmManager after 1 second.
     */
    private fun scheduleRestart() {
        val restartIntent = Intent(this, LockScreenService::class.java)
        val pendingIntent = PendingIntent.getService(
            this, 1, restartIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmManager = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            System.currentTimeMillis() + 1000,
            pendingIntent
        )
    }
}
