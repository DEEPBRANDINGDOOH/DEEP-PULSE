/**
 * HubIcon — Reusable hub icon/logo component
 *
 * Displays a hub's custom logo (if uploaded) or falls back to an Ionicons icon.
 * Used throughout the app wherever a hub avatar is shown.
 *
 * Usage:
 *   <HubIcon hub={hub} size={48} iconSize={24} />
 *   <HubIcon logoUrl={hub.logoUrl} icon={hub.icon} size={56} iconSize={28} />
 *
 * Props:
 *   hub      — Full hub object (reads hub.logoUrl and hub.icon)
 *   logoUrl  — Direct logo URL (overrides hub.logoUrl)
 *   icon     — Ionicons name fallback (overrides hub.icon)
 *   size     — Container diameter in dp (default: 48)
 *   iconSize — Ionicons size in dp (default: 24)
 *
 * Logo specs (for hub creators):
 *   Recommended: 200 x 200 px (square)
 *   Max size:    500 KB
 *   Formats:     PNG, JPG, WebP
 *   Display:     Circular crop
 */

import React, { useState } from 'react';
import { View, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function HubIcon({ hub, logoUrl, icon, size = 48, iconSize = 24 }) {
  const logo = logoUrl || hub?.logoUrl;
  const iconName = icon || hub?.icon || 'apps';
  const [imgError, setImgError] = useState(false);

  // Show logo image if URL exists and hasn't errored
  if (logo && !imgError) {
    return (
      <Image
        source={{ uri: logo }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255,159,102,0.1)',
        }}
        onError={() => setImgError(true)}
        resizeMode="cover"
      />
    );
  }

  // Fallback to Ionicons icon
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,159,102,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={iconName} size={iconSize} color="#FF9F66" />
    </View>
  );
}
