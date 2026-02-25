package com.deeppulse.lockscreen

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.GestureDetector
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.OvershootInterpolator
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import kotlin.math.abs

/**
 * LockScreenAdActivity — Full-screen overlay displayed on the lock screen.
 *
 * Displays brand content via a WebView (HTML5: images, slideshows, videos, interactive).
 * User can:
 *   - Tap "Unlock" button → skip (+0.2 pts)
 *   - Tap "Learn More" button → learn more (+0.5 pts)
 *   - Swipe RIGHT → skip (+0.2 pts)
 *   - Swipe LEFT → learn more (+0.5 pts)
 *
 * Content is loaded from a URL passed via Intent extra "ad_content_url".
 * Fallback to a default HTML template if no URL is provided.
 */
class LockScreenAdActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var gestureDetector: GestureDetector
    private lateinit var pointsBadge: TextView
    private lateinit var adCountText: TextView
    private lateinit var touchOverlay: View

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

        private const val SWIPE_THRESHOLD = 100
        private const val SWIPE_VELOCITY_THRESHOLD = 150

        const val RESULT_SKIPPED = 1     // Skip (+0.2 pts)
        const val RESULT_ENGAGED = 2     // Learn more (+0.5 pts)
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

        // ========================================
        // Transparent touch overlay (captures swipes above WebView)
        // ========================================
        touchOverlay = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ).apply {
                // Leave bottom 200dp for buttons
                bottomMargin = dpToPx(200)
            }
            setBackgroundColor(0x00000000)
            isClickable = true
            isFocusable = true
        }
        rootLayout.addView(touchOverlay)

        // ========================================
        // Bottom button panel
        // ========================================
        val bottomPanel = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.BOTTOM
            }
            setPadding(dpToPx(24), dpToPx(16), dpToPx(24), dpToPx(32))
        }

        // Brand label
        if (adBrandName.isNotEmpty()) {
            val brandLabel = TextView(this).apply {
                text = "Sponsored by $adBrandName"
                textSize = 12f
                setTextColor(0x99FFFFFF.toInt())
                gravity = Gravity.CENTER
                setPadding(0, 0, 0, dpToPx(16))
            }
            bottomPanel.addView(brandLabel)
        }

        // Button row
        val buttonRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            gravity = Gravity.CENTER
        }

        // ---- "Learn More" button (LEFT action = engage = +0.5 pts) ----
        val learnMoreBtn = createButton(
            "\u2190  Learn More",
            "+0.5 pts",
            intArrayOf(0xFF533483.toInt(), 0xFFe94560.toInt()), // Purple-red gradient
            true
        )
        learnMoreBtn.setOnClickListener {
            animateButtonPress(it)
            Handler(Looper.getMainLooper()).postDelayed({ onSwipeLeft() }, 300)
        }
        val learnMoreParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
            rightMargin = dpToPx(8)
        }
        buttonRow.addView(learnMoreBtn, learnMoreParams)

        // ---- "Unlock" button (RIGHT action = skip = +0.2 pts) ----
        val unlockBtn = createButton(
            "Unlock  \u2192",
            "+0.2 pts",
            intArrayOf(0xFF0f3460.toInt(), 0xFF16213e.toInt()), // Blue gradient
            false
        )
        unlockBtn.setOnClickListener {
            animateButtonPress(it)
            Handler(Looper.getMainLooper()).postDelayed({ onSwipeRight() }, 300)
        }
        val unlockParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
            leftMargin = dpToPx(8)
        }
        buttonRow.addView(unlockBtn, unlockParams)

        bottomPanel.addView(buttonRow)

        // Swipe hint text
        val swipeHint = TextView(this).apply {
            text = "\u2B05 Swipe or tap a button \u27A1"
            textSize = 11f
            setTextColor(0x66FFFFFF.toInt())
            gravity = Gravity.CENTER
            setPadding(0, dpToPx(12), 0, 0)
        }
        bottomPanel.addView(swipeHint)

        rootLayout.addView(bottomPanel)

        // ========================================
        // Points badge — top right
        // ========================================
        pointsBadge = TextView(this).apply {
            text = "DEEP Score"
            textSize = 13f
            setTextColor(0xFF000000.toInt())
            val badgeBg = GradientDrawable().apply {
                setColor(0xFFFFD700.toInt()) // Gold
                cornerRadius = dpToPx(12).toFloat()
            }
            background = badgeBg
            setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.END
                topMargin = dpToPx(48)
                rightMargin = dpToPx(16)
            }
        }
        rootLayout.addView(pointsBadge)

        // Ad counter — top left
        adCountText = TextView(this).apply {
            text = if (totalAdsToday > 0) "${currentAdIndex}/${totalAdsToday}" else ""
            textSize = 13f
            setTextColor(0xCCFFFFFF.toInt())
            val counterBg = GradientDrawable().apply {
                setColor(0x44FFFFFF.toInt())
                cornerRadius = dpToPx(12).toFloat()
            }
            background = counterBg
            setPadding(dpToPx(12), dpToPx(6), dpToPx(12), dpToPx(6))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                gravity = Gravity.TOP or Gravity.START
                topMargin = dpToPx(48)
                leftMargin = dpToPx(16)
            }
        }
        rootLayout.addView(adCountText)

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
                        onSwipeRight()
                    } else {
                        onSwipeLeft()
                    }
                    return true
                }
                return false
            }

            override fun onDown(e: MotionEvent): Boolean = true
        })

        // Set touch listener on the overlay
        touchOverlay.setOnTouchListener { _, event ->
            gestureDetector.onTouchEvent(event)
            true
        }

        // ========================================
        // Load content + entrance animation
        // ========================================
        loadAdContent()
        animateEntrance(rootLayout)
    }

    /**
     * Create a styled button with gradient background.
     */
    private fun createButton(
        label: String,
        pointsLabel: String,
        gradientColors: IntArray,
        isLearnMore: Boolean
    ): LinearLayout {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dpToPx(16), dpToPx(16), dpToPx(16), dpToPx(16))

            val bg = GradientDrawable().apply {
                colors = gradientColors
                orientation = GradientDrawable.Orientation.LEFT_RIGHT
                cornerRadius = dpToPx(16).toFloat()
                setStroke(1, 0x33FFFFFF.toInt())
            }
            background = bg
            elevation = dpToPx(4).toFloat()
            isClickable = true
            isFocusable = true
        }

        val mainText = TextView(this).apply {
            text = label
            textSize = 15f
            setTextColor(Color.WHITE)
            gravity = Gravity.CENTER
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        container.addView(mainText)

        val pointsText = TextView(this).apply {
            text = pointsLabel
            textSize = 12f
            setTextColor(0xFFFFD700.toInt()) // Gold
            gravity = Gravity.CENTER
            setPadding(0, dpToPx(4), 0, 0)
        }
        container.addView(pointsText)

        return container
    }

    /**
     * Animate button press with scale effect.
     */
    private fun animateButtonPress(view: View) {
        val scaleDownX = ObjectAnimator.ofFloat(view, "scaleX", 1f, 0.9f)
        val scaleDownY = ObjectAnimator.ofFloat(view, "scaleY", 1f, 0.9f)
        scaleDownX.duration = 100
        scaleDownY.duration = 100

        val scaleUpX = ObjectAnimator.ofFloat(view, "scaleX", 0.9f, 1f)
        val scaleUpY = ObjectAnimator.ofFloat(view, "scaleY", 0.9f, 1f)
        scaleUpX.duration = 150
        scaleUpY.duration = 150
        scaleUpX.interpolator = OvershootInterpolator()
        scaleUpY.interpolator = OvershootInterpolator()

        val set = AnimatorSet()
        set.play(scaleDownX).with(scaleDownY)
        set.play(scaleUpX).with(scaleUpY).after(scaleDownX)
        set.start()
    }

    /**
     * Entrance animation: fade in + slide up.
     */
    private fun animateEntrance(view: View) {
        view.alpha = 0f
        view.translationY = 50f
        view.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(400)
            .setInterpolator(OvershootInterpolator(0.5f))
            .start()
    }

    /**
     * Load ad content into WebView.
     */
    private fun loadAdContent() {
        if (!adContentUrl.isNullOrEmpty()) {
            webView.loadUrl(adContentUrl!!)
        } else {
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
                            -webkit-user-select: none;
                            user-select: none;
                            touch-action: none;
                        }
                        .logo-container {
                            position: relative;
                            margin-bottom: 32px;
                        }
                        .logo {
                            width: 100px; height: 100px;
                            border-radius: 24px;
                            background: linear-gradient(135deg, #e94560, #533483);
                            display: flex; align-items: center; justify-content: center;
                            font-size: 42px; font-weight: bold;
                            box-shadow: 0 12px 40px rgba(233, 69, 96, 0.4);
                            animation: pulse 2s ease-in-out infinite;
                        }
                        .glow {
                            position: absolute;
                            top: -10px; left: -10px; right: -10px; bottom: -10px;
                            border-radius: 34px;
                            background: linear-gradient(135deg, rgba(233, 69, 96, 0.3), rgba(83, 52, 131, 0.3));
                            filter: blur(15px);
                            animation: glowPulse 2s ease-in-out infinite;
                        }
                        h1 {
                            font-size: 26px; font-weight: 700;
                            text-align: center; padding: 0 32px;
                            margin-bottom: 12px;
                            text-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        }
                        p {
                            font-size: 16px; opacity: 0.6;
                            text-align: center; padding: 0 48px;
                        }
                        .badge {
                            display: inline-block;
                            background: rgba(255, 215, 0, 0.15);
                            border: 1px solid rgba(255, 215, 0, 0.3);
                            color: #FFD700;
                            padding: 6px 16px;
                            border-radius: 20px;
                            font-size: 13px;
                            margin-top: 24px;
                            font-weight: 600;
                        }
                        @keyframes pulse {
                            0%, 100% { transform: scale(1); }
                            50% { transform: scale(1.05); }
                        }
                        @keyframes glowPulse {
                            0%, 100% { opacity: 0.5; }
                            50% { opacity: 1; }
                        }
                    </style>
                </head>
                <body>
                    <div class="logo-container">
                        <div class="glow"></div>
                        <div class="logo">DP</div>
                    </div>
                    <h1>${adTitle.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")}</h1>
                    <p>${adBrandName.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")}</p>
                    <div class="badge">SWIPE-TO-EARN</div>
                </body>
                </html>
            """.trimIndent()
            webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
        }
    }

    /**
     * Swipe RIGHT / Tap "Unlock" — User skips ad to unlock phone.
     * Awards +0.2 pts (daily cap: 3 pts total from lockscreen).
     */
    private fun onSwipeRight() {
        setResult(RESULT_SKIPPED)
        val intent = Intent("com.deeppulse.LOCKSCREEN_SWIPE").apply {
            putExtra("action", "skip")
            putExtra("points_x10", 2) // 0.2 pts (sent as x10 integer to avoid float)
            putExtra("ad_index", currentAdIndex)
        }
        sendBroadcast(intent)
        finishAndRemoveTask()
    }

    /**
     * Swipe LEFT / Tap "Learn More" — User wants to learn more.
     * Awards +0.5 pts (daily cap: 3 pts total from lockscreen).
     */
    private fun onSwipeLeft() {
        setResult(RESULT_ENGAGED)
        val broadcastIntent = Intent("com.deeppulse.LOCKSCREEN_SWIPE").apply {
            putExtra("action", "engage")
            putExtra("points_x10", 5) // 0.5 pts (sent as x10 integer)
            putExtra("ad_index", currentAdIndex)
        }
        sendBroadcast(broadcastIntent)

        // Open the click URL if available
        if (!adClickUrl.isNullOrEmpty()) {
            try {
                val browseIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(adClickUrl))
                browseIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(browseIntent)
            } catch (_: Exception) {}
        }

        finishAndRemoveTask()
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        // Let the gesture detector also process events that go to buttons
        gestureDetector.onTouchEvent(ev)
        return super.dispatchTouchEvent(ev)
    }

    override fun onBackPressed() {
        setResult(RESULT_DISMISSED)
        val intent = Intent("com.deeppulse.LOCKSCREEN_SWIPE").apply {
            putExtra("action", "dismiss")
            putExtra("points_x10", 0)
            putExtra("ad_index", currentAdIndex)
        }
        sendBroadcast(intent)
        super.onBackPressed()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }

    private fun dpToPx(dp: Int): Int {
        return (dp * resources.displayMetrics.density).toInt()
    }
}
