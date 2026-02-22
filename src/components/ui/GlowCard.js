/**
 * GlowCard — Premium card with subtle orange glow border
 * Modern 2026 design: dark glass with colored edge lighting
 */
import React from 'react';
import { View } from 'react-native';

export default function GlowCard({ children, className = '', accent = '#FF9F66', intensity = 'medium', style = {} }) {
  const shadowConfig = {
    low: { shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    medium: { shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
    high: { shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 },
  };

  const config = shadowConfig[intensity] || shadowConfig.medium;

  return (
    <View
      className={`bg-background-card rounded-2xl overflow-hidden ${className}`}
      style={[
        {
          shadowColor: accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: config.shadowOpacity,
          shadowRadius: config.shadowRadius,
          elevation: config.elevation,
        },
        style,
      ]}
    >
      {/* Top accent line */}
      <View
        style={{
          height: 2,
          backgroundColor: accent,
          opacity: 0.6,
        }}
      />
      {children}
    </View>
  );
}
