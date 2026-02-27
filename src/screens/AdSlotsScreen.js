/**
 * Ad Slots Screen
 *
 * Allows brands to purchase ad slots on their hubs
 * - Top Ad Slot: 800 $SKR/week (8 max, rotates every 15s)
 * - Bottom Ad Slot: 600 $SKR/week (8 max, rotates every 15s)
 * - Lockscreen Ad: 1,000 $SKR/week (4 max, full-screen Swipe-to-Earn)
 * - Rich Notification Ads: 1,500 $SKR/week (SPONSORED push, 1/day)
 *
 * Features:
 * - View available slots
 * - Purchase slots with $SKR (submitted for admin review)
 * - Upload ad creative from gallery/camera (Firebase Storage)
 * - OR paste hosted image URL (for brands with their own CDN)
 * - Image preview before submission
 * - Edit creative in active campaign (re-submits for review)
 * - View rotation schedule
 * - Analytics dashboard
 */

import React, { useState } from 'react';
import { purchaseAdSlot as purchaseAdSlotTx } from '../services/transactionHelper';
import { programService } from '../services/programService';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../store/appStore';
import { PRICING } from '../config/constants';
import { launchImageLibrary } from 'react-native-image-picker';
import { uploadAdCreative, validateImageFile } from '../services/storageService';
import { safeOpenURL, MAX_LENGTHS } from '../utils/security';

// Ad Slot Configuration — base specs (prices are overridden dynamically inside component)
const AD_CONFIG_BASE = {
  TOP_SLOT: {
    maxSlots: 8,
    rotationInterval: 15,
    width: 390,
    height: 120,
    position: 'top',
    name: 'Top Ad Slot',
    description: 'Premium placement above content feed',
    avgViews: 3125,
    acceptedFormats: 'PNG, JPG, GIF (animated supported)',
    recommendedSize: '390 x 120 px',
    maxFileSize: '2 MB',
  },
  BOTTOM_SLOT: {
    maxSlots: 8,
    rotationInterval: 15,
    width: 390,
    height: 100,
    position: 'bottom',
    name: 'Bottom Ad Slot',
    description: 'Standard placement below content feed',
    avgViews: 2500,
    acceptedFormats: 'PNG, JPG, GIF (animated supported)',
    recommendedSize: '390 x 100 px',
    maxFileSize: '2 MB',
  },
  LOCKSCREEN_SLOT: {
    maxSlots: 4,
    rotationInterval: 0,
    width: 1080,
    height: 1920,
    position: 'lockscreen',
    name: 'Lockscreen Ad',
    description: 'Premium full-screen overlay on lock screen (Swipe-to-Earn)',
    avgViews: 8500,
    acceptedFormats: 'PNG, JPG, HTML5 (interactive supported)',
    recommendedSize: '1080 x 1920 px (full screen)',
    maxFileSize: '5 MB',
  },
};

// Accepted image extensions
const ACCEPTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const REJECTED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.svg', '.bmp', '.tiff'];

/**
 * Validate ad creative URL
 * Returns { valid: boolean, errors: string[] }
 */
function validateAdCreative(imageUrl, landingUrl, slotType) {
  const errors = [];

  // Image URL checks
  if (!imageUrl || !imageUrl.trim()) {
    errors.push('Image URL is required');
  } else {
    // Must be https
    if (!imageUrl.startsWith('https://')) {
      errors.push('Image URL must start with https:// for security');
    }

    // Check file extension
    const urlLower = imageUrl.toLowerCase().split('?')[0]; // remove query params
    const hasAcceptedExt = ACCEPTED_EXTENSIONS.some(ext => urlLower.endsWith(ext));
    const hasRejectedExt = REJECTED_EXTENSIONS.some(ext => urlLower.endsWith(ext));

    if (hasRejectedExt) {
      errors.push('Video files are not supported. Use PNG, JPG, or GIF only');
    } else if (!hasAcceptedExt) {
      errors.push('Invalid file format. Accepted: PNG, JPG, GIF only. Make sure your URL ends with a valid image extension');
    }
  }

  // Landing URL checks
  if (!landingUrl || !landingUrl.trim()) {
    errors.push('Landing page URL is required');
  } else {
    if (!landingUrl.startsWith('https://')) {
      errors.push('Landing URL must start with https:// for security');
    }
  }

  const config = slotType === 'top' ? AD_CONFIG_BASE.TOP_SLOT : slotType === 'lockscreen' ? AD_CONFIG_BASE.LOCKSCREEN_SLOT : AD_CONFIG_BASE.BOTTOM_SLOT;

  return {
    valid: errors.length === 0,
    errors,
    specs: {
      dimensions: `${config.width} x ${config.height} px`,
      formats: config.acceptedFormats,
      maxSize: config.maxFileSize,
    },
  };
}

// Mock active ads for current user
const MOCK_MY_ADS = [
  {
    id: 'my_ad_1',
    slotType: 'top',
    imageUrl: 'https://cdn.example.com/ads/jupiter-swap-390x120.png',
    landingUrl: 'https://jup.ag',
    status: 'APPROVED', // APPROVED, PENDING_REVIEW, REJECTED
    remainingDays: 18,
    totalWeeks: 4,
    impressions: 12540,
    clicks: 342,
  },
  {
    id: 'my_ad_2',
    slotType: 'bottom',
    imageUrl: 'https://cdn.example.com/ads/nft-drop-390x100.gif',
    landingUrl: 'https://magiceden.io/drops',
    status: 'PENDING_REVIEW',
    remainingDays: 7,
    totalWeeks: 1,
    impressions: 0,
    clicks: 0,
  },
];

export default function AdSlotsScreen({ route, navigation }) {
  const { hubId, slotType, hubName: routeHubName } = route.params || {};
  const { wallet, platformPricing } = useAppStore();
  const storeHubs = useAppStore((state) => state.hubs);
  const addPendingAdCreative = useAppStore((state) => state.addPendingAdCreative);
  const storePendingAds = useAppStore((state) => state.pendingAdCreatives);
  const storeApprovedAds = useAppStore((state) => state.approvedAds);
  // Resolve hub name from route params or store lookup
  const hubName = routeHubName || storeHubs.find(h => h.id === hubId)?.name || 'Hub';

  // Use dynamic prices from store (admin can update via Pricing Management)
  const dynamicPrices = {
    top: platformPricing?.topAdSlot || PRICING.TOP_AD_SLOT,
    bottom: platformPricing?.bottomAdSlot || PRICING.BOTTOM_AD_SLOT,
    lockscreen: platformPricing?.lockscreenAd || PRICING.LOCKSCREEN_AD,
  };

  // Merge base config with dynamic prices
  const AD_CONFIG = {
    TOP_SLOT: { ...AD_CONFIG_BASE.TOP_SLOT, price: dynamicPrices.top },
    BOTTOM_SLOT: { ...AD_CONFIG_BASE.BOTTOM_SLOT, price: dynamicPrices.bottom },
    LOCKSCREEN_SLOT: { ...AD_CONFIG_BASE.LOCKSCREEN_SLOT, price: dynamicPrices.lockscreen },
  };

  // Dynamic header based on slotType
  const headerTitle = {
    top: 'Top Ad Slot',
    bottom: 'Bottom Ad Slot',
    lockscreen: 'Lockscreen Ad',
    rich_notif: 'Rich Notification Ad',
    my_ads: 'My Active Ads',
  }[slotType] || 'Ad Slots';

  const headerSubtitle = {
    top: 'Premium placement above content feed',
    bottom: 'Standard placement below content feed',
    lockscreen: 'Full-screen premium overlay (Swipe-to-Earn)',
    rich_notif: 'Branded push notification to all hub subscribers',
    my_ads: 'Manage your active ad campaigns',
  }[slotType] || 'Advertise on your hub with rotating ad slots';

  // Helpers to check if a section should be visible
  const showSection = (section) => !slotType || slotType === section;
  const showMyAds = !slotType || slotType === 'my_ads';
  const showInfoBanner = !slotType;
  const showVolumeDiscounts = !slotType;

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  // Purchase form state
  const [imageUrl, setImageUrl] = useState('');
  const [imageAsset, setImageAsset] = useState(null); // Selected image from picker
  const [imageMode, setImageMode] = useState('upload'); // 'upload' or 'url'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [landingUrl, setLandingUrl] = useState('');
  const [duration, setDuration] = useState(1);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Edit form state
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editImageAsset, setEditImageAsset] = useState(null);
  const [editImageMode, setEditImageMode] = useState('upload');
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const [editIsUploading, setEditIsUploading] = useState(false);
  const [editLandingUrl, setEditLandingUrl] = useState('');
  const [editValidationErrors, setEditValidationErrors] = useState([]);

  // BUG #15 FIX: Derive myAds from store + keep MOCK_MY_ADS as base
  const storeMyAds = React.useMemo(() => {
    const fromStore = [...storePendingAds, ...storeApprovedAds]
      .filter(a => a.brandWallet === 'Your Wallet' || a.brandName === 'You' || a.brandName?.endsWith('...'))
      .map(a => ({
        id: a.id,
        slotType: a.slotType,
        imageUrl: a.imageUrl,
        landingUrl: a.landingUrl,
        status: a.status === 'PENDING' ? 'PENDING_REVIEW' : a.status,
        remainingDays: (a.duration || 1) * 7,
        totalWeeks: a.duration || 1,
        impressions: 0,
        clicks: 0,
        richTitle: a.richTitle,
        richBody: a.richBody,
      }));
    return [...fromStore, ...MOCK_MY_ADS];
  }, [storePendingAds, storeApprovedAds]);
  const [myAds, setMyAds] = useState(storeMyAds);

  // Re-sync myAds when store changes
  React.useEffect(() => {
    setMyAds(storeMyAds);
  }, [storeMyAds]);

  // Rich Notification campaign state
  const [showRichNotifModal, setShowRichNotifModal] = useState(false);
  const [richTitle, setRichTitle] = useState('');
  const [richBody, setRichBody] = useState('');
  const [richCtaLabel, setRichCtaLabel] = useState('');
  const [richCtaUrl, setRichCtaUrl] = useState('');
  const [richImageUrl, setRichImageUrl] = useState('');
  const [isSubmittingRich, setIsSubmittingRich] = useState(false);

  // Mock data
  const [topSlots, setTopSlots] = useState([
    { id: 1, advertiser: '7xK...9Qz', active: true, remaining: 3 },
    { id: 2, advertiser: '2pQ...mNp', active: true, remaining: 5 },
    { id: 3, advertiser: 'Available', active: false },
    { id: 4, advertiser: 'Available', active: false },
    { id: 5, advertiser: 'Available', active: false },
    { id: 6, advertiser: 'Available', active: false },
    { id: 7, advertiser: 'Available', active: false },
    { id: 8, advertiser: 'Available', active: false },
  ]);

  const [bottomSlots, setBottomSlots] = useState([
    { id: 1, advertiser: '5jK...7Km', active: true, remaining: 2 },
    { id: 2, advertiser: 'Available', active: false },
    { id: 3, advertiser: 'Available', active: false },
    { id: 4, advertiser: 'Available', active: false },
    { id: 5, advertiser: 'Available', active: false },
    { id: 6, advertiser: 'Available', active: false },
    { id: 7, advertiser: 'Available', active: false },
    { id: 8, advertiser: 'Available', active: false },
  ]);

  const [lockscreenSlots, setLockscreenSlots] = useState([
    { id: 1, advertiser: 'Available', active: false },
    { id: 2, advertiser: 'Available', active: false },
    { id: 3, advertiser: 'Available', active: false },
    { id: 4, advertiser: 'Available', active: false },
  ]);

  const handlePurchaseSlot = (slotType) => {
    if (!__DEV__ && !wallet.connected) {
      Alert.alert('Connect Wallet', 'Please connect your wallet to purchase ad slots');
      return;
    }
    setSelectedSlot(slotType);
    setImageUrl('');
    setImageAsset(null);
    setImageMode('upload');
    setUploadProgress(0);
    setIsUploading(false);
    setLandingUrl('');
    setDuration(1);
    setValidationErrors([]);
    setShowPurchaseModal(true);
  };

  /**
   * Launch image picker for ad creative selection
   */
  const handlePickImage = (forEdit = false) => {
    const slotType = forEdit ? editingAd?.slotType : selectedSlot;
    const config = slotType === 'top' ? AD_CONFIG.TOP_SLOT : slotType === 'lockscreen' ? AD_CONFIG.LOCKSCREEN_SLOT : AD_CONFIG.BOTTOM_SLOT;

    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.9,
        maxWidth: config.width * 2,   // Allow 2x for retina
        maxHeight: config.height * 2,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', response.errorMessage || 'Failed to pick image');
          return;
        }

        const asset = response.assets?.[0];
        if (!asset) return;

        // Validate immediately
        const validation = validateImageFile(asset, slotType);
        if (!validation.valid) {
          Alert.alert('Invalid Image', validation.errors.join('\n'));
          return;
        }

        if (forEdit) {
          setEditImageAsset(asset);
          setEditImageUrl(''); // Clear URL since we're using upload
          setEditValidationErrors([]);
        } else {
          setImageAsset(asset);
          setImageUrl(''); // Clear URL since we're using upload
          setValidationErrors([]);
        }
      }
    );
  };

  const handleConfirmPurchase = async () => {
    const errors = [];

    // Validate image — either uploaded file or URL required
    if (imageMode === 'upload') {
      if (!imageAsset) {
        errors.push('Please select an image for your ad creative');
      }
    } else {
      // URL mode — run URL validation
      const validation = validateAdCreative(imageUrl, landingUrl, selectedSlot);
      if (!validation.valid) {
        // Only take image-related errors if in URL mode
        validation.errors.forEach(e => {
          if (!e.includes('Landing')) errors.push(e);
        });
      }
    }

    // Validate landing URL (required in both modes)
    if (!landingUrl || !landingUrl.trim()) {
      errors.push('Landing page URL is required');
    } else if (!landingUrl.startsWith('https://')) {
      errors.push('Landing URL must start with https:// for security');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);
    setIsPurchasing(true);

    const config = selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT : selectedSlot === 'lockscreen' ? AD_CONFIG.LOCKSCREEN_SLOT : AD_CONFIG.BOTTOM_SLOT;
    const totalCost = config.price * duration * (1 - calculateDiscount(duration));

    Alert.alert(
      'Confirm Purchase',
      `Purchase ${config.name}?\n\nCost: ${totalCost.toLocaleString()} $SKR (${duration} week${duration > 1 ? 's' : ''})\n\nYour ad will be submitted for admin review before going live.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setIsPurchasing(false) },
        {
          text: 'Purchase & Submit',
          onPress: async () => {
            try {
              let finalImageUrl = imageUrl.trim();

              // Upload image to Firebase Storage if using upload mode
              if (imageMode === 'upload' && imageAsset) {
                setIsUploading(true);
                setUploadProgress(0);
                const uploadResult = await uploadAdCreative(
                  imageAsset,
                  selectedSlot,
                  (progress) => setUploadProgress(progress)
                );
                setIsUploading(false);

                if (!uploadResult.success) {
                  setIsPurchasing(false);
                  return;
                }
                finalImageUrl = uploadResult.url;
              }

              // Attempt real on-chain ad purchase if hubId is available (skip in dev mode)
              if (hubId && !__DEV__) {
                const slotIndex = Date.now() % 100000;
                // Hash URLs properly for on-chain storage
                const imageUrlHash = finalImageUrl
                  ? await programService.hashContent(finalImageUrl)
                  : Array.from(new Uint8Array(32));
                const landingUrlHash = landingUrl
                  ? await programService.hashContent(landingUrl)
                  : Array.from(new Uint8Array(32));
                const result = await purchaseAdSlotTx(
                  hubId,
                  selectedSlot,
                  slotIndex,
                  imageUrlHash,
                  landingUrlHash,
                  duration
                );
                if (!result.success) {
                  setIsPurchasing(false);
                  return; // Error already shown by transactionHelper
                }
              }

              Alert.alert(
                'Ad Submitted for Review',
                `Your ${config.name} has been purchased and submitted for admin approval.\n\n` +
                `Status: Pending Review\n` +
                `Duration: ${duration} week${duration > 1 ? 's' : ''}\n` +
                `Cost: ${totalCost.toLocaleString()} $SKR\n\n` +
                `Your ad will go live once approved by the platform admin. ` +
                `You will be notified when it's approved or if changes are needed.`,
                [{ text: 'OK', onPress: () => setShowPurchaseModal(false) }]
              );

              // Add to my ads list (local UI)
              const adId = `my_ad_${Date.now()}`;
              setMyAds(prev => [...prev, {
                id: adId,
                slotType: selectedSlot,
                imageUrl: finalImageUrl,
                landingUrl: landingUrl.trim(),
                status: 'PENDING_REVIEW',
                remainingDays: duration * 7,
                totalWeeks: duration,
                impressions: 0,
                clicks: 0,
              }]);

              // Wire to Zustand store → Admin sees this in Ad Moderation
              addPendingAdCreative({
                id: `ad_review_${Date.now()}`,
                brandName: wallet.publicKey
                  ? wallet.publicKey.toString().slice(0, 7) + '...'
                  : 'You',
                brandWallet: wallet.publicKey
                  ? wallet.publicKey.toString().slice(0, 3) + '...' + wallet.publicKey.toString().slice(-3)
                  : 'Your Wallet',
                hubName: hubName,
                slotType: selectedSlot,
                imageUrl: finalImageUrl,
                landingUrl: landingUrl.trim(),
                duration: duration,
                totalCost: totalCost,
                status: 'PENDING',
                submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
              });

              // Update slot occupancy in UI
              const updateSlot = (slots) => {
                const firstAvailable = slots.findIndex(s => !s.active);
                if (firstAvailable !== -1) {
                  const updated = [...slots];
                  updated[firstAvailable] = { ...updated[firstAvailable], advertiser: 'You (pending)', active: true, remaining: duration * 7 };
                  return updated;
                }
                return slots;
              };
              if (selectedSlot === 'top') setTopSlots(prev => updateSlot(prev));
              else if (selectedSlot === 'bottom') setBottomSlots(prev => updateSlot(prev));
              else if (selectedSlot === 'lockscreen') setLockscreenSlots(prev => updateSlot(prev));

              setImageUrl('');
              setImageAsset(null);
              setLandingUrl('');
              setDuration(1);
            } catch (error) {
              Alert.alert('Error', 'Failed to purchase ad slot. Please try again.');
            } finally {
              setIsPurchasing(false);
              setIsUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleEditCreative = (ad) => {
    setEditingAd(ad);
    setEditImageUrl(ad.imageUrl);
    setEditImageAsset(null);
    setEditImageMode(ad.imageUrl.startsWith('https://') ? 'url' : 'upload');
    setEditUploadProgress(0);
    setEditIsUploading(false);
    setEditLandingUrl(ad.landingUrl);
    setEditValidationErrors([]);
    setShowEditModal(true);
  };

  const handleSubmitEdit = async () => {
    const errors = [];

    if (editImageMode === 'upload' && !editImageAsset && !editImageUrl) {
      errors.push('Please select a new image or keep the current URL');
    } else if (editImageMode === 'url') {
      if (!editImageUrl || !editImageUrl.trim()) {
        errors.push('Image URL is required');
      } else if (!editImageUrl.startsWith('https://')) {
        errors.push('Image URL must start with https://');
      }
    }

    if (!editLandingUrl || !editLandingUrl.trim()) {
      errors.push('Landing page URL is required');
    } else if (!editLandingUrl.startsWith('https://')) {
      errors.push('Landing URL must start with https://');
    }

    if (errors.length > 0) {
      setEditValidationErrors(errors);
      return;
    }
    setEditValidationErrors([]);

    Alert.alert(
      'Resubmit for Review',
      'Your updated creative will be submitted for admin review.\n\nYour current ad continues to run until the new version is approved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Update',
          onPress: async () => {
            let finalImageUrl = editImageUrl.trim();

            // Upload new image if selected
            if (editImageMode === 'upload' && editImageAsset) {
              setEditIsUploading(true);
              setEditUploadProgress(0);
              const uploadResult = await uploadAdCreative(
                editImageAsset,
                editingAd.slotType,
                (progress) => setEditUploadProgress(progress)
              );
              setEditIsUploading(false);

              if (!uploadResult.success) return;
              finalImageUrl = uploadResult.url;
            }

            setMyAds(prev => prev.map(a =>
              a.id === editingAd.id
                ? { ...a, imageUrl: finalImageUrl, landingUrl: editLandingUrl.trim(), status: 'PENDING_REVIEW' }
                : a
            ));
            setShowEditModal(false);
            Alert.alert(
              'Creative Updated',
              'Your updated ad has been resubmitted for admin review. Your current ad continues to run until the new one is approved.'
            );
          },
        },
      ]
    );
  };

  const calculateDiscount = (weeks) => {
    if (weeks >= 52) return 0.40;
    if (weeks >= 26) return 0.30;
    if (weeks >= 12) return 0.20;
    if (weeks >= 4) return 0.10;
    return 0;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return '#4CAF50';
      case 'PENDING_REVIEW': return '#FF9F66';
      case 'REJECTED': return '#f44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'APPROVED': return 'Live';
      case 'PENDING_REVIEW': return 'Pending Review';
      case 'REJECTED': return 'Rejected';
      default: return status;
    }
  };

  // Validation error display component
  const ValidationErrors = ({ errors }) => {
    if (!errors || errors.length === 0) return null;
    return (
      <View className="bg-error/10 rounded-xl p-4 mt-3 border border-error/30">
        <View className="flex-row items-center mb-2">
          <Ionicons name="alert-circle" size={18} color="#f44336" />
          <Text className="text-error font-bold text-sm ml-2">Validation Errors</Text>
        </View>
        {errors.map((error, index) => (
          <View key={index} className="flex-row items-start mt-1">
            <Text className="text-error text-xs mr-2">-</Text>
            <Text className="text-error text-xs flex-1">{error}</Text>
          </View>
        ))}
      </View>
    );
  };

  const SlotCard = ({ config, slots, type }) => {
    const activeSlots = slots.filter(s => s.active).length;
    const availableSlots = config.maxSlots - activeSlots;

    return (
      <View className="bg-background-card rounded-2xl p-5 mb-4 border border-border">
        <View className="flex-row justify-between items-start mb-4">
          <View className="flex-row items-center flex-1">
            <View className="w-14 h-14 rounded-xl bg-primary/10 items-center justify-center mr-4">
              <Ionicons name="megaphone" size={28} color="#FF9F66" />
            </View>
            <View className="flex-1">
              <Text className="text-text font-bold text-lg mb-1">{config.name}</Text>
              <Text className="text-text-secondary text-xs">{config.description}</Text>
            </View>
          </View>
          <View className="bg-primary/20 px-3 py-1 rounded-lg">
            <Text className="text-primary font-bold text-sm">
              {config.price.toLocaleString()} $SKR/week
            </Text>
          </View>
        </View>

        {/* Slot Info */}
        <View className="bg-background-secondary rounded-xl p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Rotation Interval</Text>
            <Text className="text-text font-semibold text-sm">{config.rotationInterval}s</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Max Advertisers</Text>
            <Text className="text-text font-semibold text-sm">{config.maxSlots} slots</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Current Status</Text>
            <Text className="text-text font-semibold text-sm">
              {activeSlots}/{config.maxSlots} occupied
            </Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Avg Views/Week</Text>
            <Text className="text-text font-semibold text-sm">~{config.avgViews.toLocaleString()}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary text-sm">Image Size</Text>
            <Text className="text-primary font-semibold text-sm">{config.recommendedSize}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-text-secondary text-sm">Formats</Text>
            <Text className="text-text font-semibold text-sm">{config.acceptedFormats}</Text>
          </View>
        </View>

        {/* Rotation Schedule */}
        <View className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/20">
          <Text className="text-primary font-bold text-sm mb-3">
            <Ionicons name="sync" size={16} /> Rotation Schedule
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {slots.slice(0, config.maxSlots).map((slot, index) => (
              <View
                key={slot.id}
                className={`px-3 py-2 rounded-lg ${
                  slot.active
                    ? 'bg-success/20 border border-success/30'
                    : 'bg-background-secondary border border-border'
                }`}
              >
                <Text className={`text-xs font-semibold ${
                  slot.active ? 'text-success' : 'text-text-secondary'
                }`}>
                  Slot {index + 1}: {slot.active ? slot.advertiser : 'Empty'}
                </Text>
              </View>
            ))}
          </View>
          <Text className="text-text-secondary text-xs mt-3 text-center">
            Ads rotate every {config.rotationInterval} seconds across {config.maxSlots} slots
          </Text>
        </View>

        {/* Availability */}
        {availableSlots > 0 ? (
          <View className="bg-success/10 rounded-xl p-3 mb-4">
            <Text className="text-success font-semibold text-center text-sm">
              <Ionicons name="checkmark-circle" size={16} /> {availableSlots} slot{availableSlots > 1 ? 's' : ''} available
            </Text>
          </View>
        ) : (
          <View className="bg-error/10 rounded-xl p-3 mb-4">
            <Text className="text-error font-semibold text-center text-sm">
              <Ionicons name="close-circle" size={16} /> All slots occupied - Join waitlist
            </Text>
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          onPress={() => handlePurchaseSlot(type)}
          disabled={availableSlots === 0}
          className={`rounded-xl p-4 ${
            availableSlots > 0 ? 'bg-primary' : 'bg-background-secondary'
          }`}
        >
          <Text className={`font-bold text-center ${
            availableSlots > 0 ? 'text-white' : 'text-text-secondary'
          }`}>
            <Ionicons name="cart" size={18} /> {
              availableSlots > 0 ? 'Purchase Slot' : 'Waitlist Only'
            }
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="p-6 pb-4">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-text font-black text-3xl mb-2">{headerTitle}</Text>
          <Text className="text-text-secondary text-base">
            {headerSubtitle}
          </Text>
        </View>

        {/* My Active Ads — show if wallet connected (or dev mode) and has ads */}
        {showMyAds && (__DEV__ || wallet.connected) && myAds.length > 0 && (
          <View className="px-6 mb-6">
            <View className="flex-row items-center mb-3">
              <Ionicons name="image" size={20} color="#FF9F66" />
              <Text className="text-text font-bold text-lg ml-2">My Active Ads</Text>
            </View>
            {myAds.map((ad) => (
              <View key={ad.id} className="bg-background-card rounded-2xl p-4 mb-3 border border-border">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-lg bg-primary/10 items-center justify-center mr-3">
                      <Ionicons
                        name={ad.slotType === 'top' ? 'arrow-up-circle' : ad.slotType === 'lockscreen' ? 'phone-portrait' : 'arrow-down-circle'}
                        size={22}
                        color="#FF9F66"
                      />
                    </View>
                    <View>
                      <Text className="text-text font-bold text-sm">
                        {ad.slotType === 'top' ? 'Top' : ad.slotType === 'lockscreen' ? 'Lockscreen' : 'Bottom'} Slot
                      </Text>
                      <Text className="text-text-secondary text-xs">
                        {ad.remainingDays} days remaining
                      </Text>
                    </View>
                  </View>
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: `${getStatusColor(ad.status)}20` }}
                  >
                    <Text
                      className="text-xs font-bold"
                      style={{ color: getStatusColor(ad.status) }}
                    >
                      {getStatusLabel(ad.status)}
                    </Text>
                  </View>
                </View>

                {/* Stats row */}
                <View className="flex-row mb-3">
                  <View className="flex-1 bg-background-secondary rounded-lg p-2 mr-2 items-center">
                    <Text className="text-text font-bold text-sm">{ad.impressions.toLocaleString()}</Text>
                    <Text className="text-text-secondary text-xs">Impressions</Text>
                  </View>
                  <View className="flex-1 bg-background-secondary rounded-lg p-2 ml-2 items-center">
                    <Text className="text-text font-bold text-sm">{ad.clicks.toLocaleString()}</Text>
                    <Text className="text-text-secondary text-xs">Clicks</Text>
                  </View>
                </View>

                {/* URL preview */}
                <View className="bg-background-secondary rounded-lg p-2 mb-3">
                  <Text className="text-text-secondary text-xs" numberOfLines={1}>
                    <Ionicons name="image" size={10} color="#666" /> {ad.imageUrl}
                  </Text>
                  <Text className="text-text-secondary text-xs mt-1" numberOfLines={1}>
                    <Ionicons name="link" size={10} color="#666" /> {ad.landingUrl}
                  </Text>
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                  onPress={() => handleEditCreative(ad)}
                  className="bg-primary/15 rounded-xl py-3 border border-primary/25"
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name="create" size={16} color="#FF9F66" />
                    <Text className="text-primary font-bold text-sm ml-2">
                      Edit Creative
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Info Banner */}
        {showInfoBanner && (
          <View className="mx-6 mb-6 bg-primary/10 rounded-2xl p-4 border border-primary/30">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#FF9F66" />
              <View className="flex-1 ml-3">
                <Text className="text-primary font-bold mb-1">How Ad Rotation Works</Text>
                <Text className="text-text-secondary text-sm leading-5">
                  Each slot rotates every 15 seconds among up to 8 advertisers. Your ad gets equal exposure with automatic rotation. All ads are reviewed by the admin before going live.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Rich Notification Ads — RECOMMENDED */}
        {showSection('rich_notif') && (
        <View className="px-6 mb-4">
          <View className="bg-background-card rounded-2xl p-5 border border-border">
            {/* Header with badge */}
            <View className="flex-row justify-between items-start mb-4">
              <View className="flex-row items-center flex-1">
                <View className="w-14 h-14 rounded-xl bg-success/10 items-center justify-center mr-4">
                  <Ionicons name="notifications" size={28} color="#4CAF50" />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-text font-bold text-lg mb-1">Push Notification Ad</Text>
                    <View className="bg-yellow-500/20 rounded-full px-2 py-0.5 ml-2">
                      <Text className="text-yellow-400 text-xs font-bold">SPONSORED</Text>
                    </View>
                  </View>
                  <Text className="text-text-secondary text-xs">
                    Send a branded push notification to all hub subscribers
                  </Text>
                </View>
              </View>
              <View className="bg-success/20 px-3 py-1 rounded-lg">
                <Text className="text-success font-bold text-sm">{PRICING.PUSH_NOTIFICATION_AD.toLocaleString()} $SKR/week</Text>
              </View>
            </View>

            {/* Notification Preview Mockup */}
            <View className="bg-background-secondary rounded-xl p-4 mb-4 border border-border">
              <Text className="text-text-secondary text-xs font-semibold mb-3 uppercase">Preview</Text>
              <View className="bg-[#1a1a20] rounded-xl p-4 border border-[#2a2a30]">
                <View className="flex-row items-start">
                  <View className="w-10 h-10 rounded-lg bg-primary/20 items-center justify-center mr-3 mt-0.5">
                    <Ionicons name="pulse" size={20} color="#FF9F66" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text className="text-text-secondary text-xs">DEEP PULSE</Text>
                      <Text className="text-text-secondary text-xs">now</Text>
                    </View>
                    <Text className="text-text font-bold text-sm mb-1">Your Hub: Campaign Title Here</Text>
                    <Text className="text-text-secondary text-xs leading-4" numberOfLines={2}>
                      Your promotional message goes here. Reach all subscribers instantly.
                    </Text>
                    <View className="bg-primary/15 rounded-lg px-3 py-1.5 mt-2 self-start border border-primary/25">
                      <Text className="text-primary text-xs font-bold">Call to Action</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Free vs Sponsored comparison callout */}
            <View className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/20">
              <View className="flex-row items-center mb-2">
                <Ionicons name="information-circle" size={18} color="#FF9F66" />
                <Text className="text-primary font-bold text-sm ml-2">Free vs Sponsored Notifications</Text>
              </View>
              <Text className="text-text-secondary text-xs leading-4">
                Your hub subscription includes unlimited FREE text notifications (title + message + optional link). Rich Notification Ads are PREMIUM sponsored campaigns with CTA buttons, images, priority delivery, and daily guaranteed frequency.
              </Text>
            </View>

            {/* Why upgrade to Rich Ads? */}
            <View className="bg-background-secondary rounded-xl p-4 mb-4 border border-border">
              <Text className="text-text font-bold text-sm mb-3">Why upgrade to Rich Ads?</Text>
              {[
                'CTA Button with custom label + landing URL',
                'Image support (visual push notification)',
                '1 guaranteed push per day for campaign duration',
                '"SPONSORED" badge (premium visibility)',
                'Advanced analytics (clicks, conversions)',
                'Volume discounts (up to 40% off)',
              ].map((item, i) => (
                <View key={i} className="flex-row items-center mb-1.5">
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text className="text-text-secondary text-xs ml-2">{item}</Text>
                </View>
              ))}
            </View>

            {/* VS Comparison */}
            <View className="bg-background-secondary rounded-xl p-4 mb-4 border border-border">
              <View className="flex-row items-center justify-center mb-3">
                <Text className="text-text font-bold text-sm flex-1 text-center">Free Notifications</Text>
                <View className="bg-primary/20 rounded-full w-8 h-8 items-center justify-center mx-2">
                  <Text className="text-primary font-black text-xs">VS</Text>
                </View>
                <Text className="text-text font-bold text-sm flex-1 text-center">Rich Notification Ads</Text>
              </View>
              {[
                ['Title + Message + Link', 'Title + Body + CTA + Image'],
                ['Included in hub plan', `${PRICING.PUSH_NOTIFICATION_AD.toLocaleString()} $SKR/week`],
                ['Manual send', '1 push/day guaranteed'],
                ['Basic delivery', 'Full analytics dashboard'],
              ].map(([free, rich], i) => (
                <View key={i} className="flex-row mb-2">
                  <Text className="text-text-secondary text-xs flex-1 text-center">{free}</Text>
                  <View className="w-12" />
                  <Text className="text-success text-xs font-semibold flex-1 text-center">{rich}</Text>
                </View>
              ))}
            </View>

            {/* Specs */}
            <View className="bg-background-secondary rounded-xl p-4 mb-4">
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-secondary text-sm">Frequency</Text>
                <Text className="text-text font-semibold text-sm">1 push/day for duration</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-secondary text-sm">Audience</Text>
                <Text className="text-text font-semibold text-sm">All hub subscribers</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-secondary text-sm">Delivery</Text>
                <Text className="text-text font-semibold text-sm">Instant push (FCM)</Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-text-secondary text-sm">Format</Text>
                <Text className="text-text font-semibold text-sm">Title + Body + CTA button</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-text-secondary text-sm">Compatibility</Text>
                <Text className="text-success font-semibold text-sm">All devices</Text>
              </View>
            </View>

            {/* Purchase Button */}
            <TouchableOpacity
              onPress={() => {
                setRichTitle('');
                setRichBody('');
                setRichCtaLabel('');
                setRichCtaUrl('');
                setRichImageUrl('');
                setDuration(1);
                setShowRichNotifModal(true);
              }}
              className="bg-success rounded-xl p-4"
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-center">
                <Ionicons name="create" size={18} /> Create Campaign ({PRICING.PUSH_NOTIFICATION_AD.toLocaleString()} $SKR/week)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Ad Slots */}
        <View className="px-6 pb-6">
          {showSection('top') && <SlotCard config={AD_CONFIG.TOP_SLOT} slots={topSlots} type="top" />}
          {showSection('bottom') && <SlotCard config={AD_CONFIG.BOTTOM_SLOT} slots={bottomSlots} type="bottom" />}

          {/* Lockscreen Ad Section — Premium */}
          {showSection('lockscreen') && (
            <>
              <View className="bg-primary/5 rounded-2xl p-4 mb-4 border border-primary/20">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="phone-portrait" size={20} color="#FF9F66" />
                  <Text className="text-primary font-bold text-base ml-2">Premium: Lock Screen Ads</Text>
                  <View className="bg-primary/20 rounded-full px-2 py-0.5 ml-2">
                    <Text className="text-primary text-xs font-bold">PREMIUM</Text>
                  </View>
                </View>
                <Text className="text-text-secondary text-sm mb-2">
                  Full-screen overlay displayed when users unlock their phone. Users earn points by swiping (Swipe-to-Earn). Maximum engagement guaranteed.
                </Text>
                <Text className="text-text-secondary text-xs italic">
                  Note: Requires SYSTEM_ALERT_WINDOW permission. For sideloaded APKs, users may need to grant this manually in Settings.
                </Text>
              </View>
              <SlotCard config={AD_CONFIG.LOCKSCREEN_SLOT} slots={lockscreenSlots} type="lockscreen" />
            </>
          )}
        </View>

        {/* Bulk Discount Info */}
        {showVolumeDiscounts && (
        <View className="mx-6 mb-6 bg-background-card rounded-2xl p-5 border border-border">
          <Text className="text-text font-bold text-lg mb-3">
            <Ionicons name="pricetag" size={20} /> Volume Discounts
          </Text>
          <View className="space-y-2">
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">4 weeks</Text>
              <Text className="text-success font-semibold">10% OFF</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">12 weeks</Text>
              <Text className="text-success font-semibold">20% OFF</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">26 weeks</Text>
              <Text className="text-success font-semibold">30% OFF</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-text-secondary">52 weeks</Text>
              <Text className="text-success font-semibold">40% OFF</Text>
            </View>
          </View>
        </View>
        )}
      </ScrollView>

      {/* Purchase Modal */}
      <Modal
        visible={showPurchaseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPurchaseModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-[90%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text font-black text-2xl">
                  Purchase {selectedSlot === 'top' ? 'Top' : selectedSlot === 'lockscreen' ? 'Lockscreen' : 'Bottom'} Slot
                </Text>
                <TouchableOpacity onPress={() => { setShowPurchaseModal(false); setIsPurchasing(false); setDuration(1); }}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Review notice */}
              <View className="bg-primary/10 rounded-xl p-3 mb-5 border border-primary/20">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={18} color="#FF9F66" />
                  <Text className="text-text-secondary text-sm ml-2 flex-1">
                    All ads are reviewed by the admin before going live
                  </Text>
                </View>
              </View>

              {/* Validation Errors */}
              <ValidationErrors errors={validationErrors} />

              {/* Form */}
              <View className="space-y-4">
                {/* Image Source Toggle */}
                <View className="mt-4">
                  <Text className="text-text font-bold text-sm mb-3">Ad Creative</Text>
                  <View className="flex-row mb-3">
                    <TouchableOpacity
                      onPress={() => { setImageMode('upload'); setValidationErrors([]); }}
                      className={`flex-1 mr-2 rounded-xl py-3 border ${imageMode === 'upload' ? 'bg-primary/15 border-primary' : 'bg-background-secondary border-border'}`}
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="cloud-upload" size={18} color={imageMode === 'upload' ? '#FF9F66' : '#666'} />
                        <Text className={`font-semibold text-sm ml-2 ${imageMode === 'upload' ? 'text-primary' : 'text-text-secondary'}`}>
                          Upload Image
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setImageMode('url'); setValidationErrors([]); }}
                      className={`flex-1 ml-2 rounded-xl py-3 border ${imageMode === 'url' ? 'bg-primary/15 border-primary' : 'bg-background-secondary border-border'}`}
                    >
                      <View className="flex-row items-center justify-center">
                        <Ionicons name="link" size={18} color={imageMode === 'url' ? '#FF9F66' : '#666'} />
                        <Text className={`font-semibold text-sm ml-2 ${imageMode === 'url' ? 'text-primary' : 'text-text-secondary'}`}>
                          Paste URL
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {imageMode === 'upload' ? (
                    <View>
                      {/* Upload area */}
                      {imageAsset ? (
                        <View className="rounded-xl overflow-hidden border border-primary/30 mb-3">
                          {/* Image Preview */}
                          <Image
                            source={{ uri: imageAsset.uri }}
                            style={{
                              width: '100%',
                              height: selectedSlot === 'lockscreen' ? 200 : 120,
                              resizeMode: 'cover',
                            }}
                          />
                          <View className="bg-background-secondary p-3 flex-row items-center justify-between">
                            <View className="flex-1">
                              <Text className="text-text text-xs font-semibold" numberOfLines={1}>
                                {imageAsset.fileName || 'Selected image'}
                              </Text>
                              <Text className="text-text-secondary text-xs">
                                {imageAsset.fileSize ? `${(imageAsset.fileSize / 1024).toFixed(0)} KB` : ''}
                                {imageAsset.width ? ` \u2022 ${imageAsset.width}x${imageAsset.height}` : ''}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => handlePickImage(false)}
                              className="bg-primary/15 rounded-lg px-3 py-2 ml-3"
                            >
                              <Text className="text-primary font-semibold text-xs">Change</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handlePickImage(false)}
                          className="border-2 border-dashed border-primary/40 rounded-xl py-8 items-center mb-3"
                          style={{ backgroundColor: 'rgba(255,159,102,0.05)' }}
                        >
                          <Ionicons name="cloud-upload-outline" size={40} color="#FF9F66" />
                          <Text className="text-primary font-bold text-base mt-3">
                            Tap to Upload Image
                          </Text>
                          <Text className="text-text-secondary text-xs mt-1">
                            PNG, JPG, GIF or WebP
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Upload progress */}
                      {isUploading && (
                        <View className="bg-primary/10 rounded-xl p-4 mb-3 border border-primary/20">
                          <View className="flex-row items-center mb-2">
                            <ActivityIndicator size="small" color="#FF9F66" />
                            <Text className="text-primary font-semibold text-sm ml-2">
                              Uploading... {uploadProgress}%
                            </Text>
                          </View>
                          <View className="bg-background-secondary rounded-full h-2 overflow-hidden">
                            <View
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View>
                      <TextInput
                        value={imageUrl}
                        onChangeText={(text) => { setImageUrl(text); setValidationErrors([]); }}
                        placeholder={`https://cdn.example.com/ad-${selectedSlot === 'lockscreen' ? '1080x1920' : selectedSlot === 'top' ? '390x120' : '390x100'}.png`}
                        placeholderTextColor="#666"
                        maxLength={MAX_LENGTHS.URL}
                        className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                        autoCapitalize="none"
                        keyboardType="url"
                      />
                      {/* URL Preview */}
                      {imageUrl.startsWith('https://') && (
                        <View className="rounded-xl overflow-hidden border border-border mt-2 mb-1">
                          <Image
                            source={{ uri: imageUrl }}
                            style={{
                              width: '100%',
                              height: selectedSlot === 'lockscreen' ? 200 : 120,
                              resizeMode: 'cover',
                              backgroundColor: '#1a1a20',
                            }}
                          />
                        </View>
                      )}
                    </View>
                  )}

                  {/* Image specs */}
                  <View className="bg-primary/10 rounded-lg p-3 mt-2 border border-primary/20">
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="image" size={14} color="#FF9F66" />
                      <Text className="text-primary font-semibold text-xs ml-1">Image Specifications</Text>
                    </View>
                    <Text className="text-text-secondary text-xs">
                      Dimensions: {selectedSlot === 'lockscreen' ? '1080 x 1920 px (full screen)' : selectedSlot === 'top' ? '390 x 120 px' : '390 x 100 px'}
                    </Text>
                    <Text className="text-text-secondary text-xs">
                      Formats: PNG, JPG, GIF, or WebP
                    </Text>
                    <Text className="text-text-secondary text-xs">
                      Max file size: {selectedSlot === 'lockscreen' ? '5 MB' : '2 MB'}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text className="text-text-secondary text-sm mb-2">Landing Page URL</Text>
                  <TextInput
                    value={landingUrl}
                    onChangeText={(text) => { setLandingUrl(text); setValidationErrors([]); }}
                    placeholder="https://yourproject.com"
                    placeholderTextColor="#666"
                    maxLength={MAX_LENGTHS.URL}
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                <View>
                  <Text className="text-text-secondary text-sm mb-2">Duration (weeks)</Text>
                  <View className="flex-row items-center space-x-3">
                    <TouchableOpacity
                      onPress={() => setDuration(Math.max(1, duration - 1))}
                      className="bg-background-secondary w-12 h-12 rounded-xl items-center justify-center border border-border"
                    >
                      <Ionicons name="remove" size={24} color="#FF9F66" />
                    </TouchableOpacity>
                    <View className="flex-1 bg-background-secondary rounded-xl p-4 border border-border">
                      <Text className="text-text text-center font-bold text-lg">{duration}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDuration(duration + 1)}
                      className="bg-background-secondary w-12 h-12 rounded-xl items-center justify-center border border-border"
                    >
                      <Ionicons name="add" size={24} color="#FF9F66" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Price Calculation */}
                <View className="bg-primary/10 rounded-xl p-4 border border-primary/30">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-text-secondary">Base Price</Text>
                    <Text className="text-text font-semibold">
                      {(((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : selectedSlot === 'lockscreen' ? AD_CONFIG.LOCKSCREEN_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price)) * duration).toLocaleString()} $SKR
                    </Text>
                  </View>
                  {calculateDiscount(duration) > 0 && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-success">Discount ({(calculateDiscount(duration) * 100).toFixed(0)}%)</Text>
                      <Text className="text-success font-semibold">
                        -{(((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : selectedSlot === 'lockscreen' ? AD_CONFIG.LOCKSCREEN_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price)) * duration * calculateDiscount(duration)).toLocaleString()} $SKR
                      </Text>
                    </View>
                  )}
                  <View className="border-t border-primary/20 pt-2 mt-2">
                    <View className="flex-row justify-between">
                      <Text className="text-primary font-bold text-lg">Total</Text>
                      <Text className="text-primary font-black text-lg">
                        {(
                          (((selectedSlot === 'top' ? AD_CONFIG.TOP_SLOT.price : selectedSlot === 'lockscreen' ? AD_CONFIG.LOCKSCREEN_SLOT.price : AD_CONFIG.BOTTOM_SLOT.price)) * duration) *
                          (1 - calculateDiscount(duration))
                        ).toLocaleString()} $SKR
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Purchase Button */}
                <TouchableOpacity
                  onPress={handleConfirmPurchase}
                  disabled={isPurchasing}
                  className={`rounded-xl p-4 mt-4 ${isPurchasing ? 'bg-gray-500' : 'bg-primary'}`}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name={isPurchasing ? 'hourglass' : 'shield-checkmark'} size={18} color="#fff" />
                    <Text className="text-white font-bold text-center text-lg ml-2">
                      {isPurchasing ? 'Processing...' : 'Purchase & Submit for Review'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rich Notification Campaign Modal */}
      <Modal
        visible={showRichNotifModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRichNotifModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-[90%] flex-1">
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text font-black text-2xl">
                  Push Notification Ad
                </Text>
                <TouchableOpacity onPress={() => { setShowRichNotifModal(false); setDuration(1); }}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Review notice */}
              <View className="bg-success/10 rounded-xl p-3 mb-5 border border-success/20">
                <View className="flex-row items-center">
                  <Ionicons name="people" size={18} color="#4CAF50" />
                  <Text className="text-text-secondary text-sm ml-2 flex-1">
                    Your notification will be sent to all hub subscribers instantly
                  </Text>
                </View>
              </View>

              {/* Form */}
              <View>
                {/* Title */}
                <View className="mb-4">
                  <Text className="text-text font-bold text-sm mb-2">
                    Notification Title <Text className="text-text-secondary font-normal">(max 60 chars)</Text>
                  </Text>
                  <TextInput
                    value={richTitle}
                    onChangeText={(t) => setRichTitle(t.slice(0, 60))}
                    placeholder="e.g. Flash Sale: 50% off all NFTs!"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                  />
                  <Text className="text-text-secondary text-xs mt-1 text-right">{richTitle.length}/60</Text>
                </View>

                {/* Body */}
                <View className="mb-4">
                  <Text className="text-text font-bold text-sm mb-2">
                    Message <Text className="text-text-secondary font-normal">(max 150 chars)</Text>
                  </Text>
                  <TextInput
                    value={richBody}
                    onChangeText={(t) => setRichBody(t.slice(0, 150))}
                    placeholder="e.g. Don't miss our exclusive collection drop. Mint now before it's gone!"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={{ minHeight: 80 }}
                  />
                  <Text className="text-text-secondary text-xs mt-1 text-right">{richBody.length}/150</Text>
                </View>

                {/* CTA Label */}
                <View className="mb-4">
                  <Text className="text-text font-bold text-sm mb-2">
                    Button Label <Text className="text-text-secondary font-normal">(max 20 chars)</Text>
                  </Text>
                  <TextInput
                    value={richCtaLabel}
                    onChangeText={(t) => setRichCtaLabel(t.slice(0, 20))}
                    placeholder="e.g. Mint Now"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                  />
                </View>

                {/* CTA URL */}
                <View className="mb-4">
                  <Text className="text-text font-bold text-sm mb-2">Button URL</Text>
                  <TextInput
                    value={richCtaUrl}
                    onChangeText={setRichCtaUrl}
                    placeholder="https://yourproject.com/offer"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                {/* Image URL (optional) */}
                <View className="mb-4">
                  <Text className="text-text font-bold text-sm mb-2">
                    Image URL <Text className="text-text-secondary font-normal">(optional, 512x256 px)</Text>
                  </Text>
                  <TextInput
                    value={richImageUrl}
                    onChangeText={setRichImageUrl}
                    placeholder="https://cdn.example.com/banner.png"
                    placeholderTextColor="#666"
                    className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>

                {/* Duration */}
                <View className="mb-4">
                  <Text className="text-text font-bold text-sm mb-2">Duration (weeks)</Text>
                  <View className="flex-row items-center space-x-3">
                    <TouchableOpacity
                      onPress={() => setDuration(Math.max(1, duration - 1))}
                      className="bg-background-secondary w-12 h-12 rounded-xl items-center justify-center border border-border"
                    >
                      <Ionicons name="remove" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                    <View className="flex-1 bg-background-secondary rounded-xl p-4 border border-border">
                      <Text className="text-text text-center font-bold text-lg">{duration}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setDuration(duration + 1)}
                      className="bg-background-secondary w-12 h-12 rounded-xl items-center justify-center border border-border"
                    >
                      <Ionicons name="add" size={24} color="#4CAF50" />
                    </TouchableOpacity>
                  </View>
                  <Text className="text-text-secondary text-xs mt-2">
                    1 push notification per day to all subscribers for {duration} week{duration > 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Live Preview */}
                <View className="bg-background-secondary rounded-xl p-4 mb-4 border border-border">
                  <Text className="text-text-secondary text-xs font-semibold mb-3 uppercase">Live Preview</Text>
                  <View className="bg-[#1a1a20] rounded-xl p-4 border border-[#2a2a30]">
                    <View className="flex-row items-start">
                      <View className="w-10 h-10 rounded-lg bg-primary/20 items-center justify-center mr-3 mt-0.5">
                        <Ionicons name="pulse" size={20} color="#FF9F66" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-text-secondary text-xs">DEEP PULSE</Text>
                          <Text className="text-text-secondary text-xs">now</Text>
                        </View>
                        <Text className="text-text font-bold text-sm mb-1">
                          {richTitle || 'Your Title'}
                        </Text>
                        <Text className="text-text-secondary text-xs leading-4" numberOfLines={2}>
                          {richBody || 'Your message appears here...'}
                        </Text>
                        {(richCtaLabel || '').trim() !== '' && (
                          <View className="bg-primary/15 rounded-lg px-3 py-1.5 mt-2 self-start border border-primary/25">
                            <Text className="text-primary text-xs font-bold">{richCtaLabel}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Price */}
                <View className="bg-success/10 rounded-xl p-4 border border-success/30 mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-text-secondary">Base Price</Text>
                    <Text className="text-text font-semibold">{(PRICING.PUSH_NOTIFICATION_AD * duration).toLocaleString()} $SKR</Text>
                  </View>
                  {calculateDiscount(duration) > 0 && (
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-success">Discount ({(calculateDiscount(duration) * 100).toFixed(0)}%)</Text>
                      <Text className="text-success font-semibold">
                        -{(PRICING.PUSH_NOTIFICATION_AD * duration * calculateDiscount(duration)).toLocaleString()} $SKR
                      </Text>
                    </View>
                  )}
                  <View className="border-t border-success/20 pt-2 mt-1">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-success font-bold text-lg">Total</Text>
                      <Text className="text-success font-black text-lg">
                        {(PRICING.PUSH_NOTIFICATION_AD * duration * (1 - calculateDiscount(duration))).toLocaleString()} $SKR
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={() => {
                    if (!richTitle.trim() || !richBody.trim()) {
                      Alert.alert('Missing Fields', 'Please fill in at least the title and message.');
                      return;
                    }
                    const totalCost = PRICING.PUSH_NOTIFICATION_AD * duration * (1 - calculateDiscount(duration));
                    setIsSubmittingRich(true);
                    Alert.alert(
                      'Confirm Campaign',
                      `Purchase push notification campaign?\n\nTitle: ${richTitle}\nDuration: ${duration} week${duration > 1 ? 's' : ''}\nCost: ${totalCost.toLocaleString()} $SKR\n\nYour notification will be submitted for admin review.`,
                      [
                        { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmittingRich(false) },
                        {
                          text: 'Purchase & Submit',
                          onPress: () => {
                            setTimeout(() => {
                              // Add to my ads list (local UI)
                              setMyAds(prev => [...prev, {
                                id: `my_rich_${Date.now()}`,
                                slotType: 'rich_notif',
                                imageUrl: richImageUrl.trim() || null,
                                landingUrl: richCtaUrl.trim() || null,
                                status: 'PENDING_REVIEW',
                                remainingDays: duration * 7,
                                totalWeeks: duration,
                                impressions: 0,
                                clicks: 0,
                                richTitle: richTitle.trim(),
                                richBody: richBody.trim(),
                              }]);

                              // Wire to Zustand store → Admin sees this in Ad Moderation
                              addPendingAdCreative({
                                id: `ad_review_rich_${Date.now()}`,
                                brandName: wallet.publicKey
                                  ? wallet.publicKey.toString().slice(0, 7) + '...'
                                  : 'You',
                                brandWallet: wallet.publicKey
                                  ? wallet.publicKey.toString().slice(0, 3) + '...' + wallet.publicKey.toString().slice(-3)
                                  : 'Your Wallet',
                                hubName: hubName,
                                slotType: 'rich_notif',
                                imageUrl: richImageUrl.trim() || null,
                                landingUrl: richCtaUrl.trim() || null,
                                duration: duration,
                                totalCost: totalCost,
                                status: 'PENDING',
                                submittedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
                                richTitle: richTitle.trim(),
                                richBody: richBody.trim(),
                                richCtaLabel: richCtaLabel.trim(),
                              });

                              setIsSubmittingRich(false);
                              setShowRichNotifModal(false);
                              Alert.alert(
                                'Campaign Submitted!',
                                `Your push notification ad has been submitted for admin review.\n\nDuration: ${duration} week${duration > 1 ? 's' : ''}\nCost: ${totalCost.toLocaleString()} $SKR\n\nYou will be notified once approved.`,
                              );
                            }, 1500);
                          },
                        },
                      ]
                    );
                  }}
                  disabled={isSubmittingRich}
                  className={`rounded-xl p-4 ${isSubmittingRich ? 'bg-gray-500' : 'bg-success'}`}
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center justify-center">
                    <Ionicons name={isSubmittingRich ? 'hourglass' : 'shield-checkmark'} size={18} color="#fff" />
                    <Text className="text-white font-bold text-center text-lg ml-2">
                      {isSubmittingRich ? 'Processing...' : 'Purchase & Submit for Review'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Creative Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View className="bg-background rounded-t-3xl p-6 max-h-[85%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-text font-black text-2xl">Edit Creative</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={28} color="#888" />
                </TouchableOpacity>
              </View>

              {/* Warning notice */}
              <View className="bg-primary/10 rounded-xl p-4 mb-5 border border-primary/20">
                <View className="flex-row items-start">
                  <Ionicons name="information-circle" size={20} color="#FF9F66" />
                  <Text className="text-text-secondary text-sm ml-2 flex-1">
                    Modifying your creative will resubmit it for admin review. Your current ad continues to display until the new version is approved.
                  </Text>
                </View>
              </View>

              {/* Validation Errors */}
              <ValidationErrors errors={editValidationErrors} />

              {/* Edit Form — Image */}
              <View className="mt-4">
                <Text className="text-text font-bold text-sm mb-3">Update Creative</Text>
                <View className="flex-row mb-3">
                  <TouchableOpacity
                    onPress={() => { setEditImageMode('upload'); setEditValidationErrors([]); }}
                    className={`flex-1 mr-2 rounded-xl py-3 border ${editImageMode === 'upload' ? 'bg-primary/15 border-primary' : 'bg-background-secondary border-border'}`}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="cloud-upload" size={16} color={editImageMode === 'upload' ? '#FF9F66' : '#666'} />
                      <Text className={`font-semibold text-xs ml-2 ${editImageMode === 'upload' ? 'text-primary' : 'text-text-secondary'}`}>
                        Upload New
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setEditImageMode('url'); setEditValidationErrors([]); }}
                    className={`flex-1 ml-2 rounded-xl py-3 border ${editImageMode === 'url' ? 'bg-primary/15 border-primary' : 'bg-background-secondary border-border'}`}
                  >
                    <View className="flex-row items-center justify-center">
                      <Ionicons name="link" size={16} color={editImageMode === 'url' ? '#FF9F66' : '#666'} />
                      <Text className={`font-semibold text-xs ml-2 ${editImageMode === 'url' ? 'text-primary' : 'text-text-secondary'}`}>
                        Paste URL
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {editImageMode === 'upload' ? (
                  <View>
                    {editImageAsset ? (
                      <View className="rounded-xl overflow-hidden border border-primary/30 mb-3">
                        <Image
                          source={{ uri: editImageAsset.uri }}
                          style={{
                            width: '100%',
                            height: editingAd?.slotType === 'lockscreen' ? 200 : 120,
                            resizeMode: 'cover',
                          }}
                        />
                        <View className="bg-background-secondary p-3 flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text className="text-text text-xs font-semibold" numberOfLines={1}>
                              {editImageAsset.fileName || 'Selected image'}
                            </Text>
                            <Text className="text-text-secondary text-xs">
                              {editImageAsset.fileSize ? `${(editImageAsset.fileSize / 1024).toFixed(0)} KB` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handlePickImage(true)}
                            className="bg-primary/15 rounded-lg px-3 py-2 ml-3"
                          >
                            <Text className="text-primary font-semibold text-xs">Change</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handlePickImage(true)}
                        className="border-2 border-dashed border-primary/40 rounded-xl py-6 items-center mb-3"
                        style={{ backgroundColor: 'rgba(255,159,102,0.05)' }}
                      >
                        <Ionicons name="cloud-upload-outline" size={32} color="#FF9F66" />
                        <Text className="text-primary font-bold text-sm mt-2">Tap to Upload</Text>
                      </TouchableOpacity>
                    )}

                    {editIsUploading && (
                      <View className="bg-primary/10 rounded-xl p-4 mb-3 border border-primary/20">
                        <View className="flex-row items-center mb-2">
                          <ActivityIndicator size="small" color="#FF9F66" />
                          <Text className="text-primary font-semibold text-sm ml-2">
                            Uploading... {editUploadProgress}%
                          </Text>
                        </View>
                        <View className="bg-background-secondary rounded-full h-2 overflow-hidden">
                          <View
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${editUploadProgress}%` }}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <TextInput
                      value={editImageUrl}
                      onChangeText={(text) => { setEditImageUrl(text); setEditValidationErrors([]); }}
                      placeholder={`https://cdn.example.com/ad.png`}
                      placeholderTextColor="#666"
                      maxLength={MAX_LENGTHS.URL}
                      className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    {editImageUrl.startsWith('https://') && (
                      <View className="rounded-xl overflow-hidden border border-border mt-2 mb-1">
                        <Image
                          source={{ uri: editImageUrl }}
                          style={{
                            width: '100%',
                            height: editingAd?.slotType === 'lockscreen' ? 200 : 120,
                            resizeMode: 'cover',
                            backgroundColor: '#1a1a20',
                          }}
                        />
                      </View>
                    )}
                  </View>
                )}

                <View className="bg-primary/10 rounded-lg p-3 mt-2 border border-primary/20">
                  <View className="flex-row items-center mb-1">
                    <Ionicons name="image" size={14} color="#FF9F66" />
                    <Text className="text-primary font-semibold text-xs ml-1">Required Specifications</Text>
                  </View>
                  <Text className="text-text-secondary text-xs">
                    Dimensions: {editingAd?.slotType === 'lockscreen' ? '1080 x 1920 px' : editingAd?.slotType === 'top' ? '390 x 120 px' : '390 x 100 px'}
                  </Text>
                  <Text className="text-text-secondary text-xs">
                    Formats: PNG, JPG, GIF, or WebP | Max: {editingAd?.slotType === 'lockscreen' ? '5 MB' : '2 MB'}
                  </Text>
                </View>
              </View>

              <View className="mt-4">
                <Text className="text-text-secondary text-sm mb-2">Landing Page URL</Text>
                <TextInput
                  value={editLandingUrl}
                  onChangeText={(text) => { setEditLandingUrl(text); setEditValidationErrors([]); }}
                  placeholder="https://yourproject.com"
                  placeholderTextColor="#666"
                  maxLength={MAX_LENGTHS.URL}
                  className="bg-background-secondary text-text rounded-xl p-4 border border-border"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmitEdit}
                disabled={editIsUploading}
                className={`rounded-xl p-4 mt-6 ${editIsUploading ? 'bg-gray-500' : 'bg-primary'}`}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name={editIsUploading ? 'hourglass' : 'shield-checkmark'} size={18} color="#fff" />
                  <Text className="text-white font-bold text-center text-lg ml-2">
                    {editIsUploading ? 'Uploading...' : 'Submit for Review'}
                  </Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
