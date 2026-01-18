import type { CommunityCreate, CommunityPublic, CommunityUpdate, UserPublic } from "./client"

export interface CommunityCreateExtended extends CommunityCreate {
  is_closed?: boolean
}

export interface CommunityUpdateExtended extends CommunityUpdate {
  is_closed?: boolean
}

export interface CommunityPublicExtended extends CommunityPublic {
  is_closed?: boolean
}

export interface UserPublicWithRole extends UserPublic {
  community_role?: "admin" | "member"
  community_status?: "pending" | "accepted" | "rejected"
}

export interface InterestPublic {
  id: string
  name: string
  category?: string
}

export interface UserProfilePublic {
  bio?: string
}

export interface UserSettingsPublic {
  theme: string
  notifications_enabled: boolean
}

export interface UserProfileUpdate {
  bio?: string
  interest_ids?: string[]
}

export interface UserSettingsUpdate {
  theme?: string
  notifications_enabled?: boolean
}

export interface UserPublicExtended extends UserPublic {
  profile?: UserProfilePublic
  settings?: UserSettingsPublic
  interests?: InterestPublic[]
}
