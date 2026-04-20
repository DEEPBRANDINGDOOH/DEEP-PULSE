/**
 * Haptics — tactile feedback for key interactions.
 *
 * Uses React Native's built-in Vibration API (no extra deps).
 * Short, subtle patterns — feels native on Android, graceful fallback on iOS.
 *
 * Usage:
 *   import { haptics } from '../utils/haptics';
 *   haptics.impact();   // generic button tap
 *   haptics.success();  // positive confirmation (subscribe, submit, approve)
 *   haptics.warning();  // caution (destructive action)
 *   haptics.select();   // tab change, filter change
 */
import { Vibration, Platform } from 'react-native';

// Skip on web/unsupported platforms
const isSupported = Platform.OS === 'android' || Platform.OS === 'ios';

// Short = 10ms subtle tap, Medium = 20ms, Long = 35ms
const DURATIONS = {
  select: 8,
  impact: 15,
  success: [0, 20, 40, 20], // double-tap pattern
  warning: [0, 30, 60, 30, 60, 30],
  error: [0, 50, 100, 50],
};

function safeVibrate(pattern) {
  if (!isSupported) return;
  try {
    Vibration.vibrate(pattern);
  } catch (_) {
    // Silent — haptics is non-critical
  }
}

export const haptics = {
  /** Very short, subtle — for selection changes, tab taps */
  select: () => safeVibrate(DURATIONS.select),
  /** Standard tap feedback — for buttons, links */
  impact: () => safeVibrate(DURATIONS.impact),
  /** Positive double-pulse — for subscribe, submit, approve */
  success: () => safeVibrate(DURATIONS.success),
  /** Triple-pulse caution — for destructive confirmations */
  warning: () => safeVibrate(DURATIONS.warning),
  /** Long pulse — for errors, rejections */
  error: () => safeVibrate(DURATIONS.error),
};

export default haptics;
