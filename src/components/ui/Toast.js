/**
 * Toast — Non-blocking confirmation UI to replace Alert.alert for success/info messages.
 *
 * Usage (anywhere, no hooks needed):
 *   import { showToast } from '../components/ui/Toast';
 *   showToast({ type: 'success', title: 'Subscribed!', message: 'You will receive notifications.' });
 *
 * Mount <ToastHost /> once in App.js above NavigationContainer.
 *
 * Variants: 'success' (green), 'error' (red), 'info' (orange/primary)
 */
import React, { useEffect, useRef, useState } from 'react';
import { Text, View, Animated, Easing, Pressable, Platform, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { haptics } from '../../utils/haptics';

// ---- Module-level emitter (so any file can call showToast without hooks) ----
let _listeners = [];
let _nextId = 0;

/**
 * Show a toast notification.
 * @param {Object} opts
 * @param {'success'|'error'|'info'} opts.type
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {number} opts.duration - ms; default 2500 (or 4500 if action is present)
 * @param {Object} [opts.action] - optional action button
 * @param {string} opts.action.label - button label (e.g. "View on Solscan")
 * @param {string|Function} opts.action.href - URL to open on press, or function to call
 * @param {string} [opts.action.icon] - Ionicons name (default "open-outline")
 */
export function showToast({ type = 'info', title = '', message = '', duration, action = null } = {}) {
  const id = ++_nextId;
  const defaultDuration = action ? 4500 : 2500;
  const finalDuration = duration != null ? duration : defaultDuration;
  // [B61] Auto-haptic based on toast type
  if (type === 'success') haptics.success();
  else if (type === 'error') haptics.error();
  else haptics.impact();
  _listeners.forEach(fn => fn({ id, type, title, message, duration: finalDuration, action }));
  return id;
}

// ---- Solana explorer helper ----
// [B61] Returns a Solscan URL for a tx signature on the current cluster.
export function getSolscanTxUrl(signature, cluster = 'devnet') {
  if (!signature) return null;
  // Skip mock signatures
  if (String(signature).startsWith('devnet_mock_') || String(signature).startsWith('mock_')) return null;
  return `https://solscan.io/tx/${signature}${cluster !== 'mainnet' ? `?cluster=${cluster}` : ''}`;
}

function subscribe(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter(f => f !== fn);
  };
}

// ---- Variant colors aligned with tailwind.config.js ----
const VARIANTS = {
  success: { accent: '#22c55e', icon: 'checkmark-circle' },
  error: { accent: '#ef4444', icon: 'alert-circle' },
  info: { accent: '#FF9F66', icon: 'information-circle' },
};

// ---- Single toast card with slide + fade animation ----
function ToastCard({ toast, onDismiss }) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const variant = VARIANTS[toast.type] || VARIANTS.info;

  useEffect(() => {
    // Slide down + fade in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -80,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss(toast.id));
    }, toast.duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  };

  const handleActionPress = async (e) => {
    e?.stopPropagation?.();
    if (!toast.action) return;
    const { href } = toast.action;
    if (typeof href === 'function') {
      href();
    } else if (typeof href === 'string') {
      try {
        await Linking.openURL(href);
      } catch (_) {}
    }
    // Dismiss after action
    handlePress();
  };

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
        marginBottom: 8,
      }}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title}. ${toast.message}`}
      >
        <View
          className="bg-background-card rounded-2xl overflow-hidden px-4 py-3"
          style={{
            shadowColor: variant.accent,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
            elevation: 10,
            borderLeftWidth: 3,
            borderLeftColor: variant.accent,
          }}
        >
          <View className="flex-row items-center">
            <Ionicons name={variant.icon} size={24} color={variant.accent} />
            <View className="flex-1 ml-3">
              {toast.title ? (
                <Text className="text-text font-sans-bold text-sm" numberOfLines={1}>
                  {toast.title}
                </Text>
              ) : null}
              {toast.message ? (
                <Text className="text-text-secondary text-xs mt-0.5" numberOfLines={2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </View>
          {toast.action ? (
            <Pressable
              onPress={handleActionPress}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
              className="flex-row items-center self-start mt-2 ml-9 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: variant.accent + '22', borderWidth: 1, borderColor: variant.accent + '55' }}
            >
              <Ionicons name={toast.action.icon || 'open-outline'} size={14} color={variant.accent} />
              <Text className="ml-1.5 text-xs font-sans-bold" style={{ color: variant.accent }}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ---- ToastHost: mount once at app root, renders stack of active toasts ----
export function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = subscribe((t) => {
      setToasts((prev) => [...prev, t]);
    });
    return unsub;
  }, []);

  const handleDismiss = (id) => {
    setToasts((prev) => prev.filter(t => t.id !== id));
  };

  if (toasts.length === 0) return null;

  // Top of screen, safe-area aware (approx — App uses SafeAreaView elsewhere)
  const topOffset = Platform.OS === 'ios' ? 56 : 32;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: topOffset,
        left: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </View>
  );
}

export default ToastHost;
