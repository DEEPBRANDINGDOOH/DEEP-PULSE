/**
 * Firebase Storage Service — Ad Creative Upload
 *
 * Production-ready upload service for brand ad creatives.
 * Handles image upload to Firebase Storage with:
 * - Automatic file naming (wallet + timestamp)
 * - Image validation (format, size)
 * - Upload progress tracking
 * - Download URL retrieval
 * - Error handling with user-friendly messages
 *
 * Storage structure:
 *   ad-creatives/{walletAddress}/{timestamp}_{slotType}.{ext}
 *
 * Security:
 * - Files are stored under the brand's wallet address
 * - Firebase Storage rules should restrict uploads to authenticated users
 * - Max file size enforced client-side (2MB for banners, 5MB for lockscreen)
 */

import storage from '@react-native-firebase/storage';
import { Alert } from 'react-native';
import { getWalletPublicKey } from './transactionHelper';

// Max file sizes in bytes
const MAX_SIZE_BANNER = 2 * 1024 * 1024;    // 2 MB for top/bottom ads
const MAX_SIZE_LOCKSCREEN = 5 * 1024 * 1024; // 5 MB for lockscreen ads

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

    // Get wallet address for storage path
    const walletPubkey = getWalletPublicKey();
    const walletStr = walletPubkey ? walletPubkey.toString() : 'anonymous';

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

    console.log(`[StorageService] Upload complete: ${storagePath}`);
    console.log(`[StorageService] Download URL: ${downloadUrl}`);

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
    console.log(`[StorageService] Deleted: ${storagePath}`);
    return true;
  } catch (error) {
    console.error('[StorageService] Delete failed:', error);
    return false;
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
