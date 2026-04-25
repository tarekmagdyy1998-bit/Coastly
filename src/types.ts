export type UserType = 'client' | 'office' | 'owner' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserType;
  photoURL: string;
  createdAt: string;
  phoneNumber: string;
  profileSetupComplete?: boolean;
  verified?: boolean;
  banned?: boolean;
  // Specific data for each role
  officeName?: string;
  officeAddress?: string;
  ownerName?: string;
  ownerPhone?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  realPhotos?: string[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'offer' | 'payment' | 'system' | 'chat';
  read: boolean;
  timestamp: string;
  link?: string;
}

export interface Chalet {
  id: string;
  name: string;
  location: string;
  price: number;
  rooms: number;
  bathrooms: number;
  type?: 'chalet' | 'villa' | 'apartment' | 'cabin' | string;
  images: string[];
  officeId: string;
  description: string;
  amenities: string[];
  status: 'available' | 'booked';
  availableFrom?: string;
  availableTo?: string;
  blockedDates?: string[]; // Array of ISO date strings (YYYY-MM-DD)
  createdAt: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews?: Review[];
  // Legacy fields for UI compatibility
  emoji?: string;
  gradient?: string;
  badge?: 'nego' | 'new' | 'verified';
  office?: string | null;
  minNights?: number;
  availableGaps?: { start: string; end: string; price?: number }[];
  // New fields for rules and fees
  beachPassFee?: number;
  beachPassDuration?: string;
  beachPassPersons?: number;
  securityDeposit?: number;
  allowedGroups?: ('families' | 'men' | 'women')[];
  noMixedGroups?: boolean;
  idRequired?: boolean;
  housekeepingFee?: number;
  electricityFee?: number;
  electricityMode?: 'fixed' | 'prepaid';
}

export interface Request {
  id: string;
  userId: string;
  location: string;
  checkIn: string;
  checkOut: string;
  budget: number;
  guests: number;
  status: 'active' | 'closed';
  urgent: boolean;
  createdAt: string;
  // Legacy fields for UI compatibility
  clientCode?: string;
  area?: string;
  dateFrom?: string;
  dateTo?: string;
  persons?: number;
  rooms?: number;
  maxBudget?: number;
  features?: string[];
  note?: string;
  myRequest?: boolean;
  aiMatch?: number;
  offersCount?: number;
}

export interface Negotiation {
  id: string;
  requestId: string;
  chaletId: string;
  officeId: string;
  userId: string;
  clientName?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter' | 'agreed' | 'cancelled';
  currentOffer: number;
  createdAt: string;
  // Legacy fields for UI compatibility
  chaletName?: string;
  officeName?: string;
  dates?: string;
  nights?: number;
  listedPrice?: number;
  myOffer?: number;
  counterOffer?: number;
  agreedPrice?: number;
  escrowAmount?: number;
  expiresAt?: string;
  suggestedDates?: string;
  isSpecialDeal?: boolean;
  note?: string;
  clientPhone?: string;
  officePhone?: string;
  // Payment confirmation fields
  paymentSentByClient?: boolean;
  paymentReceivedByOffice?: boolean;
  depositAmount?: number;
  remainingBalance?: number;
  totalAmount?: number;
  paymentProofUrl?: string;
  confirmedAt?: string;
  checkIn?: string;
  checkOut?: string;
  reviewed?: boolean;
  // Fee breakdown fields
  beachPassFee?: number;
  securityDeposit?: number;
  housekeepingFee?: number;
  electricityFee?: number;
  electricityMode?: 'fixed' | 'prepaid';
  // Cancellation fields
  cancellationStatus?: 'none' | 'requested' | 'agreed' | 'refund_pending' | 'cancelled';
  cancellationRequestedBy?: 'client' | 'office';
  cancellationReason?: string;
  cancellationRequestedAt?: string;
  cancellationAgreedAt?: string;
  refundConfirmedByClient?: boolean;
  refundConfirmedByOffice?: boolean;
  refundAmount?: number;
  refundProofUrl?: string;
  cancellationFinalizedAt?: string;
  idUrls?: string[];
  idRequired?: boolean;
  guests?: number;
  suggestedChaletId?: string;
  suggestedChaletName?: string;
  requestBudget?: number;
  chaletImage?: string;
  suggestedChaletImage?: string;
}
