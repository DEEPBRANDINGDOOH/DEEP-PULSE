package com.deeppulse.lockscreen

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * BootReceiver — Restarts the LockScreenService after device reboot.
 * Only starts if the user had previously enabled the Swipe-to-Earn feature.
 */
class BootReceiver : BroadcastReceiver() {

    companion object {
        const val TAG = "BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences(LockScreenService.PREFS_NAME, Context.MODE_PRIVATE)
        val enabled = prefs.getBoolean(LockScreenService.KEY_ENABLED, false)

        if (enabled) {
            Log.d(TAG, "Boot completed — restarting LockScreen service")
            val serviceIntent = Intent(context, LockScreenService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } else {
            Log.d(TAG, "Boot completed — LockScreen service disabled, not starting")
        }
    }
}
