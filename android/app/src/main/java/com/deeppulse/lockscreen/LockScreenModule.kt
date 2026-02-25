package com.deeppulse.lockscreen

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * LockScreenModule — React Native bridge for the LockScreen Overlay feature.
 *
 * Exposes methods to JS:
 * - startService()        — Start the foreground service
 * - stopService()         — Stop the foreground service
 * - isRunning()           — Check if the service is active
 * - setEnabled(bool)      — Enable/disable ad display
 * - getStats()            — Get today's stats (ads shown, points)
 * - setAdQueue(ads)       — Push ad queue from JS (array of ad objects)
 * - hasOverlayPermission() — Check SYSTEM_ALERT_WINDOW permission
 * - requestOverlayPermission() — Open system settings for overlay permission
 *
 * Emits events to JS:
 * - "onLockScreenSwipe"   — { action: "skip"|"engage"|"dismiss", points: number }
 */
class LockScreenModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val TAG = "LockScreenModule"
        const val MODULE_NAME = "LockScreenModule"
    }

    private var swipeReceiver: BroadcastReceiver? = null

    override fun getName(): String = MODULE_NAME

    override fun initialize() {
        super.initialize()
        registerSwipeListener()
    }

    /**
     * Listen for swipe broadcasts and forward to JS as events.
     */
    private fun registerSwipeListener() {
        swipeReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val action = intent.getStringExtra("action") ?: return
                // points_x10: integer representing points * 10 (e.g. 2 = 0.2 pts, 5 = 0.5 pts)
                val pointsX10 = intent.getIntExtra("points_x10", 0)
                val adIndex = intent.getIntExtra("ad_index", 0)

                val params: WritableMap = Arguments.createMap().apply {
                    putString("action", action)
                    putDouble("points", pointsX10 / 10.0) // Convert back to decimal
                    putInt("adIndex", adIndex)
                }

                // Emit event to JavaScript
                try {
                    reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                        .emit("onLockScreenSwipe", params)
                } catch (e: Exception) {
                    Log.e(TAG, "Error emitting swipe event", e)
                }
            }
        }

        val filter = IntentFilter("com.deeppulse.LOCKSCREEN_SWIPE")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(swipeReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            reactContext.registerReceiver(swipeReceiver, filter)
        }
    }

    // ========================================
    // SERVICE CONTROL
    // ========================================

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            // Check overlay permission first
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(reactContext)) {
                promise.reject("PERMISSION_DENIED", "Overlay permission required. Call requestOverlayPermission() first.")
                return
            }

            val intent = Intent(reactContext, LockScreenService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            promise.resolve(true)
            Log.d(TAG, "LockScreen service started from JS")
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactContext, LockScreenService::class.java)
            reactContext.stopService(intent)
            promise.resolve(true)
            Log.d(TAG, "LockScreen service stopped from JS")
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        // Check via SharedPreferences or ActivityManager
        val prefs = reactContext.getSharedPreferences(LockScreenService.PREFS_NAME, Context.MODE_PRIVATE)
        // Simple heuristic: if enabled and service was started
        promise.resolve(prefs.getBoolean(LockScreenService.KEY_ENABLED, false))
    }

    // ========================================
    // SETTINGS
    // ========================================

    @ReactMethod
    fun setEnabled(enabled: Boolean, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(LockScreenService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(LockScreenService.KEY_ENABLED, enabled).apply()
            promise.resolve(enabled)
            Log.d(TAG, "LockScreen enabled: $enabled")
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message, e)
        }
    }

    // ========================================
    // STATS
    // ========================================

    @ReactMethod
    fun getStats(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(LockScreenService.PREFS_NAME, Context.MODE_PRIVATE)
            val stats: WritableMap = Arguments.createMap().apply {
                putInt("adsToday", prefs.getInt(LockScreenService.KEY_ADS_TODAY, 0))
                putInt("adsThisHour", prefs.getInt(LockScreenService.KEY_ADS_THIS_HOUR, 0))
                putInt("totalPoints", prefs.getInt(LockScreenService.KEY_TOTAL_POINTS, 0))
                putInt("maxAdsPerDay", LockScreenService.MAX_ADS_PER_DAY)
                putInt("maxAdsPerHour", LockScreenService.MAX_ADS_PER_HOUR)
                putBoolean("enabled", prefs.getBoolean(LockScreenService.KEY_ENABLED, true))
            }
            promise.resolve(stats)
        } catch (e: Exception) {
            promise.reject("STATS_ERROR", e.message, e)
        }
    }

    // ========================================
    // AD QUEUE MANAGEMENT
    // ========================================

    /**
     * Push ad queue from JS side.
     * Each ad should have: { contentUrl, title, brand, clickUrl }
     */
    @ReactMethod
    fun setAdQueue(ads: ReadableArray, promise: Promise) {
        try {
            val jsonArray = org.json.JSONArray()
            for (i in 0 until ads.size()) {
                val ad = ads.getMap(i)
                val jsonObj = org.json.JSONObject().apply {
                    put("contentUrl", ad?.getString("contentUrl") ?: "")
                    put("title", ad?.getString("title") ?: "Sponsored Content")
                    put("brand", ad?.getString("brand") ?: "")
                    put("clickUrl", ad?.getString("clickUrl") ?: "")
                }
                jsonArray.put(jsonObj)
            }

            val prefs = reactContext.getSharedPreferences(LockScreenService.PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(LockScreenService.KEY_AD_QUEUE, jsonArray.toString()).apply()

            promise.resolve(ads.size())
            Log.d(TAG, "Ad queue updated: ${ads.size()} ads")
        } catch (e: Exception) {
            promise.reject("QUEUE_ERROR", e.message, e)
        }
    }

    // ========================================
    // PERMISSIONS
    // ========================================

    @ReactMethod
    fun hasOverlayPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactContext))
        } else {
            promise.resolve(true) // Pre-M doesn't need explicit permission
        }
    }

    @ReactMethod
    fun requestOverlayPermission(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Settings.canDrawOverlays(reactContext)) {
                    promise.resolve(true) // Already granted
                    return
                }
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(false) // User needs to toggle the permission
            } else {
                promise.resolve(true) // Not needed pre-M
            }
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message, e)
        }
    }

    // ========================================
    // CLEANUP
    // ========================================

    override fun onCatalystInstanceDestroy() {
        swipeReceiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: Exception) {}
        }
        super.onCatalystInstanceDestroy()
    }
}
