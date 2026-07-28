export type MediaOut = {
  id: number;
  url: string;
  media_type: "image" | "video" | string;
  slot: string;
  caption: string | null;
  cloudinary_public_id: string;
  like_count?: number;
  liked_by_me?: boolean;
};

export type Customization = {
  bg_color: string | null;
  bg_image_url: string | null;
  font_family: string;
  flyer_url: string | null;
  flyer_public_id: string | null;
};

export type SkillOut = {
  id: number;
  name: string;
  slug: string;
  level: number;
  is_verified: boolean;
  endorsement_count: number;
};

export type DiplomaOut = {
  id: number;
  title: string;
  issuer: string | null;
  issued_at: string | null;
  credential_url: string | null;
  media_url: string | null;
};

export type ExperienceOut = {
  id: number;
  company: string;
  role: string;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
};

export type LinkOut = {
  id: number;
  label: string;
  url: string;
  sort_order: number;
};

export type CommentOut = {
  id: number;
  body: string;
  author_username: string;
  author_id: number;
  parent_id: number | null;
  created_at: string;
  like_count?: number;
  liked_by_me?: boolean;
};

export type ProfileBundle = {
  profile: {
    id: number;
    display_name: string;
    headline: string | null;
    bio: string | null;
    avatar_url: string | null;
    location: string | null;
    username: string;
    linkedin_url?: string | null;
    github_url?: string | null;
    contact_email?: string | null;
  };
  customization: Customization;
  layout: {
    hero: MediaOut | null;
    left: (MediaOut | null)[];
    right: (MediaOut | null)[];
  };
  skills: SkillOut[];
  diplomas: DiplomaOut[];
  experiences: ExperienceOut[];
  links: LinkOut[];
  comments: CommentOut[];
  is_owner: boolean;
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
  onboarding_completed?: boolean;
  comments_next_cursor?: number | null;
};

export type UserCard = {
  id: number;
  username: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
};

export type ActivityEvent = {
  id: number;
  event_type: string;
  summary: string;
  actor_username: string;
  actor_display_name: string;
  profile_username: string | null;
  ref_id: number | null;
  created_at: string;
  media_url: string | null;
};

export type NotificationOut = {
  id: number;
  notif_type: string;
  body: string;
  actor_username: string | null;
  ref_id: number | null;
  read_at: string | null;
  created_at: string;
};

export type SimilarProfile = {
  username: string;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
  shared_skills: string[];
  score: number;
};

export type ProfileCoach = {
  score: number;
  tips: string[];
  gaps: string[];
};

export type UserOut = {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export const ALLOWED_FONTS = [
  "Space Grotesk",
  "DM Sans",
  "Instrument Serif",
  "IBM Plex Mono",
  "Outfit",
  "Sora",
  "Fraunces",
] as const;
