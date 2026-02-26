# ============================================
# DEEP Pulse — ProGuard / R8 Keep Rules
# Release build obfuscation + optimization
# ============================================

# ============================================
# 1. REACT NATIVE
# ============================================
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**

# React Native Flipper (debug only, stripped in release)
-dontwarn com.facebook.flipper.**

# Keep JavaScript interface annotations
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp *;
}

# ============================================
# 2. SOLANA MOBILE WALLET ADAPTER
# ============================================
-keep class com.solanamobile.** { *; }
-keep class com.solana.** { *; }
-dontwarn com.solanamobile.**

# ============================================
# 3. FIREBASE (Firestore, Functions, Messaging, Storage)
# ============================================
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Firestore protobuf
-keep class com.google.protobuf.** { *; }
-dontwarn com.google.protobuf.**

# ============================================
# 4. OKHTTP (Networking — used by Firebase & RN)
# ============================================
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-dontwarn okhttp3.**
-dontwarn okio.**

# ============================================
# 5. ANDROIDX & SUPPORT
# ============================================
-keep class androidx.** { *; }
-dontwarn androidx.**

# ============================================
# 6. KOTLIN (Required by Solana MWA)
# ============================================
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# ============================================
# 7. NATIVE MODULES (Custom & Autolinked)
# ============================================
# Keep all native module classes (they're accessed via reflection)
-keep class com.deeppulse.** { *; }

# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# react-native-svg
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }
-dontwarn com.th3rdwave.safeareacontext.**

# react-native-vector-icons
-keep class com.oblador.vectoricons.** { *; }
-dontwarn com.oblador.vectoricons.**

# react-native-image-picker
-keep class com.imagepicker.** { *; }
-dontwarn com.imagepicker.**

# ============================================
# 8. SECURITY: Strip console.log in release
# ============================================
# R8 will remove calls to these methods in release builds
-assumenosideeffects class android.util.Log {
    public static int d(...);
    public static int v(...);
}

# ============================================
# 9. KEEP ANNOTATIONS
# ============================================
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes SourceFile,LineNumberTable
-keepattributes InnerClasses,EnclosingMethod

# ============================================
# 10. MISC
# ============================================
# Keep Parcelable implementations
-keep class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
