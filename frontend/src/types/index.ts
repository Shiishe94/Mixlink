export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'dj' | 'organizer';
  phone?: string;
  profile_image?: string;
  created_at: string;
  is_active: boolean;
  dj_profile?: DJProfile;
}

export interface SocialMedia {
  instagram?: string;
  facebook?: string;
  soundcloud?: string;
  mixcloud?: string;
  youtube?: string;
  tiktok?: string;
  spotify?: string;
}

export interface PortfolioItem {
  id: string;
  type: 'video' | 'audio' | 'image';
  url?: string;
  base64_data?: string;
  title: string;
  description?: string;
}

export interface DJProfile {
  id: string;
  user_id: string;
  artist_name: string;
  bio: string;
  music_styles: string[];
  event_types: string[];
  equipment?: string;
  price: number;
  minimum_hours: number;
  travel_radius_km: number;
  city: string;
  latitude?: number;
  longitude?: number;
  experience_years: number;
  social_media?: SocialMedia;
  portfolio?: PortfolioItem[];
  rating: number;
  review_count: number;
  booking_count: number;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
  user?: {
    first_name: string;
    last_name: string;
    profile_image?: string;
    email?: string;
  };
  recent_reviews?: Review[];
}

export interface AvailabilitySlot {
  id: string;
  dj_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface Event {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  event_type: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  city: string;
  latitude?: number;
  longitude?: number;
  budget_min: number;
  budget_max: number;
  music_styles: string[];
  guest_count: number;
  special_requirements?: string;
  status: 'open' | 'booked' | 'completed' | 'cancelled';
  created_at: string;
  organizer?: {
    first_name: string;
    last_name: string;
  };
}

export interface Booking {
  id: string;
  dj_id: string;
  event_id: string;
  organizer_id: string;
  proposed_rate: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'paid' | 'completed' | 'cancelled';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_method?: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  event?: Event;
  dj?: {
    id: string;
    artist_name: string;
    user?: {
      first_name: string;
      last_name: string;
      profile_image?: string;
    };
  };
  organizer?: {
    first_name: string;
    last_name: string;
  };
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  booking_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  partner_id: string;
  partner_name: string;
  partner_image?: string;
  last_message?: Message;
  unread_count: number;
}

export interface Review {
  id: string;
  dj_id: string;
  booking_id: string;
  organizer_id: string;
  rating: number;
  comment: string;
  created_at: string;
  organizer?: {
    first_name: string;
    last_name: string;
  };
}

export interface Payment {
  id: string;
  booking_id: string;
  payment_method: string;
  amount: number;
  status: string;
  transaction_id?: string;
  created_at: string;
}
