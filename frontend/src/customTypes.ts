import type {
  CommunityCreate,
  CommunityPublic,
  CommunityUpdate,
  UserPublic,
  ItemType,
  InterestPublic,
  UserProfilePublic,
  UserSettingsPublic,
  UserProfileUpdate,
  UserSettingsUpdate,
  CommunityMemberRole,
  CommunityMemberStatus,
} from "./client"

export {
  type ItemType,
  type UserProfileUpdate,
  type UserSettingsUpdate,
  type InterestPublic,
}

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
  community_role?: CommunityMemberRole
  community_status?: CommunityMemberStatus
}

export interface UserProfilePublicExtended extends Omit<UserProfilePublic, "image_url"> {
  image_url?: string | null
}

export interface UserPublicExtended extends Omit<UserPublic, "profile"> {
  profile?: UserProfilePublicExtended
  settings?: UserSettingsPublic
  interests?: InterestPublic[]
}

