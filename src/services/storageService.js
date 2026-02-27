/**
 * Firebase Storage Service — Ad Creative & Hub Logo Upload
 *
 * Production-ready upload service for brand ad creatives and hub logos.
 * Handles image upload to Firebase Storage with:
 * - Automatic file naming (wallet + timestamp)
 * - Image validation (format, size)
 * - Upload progress tracking
 * - Download URL retrieval
 * - Error handling with user-friendly messages
 *
 * Storage structure:
 *   ad-creatives/{walletAddress}/{timestamp}_{slotType}.{ext}
 *   hub-logos/{walletAddress}/{hubId}.{ext}
 *
 * Security:
 * - Files are stored under the brand's wallet address
 * - Firebase Storage rules should restrict uploads to authenticated users
 * - Max file size enforced client-side (2MB for banners, 5MB for lockscreen, 500KB for logos)
 */

import storage from '@react-native-firebase/storage';
import { Alert } from 'react-native';
import { getWalletPublicKey } from './transactionHelper';
import { logger } from '../utils/security';

// Max file sizes in bytes
const MAX_SIZE_BANNER = 2 * 1024 * 1024;    // 2 MB for top/bottom ads
const MAX_SIZE_LOCKSCREEN = 5 * 1024 * 1024; // 5 MB for lockscreen ads
const MAX_SIZE_HUB_LOGO = 500 * 1024;       // 500 KB for hub logos

// Accepted MIME types
const ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

/**
 * Validate an image file before upload
 * @param {object} imageAsset - Image asset from react-native-image-picker
 * @param {string} slotType - 'top', 'bottom', or 'lockscreen'
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateImageFile(imageAsset, slotType) {
  const errors = [];

  if (!imageAsset || !imageAsset.uri) {
    errors.push('No image selected');
    return { valid: false, errors };
  }

  // Check MIME type
  if (imageAsset.type && !ACCEPTED_MIME_TYPES.includes(imageAsset.type)) {
    errors.push(`Unsupported format: ${imageAsset.type}. Use PNG, JPG, GIF, or WebP.`);
  }

  // Check file size
  const maxSize = slotType === 'lockscreen' ? MAX_SIZE_LOCKSCREEN : MAX_SIZE_BANNER;
  const maxSizeLabel = slotType === 'lockscreen' ? '5 MB' : '2 MB';

  if (imageAsset.fileSize && imageAsset.fileSize > maxSize) {
    const sizeMB = (imageAsset.fileSize / (1024 * 1024)).toFixed(1);
    errors.push(`File too large: ${sizeMB} MB. Maximum: ${maxSizeLabel}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Upload an ad creative image to Firebase Storage
 *
 * @param {object} imageAsset - Image from react-native-image-picker { uri, type, fileName, fileSize }
 * @param {string} slotType - 'top', 'bottom', or 'lockscreen'
 * @param {function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<{ success: boolean, url?: string, path?: string, error?: string }>}
 */
export async function uploadAdCreative(imageAsset, slotType, onProgress = null) {
  try {
    // Validate first
    const validation = validateImageFile(imageAsset, slotType);
    if (!validation.valid) {
      Alert.alert('Invalid Image', validation.errors.join('\n'));
      return { success: false, error: validation.errors.join(', ') };
    }

    // [H-08 FIX] Require wallet connection — no anonymous uploads
    const walletPubkey = getWalletPublicKey();
    if (!walletPubkey && !__DEV__) {
      Alert.alert('Wallet Required', 'Please connect your wallet before uploading ad creatives.');
      return { success: false, error: 'Wallet not connected' };
    }
    const walletStr = walletPubkey ? walletPubkey.toString() : 'dev_mock_wallet';

    // Generate unique filename
    const timestamp = Date.now();
    const ext = getExtension(imageAsset.fileName || imageAsset.uri);
    const fileName = `${timestamp}_${slotType}.${ext}`;
    const storagePath = `ad-creatives/${walletStr}/${fileName}`;

    // Create reference
    const ref = storage().ref(storagePath);

    // Start upload
    const task = ref.putFile(imageAsset.uri, {
      contentType: imageAsset.type || 'image/png',
      customMetadata: {
        slotType,
        wallet: walletStr,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Track progress
    if (onProgress) {
      task.on('state_changed', (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress(progress);
      });
    }

    // Wait for upload to complete
    await task;

    // Get download URL
    const downloadUrl = await ref.getDownloadURL();

    logger.log(`[StorageService] Upload complete: ${storagePath}`);
    logger.log(`[StorageService] Download URL: ${downloadUrl}`);

    return {
      success: true,
      url: downloadUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error('[StorageService] Upload failed:', error);

    let userMessage = 'Failed to upload image. Please try again.';

    if (error.code === 'storage/unauthorized') {
      userMessage = 'Upload not authorized. Please connect your wallet.';
    } else if (error.code === 'storage/canceled') {
      userMessage = 'Upload was cancelled.';
    } else if (error.code === 'storage/retry-limit-exceeded') {
      userMessage = 'Upload timed out. Check your internet connection.';
    } else if (error.code === 'storage/quota-exceeded') {
      userMessage = 'Storage quota exceeded. Please contact support.';
    }

    Alert.alert('Upload Failed', userMessage);
    return { success: false, error: userMessage };
  }
}

/**
 * Delete an ad creative from Firebase Storage
 * @param {string} storagePath - The path in Firebase Storage
 * @returns {Promise<boolean>}
 */
export async function deleteAdCreative(storagePath) {
  try {
    if (!storagePath) return false;
    await storage().ref(storagePath).delete();
    logger.log(`[StorageService] Deleted: ${storagePath}`);
    return true;
  } catch (error) {
    console.error('[StorageService] Delete failed:', error);
    return false;
  }
}

// =====================================================
//  HUB LOGO UPLOAD
// =====================================================

// Accepted MIME types for hub logos (no GIF — logos should be static)
const LOGO_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

/**
 * Validate a hub logo image before upload
 *
 * Specs: 200x200px recommended, max 500KB, PNG/JPG/WebP only
 *
 * @param {object} imageAsset - Image asset from react-native-image-picker
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateHubLogo(imageAsset) {
  const errors = [];

  if (!imageAsset || !imageAsset.uri) {
    errors.push('No image selected');
    return { valid: false, errors };
  }

  // Check MIME type (no GIF for logos)
  if (imageAsset.type && !LOGO_MIME_TYPES.includes(imageAsset.type)) {
    errors.push(`Unsupported format: ${imageAsset.type}. Use PNG, JPG, or WebP.`);
  }

  // Check file size (500 KB max)
  if (imageAsset.fileSize && imageAsset.fileSize > MAX_SIZE_HUB_LOGO) {
    const sizeKB = Math.round(imageAsset.fileSize / 1024);
    errors.push(`File too large: ${sizeKB} KB. Maximum: 500 KB`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Upload a hub logo to Firebase Storage
 *
 * Stores under hub-logos/{walletAddress}/{hubId}.{ext}
 * Recommended: 200x200px square image for circular crop display.
 *
 * @param {object} imageAsset - Image from react-native-image-picker { uri, type, fileName, fileSize }
 * @param {string} hubId - Unique hub identifier
 * @param {function} onProgress - Callback for upload progress (0-100)
 * @returns {Promise<{ success: boolean, url?: string, path?: string, error?: string }>}
 */
export async function uploadHubLogo(imageAsset, hubId, onProgress = null) {
  try {
    // Validate first
    const validation = validateHubLogo(imageAsset);
    if (!validation.valid) {
      Alert.alert('Invalid Logo', validation.errors.join('\n'));
      return { success: false, error: validation.errors.join(', ') };
    }

    // Require wallet connection
    const walletPubkey = getWalletPublicKey();
    if (!walletPubkey) {
      Alert.alert('Wallet Required', 'Please connect your wallet before uploading a hub logo.');
      return { success: false, error: 'Wallet not connected' };
    }
    const walletStr = walletPubkey.toString();

    // Generate filename (overwrite previous logo for same hub)
    const ext = getExtension(imageAsset.fileName || imageAsset.uri);
    const fileName = `${hubId}.${ext}`;
    const storagePath = `hub-logos/${walletStr}/${fileName}`;

    // Create reference
    const ref = storage().ref(storagePath);

    // Start upload
    const task = ref.putFile(imageAsset.uri, {
      contentType: imageAsset.type || 'image/png',
      customMetadata: {
        hubId,
        wallet: walletStr,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Track progress
    if (onProgress) {
      task.on('state_changed', (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress(progress);
      });
    }

    // Wait for upload to complete
    await task;

    // Get download URL
    const downloadUrl = await ref.getDownloadURL();

    logger.log(`[StorageService] Hub logo upload complete: ${storagePath}`);

    return {
      success: true,
      url: downloadUrl,
      path: storagePath,
    };
  } catch (error) {
    console.error('[StorageService] Hub logo upload failed:', error);

    let userMessage = 'Failed to upload logo. Please try again.';
    if (error.code === 'storage/unauthorized') {
      userMessage = 'Upload not authorized. Please connect your wallet.';
    } else if (error.code === 'storage/retry-limit-exceeded') {
      userMessage = 'Upload timed out. Check your internet connection.';
    }

    Alert.alert('Upload Failed', userMessage);
    return { success: false, error: userMessage };
  }
}

/**
 * Get file extension from filename or URI
 */
function getExtension(fileNameOrUri) {
  if (!fileNameOrUri) return 'png';
  const parts = fileNameOrUri.split('.');
  const ext = parts[parts.length - 1].toLowerCase().split('?')[0];
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return ext;
  return 'png';
}
