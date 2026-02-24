package com.deeppulse.lockscreen

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import kotlin.math.abs

/**
 * LockScreenAdActivity — Full-screen overlay displayed on the lock screen.
 *
 * Displays brand content via a WebView (HTML5: images, slideshows, videos, interactive).
 * User swipes RIGHT to dismiss (skip, +5 pts) or LEFT to learn more (+10 pts).
 *
 * Content is loaded from a URL passed via Intent extra "ad_content_url".
 * Fallback to a default HTML template if no URL is provided.
 */
class LockScreenAdActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var gestureDetector: GestureDetector
    private lateinit var swipeHintLeft: TextView
    private lateinit var swipeHintRight: TextView
    private lateinit var pointsBadge: TextView
    private lateinit var adCountText: TextView

    private var adContentUrl: String? = null
    private var adTitle: String = ""
    private var adBrandName: String = ""
    private var adClickUrl: String? = null
    private var currentAdIndex: Int = 0
    private var totalAdsToday: Int = 0

    companion object {
        const val EXTRA_AD_CONTENT_URL = "ad_content_url"
        const val EXTRA_AD_TITLE = "ad_title"
        const val EXTRA_AD_BRAND = "ad_brand"
        const val EXTRA_AD_CLICK_URL = "ad_click_url"
        const val EXTRA_AD_INDEX = "ad_index"
        const val EXTRA_ADS_TODAY = "ads_today"

        private const val SWIPE_THRESHOLD = 120
        private const val SWIPE_VELOCITY_THRESHOLD = 200

        const val RESULT_SKIPPED = 1     // Swipe right — skip (+5 pts)
        const val RESULT_ENGAGED = 2     // Swipe left — learn more (+10 pts)
        const val RESULT_DISMISSED = 3   // Back button
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ========================================
        // Show on lock screen
        // ========================================
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        // Fullscreen immersive
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        // ========================================
        // Parse intent extras
        // ========================================
        adContentUrl = intent.getStringExtra(EXTRA_AD_CONTENT_URL)
        adTitle = intent.getStringExtra(EXTRA_AD_TITLE) ?: "Sponsored Content"
        adBrandName = intent.getStringExtra(EXTRA_AD_BRAND) ?: ""
        adClickUrl = intent.getStringExtra(EXTRA_AD_CLICK_URL)
        currentAdIndex = intent.getIntExtra(EXTRA_AD_INDEX, 0)
        totalAdsToday = intent.getIntExtra(EXTRA_ADS_TODAY, 0)

        // ========================================
        // Build layout programmatically
        // ========================================
        val rootLayout = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(0xFF000000.toInt())
        }

        // WebView — main content area
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.loadWithOverviewMode = true
            settings.useWideViewPort = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()

            // Transparent background
            setBackgroundColor(0x00000000)
        }
        rootLayout.addView(webView)

        // Swipe hint — LEFT (learn more)
        swipeHintLeft = TextView(this).apply {
            text = "\u2190 En savoir +"
            textSize = 14f
            setTextColor(0xCCFFFFFF.toInt())
            setPadding(32, 0, 0, 48)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.BOTTOM or android.view.Gravity.START
            }
        }
        rootLayout.addView(swipeHintLeft)

        // Swipe hint — RIGHT (skip / unlock)
        swipeHintRight = TextView(this).apply {
            text = "D\u00e9verrouiller \u2192"
            textSize = 14f
            setTextColor(0xCCFFFFFF.toInt())
            setPadding(0, 0, 32, 48)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.BOTTOM or android.view.Gravity.END
            }
        }
        rootLayout.addView(swipeHintRight)

        // Points badge — top right
        pointsBadge = TextView(this).apply {
            text = "+5 pts"
            textSize = 12f
            setTextColor(0xFFFFD700.toInt()) // Gold
            setPadding(0, 48, 32, 0)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.TOP or android.view.Gravity.END
            }
        }
        rootLayout.addView(pointsBadge)

        // Ad counter — top left
        adCountText = TextView(this).apply {
            text = if (totalAdsToday > 0) "${currentAdIndex}/${totalAdsToday}" else ""
            textSize = 12f
            setTextColor(0x99FFFFFF.toInt())
            setPadding(32, 48, 0, 0)
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = android.view.Gravity.TOP or android.view.Gravity.START
            }
        }
        rootLayout.addView(adCountText)

        // Brand name — bottom center
        if (adBrandName.isNotEmpty()) {
            val brandLabel = TextView(this).apply {
                text = "Sponsoris\u00e9 par $adBrandName"
                textSize = 11f
                setTextColor(0x88FFFFFF.toInt())
                setPadding(0, 0, 0, 16)
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    gravity = android.view.Gravity.BOTTOM or android.view.Gravity.CENTER_HORIZONTAL
                }
            }
            rootLayout.addView(brandLabel)
        }

        setContentView(rootLayout)

        // ========================================
        // Gesture detection (swipe left/right)
        // ========================================
        gestureDetector = GestureDetector(this, object : GestureDetector.SimpleOnGestureListener() {
            override fun onFling(
                e1: MotionEvent?,
                e2: MotionEvent,
                velocityX: Float,
                velocityY: Float
            ): Boolean {
                if (e1 == null) return false
                val diffX = e2.x - e1.x
                val diffY = e2.y - e1.y

                if (abs(diffX) > abs(diffY) && abs(diffX) > SWIPE_THRESHOLD && abs(velocityX) > SWIPE_VELOCITY_THRESHOLD) {
                    if (diffX > 0) {
                        // Swipe RIGHT — Skip / Unlock (+5 pts)
                        onSwipeRight()
                    } else {
                        // Swipe LEFT — Learn more (+10 pts)
                        onSwipeLeft()
                    }
                    return true
                }
                return false
            }

            override fun onDown(e: MotionEvent): Boolean = true
        })

        // ========================================
        // Load content
        // ========================================
        loadAdContent()
    }

    /**
     * Load ad content into WebView.
     * If a URL is provided, load it directly.
     * Otherwise, render a default HTML template with the ad info.
     */
    private fun loadAdContent() {
        if (!adContentUrl.isNullOrEmpty()) {
            webView.loadUrl(adContentUrl!!)
        } else {
            // Default HTML template — fullscreen image with gradient overlay
            val html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            width: 100vw; height: 100vh;
                            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                            display: flex; flex-direction: column;
                            align-items: center; justify-content: center;
                            font-family: -apple-system, sans-serif;
                            color: white; overflow: hidden;
                        }
                        .logo {
                            width: 80px; height: 80px;
                            border-radius: 20px;
                            background: linear-gradient(135deg, #e94560, #533483);
                            display: flex; align-items: center; justify-content: center;
                            font-size: 36px; font-weight: bold;
                            margin-bottom: 24px;
                            box-shadow: 0 8px 32px rgba(233, 69, 96, 0.3);
                        }
                        h1 {
                            font-size: 24px; font-weight: 700;
                            text-align: center; padding: 0 32px;
                            margin-bottom: 12px;
                        }
                        p {
                            font-size: 16px; opacity: 0.7;
                            text-align: center; padding: 0 48px;
                        }
                        .pulse {
                            animation: pulse 2s ease-in-out infinite;
                        }
                        @keyframes pulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                        }
                    </style>
                </head>
                <body>
                    <div class="logo pulse">DP</div>
                    <h1>${adTitle.replace("\"", "&quot;")}</h1>
                    <p>${adBrandName.replace("\"", "&quot;")}</p>
                </body>
                </html>
            """.trimIndent()
            webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
        }
    }

    /**
     * Swipe RIGHT — User skips ad to unlock phone.
     * Awards +5 points.
     */
    private fun onSwipeRight() {
        setResult(RESULT_SKIPPED)
        // Send broadcast to React Native
        val intent = Intent("com.deeppulse.LOCKSCREEN_SWIPE").apply {
            putExtra("action", "skip")
            putExtra("points", 5)
            putExtra("ad_index", currentAdIndex)
        }
        sendBroadcast(intent)
        finishAndRemoveTask()
    }

    /**
     * Swipe LEFT — User wants to learn more about the ad.
     * Awards +10 points.
     * Opens the brand URL in the main app or browser.
     */
    private fun onSwipeLeft() {
        setResult(RESULT_ENGAGED)
        // Send broadcast to React Native
        val broadcastIntent = Intent("com.deeppulse.LOCKSCREEN_SWIPE").apply {
            putExtra("action", "engage")
            putExtra("points", 10)
            putExtra("ad_index", currentAdIndex)
        }
        sendBroadcast(broadcastIntent)

        // Open the click URL if available
        if (!adClickUrl.isNullOrEmpty()) {
            try {
                val browseIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(adClickUrl))
                browseIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(browseIntent)
            } catch (_: Exception) {
                // Ignore if no browser available
            }
        }

        finishAndRemoveTask()
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(event)
        return super.onTouchEvent(event)
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        gestureDetector.onTouchEvent(ev)
        return super.dispatchTouchEvent(ev)
    }

    override fun onBackPressed() {
        // Back button = dismiss without extra points
        setResult(RESULT_DISMISSED)
        val intent = Intent("com.deeppulse.LOCKSCREEN_SWIPE").apply {
            putExtra("action", "dismiss")
            putExtra("points", 0)
            putExtra("ad_index", currentAdIndex)
        }
        sendBroadcast(intent)
        super.onBackPressed()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
