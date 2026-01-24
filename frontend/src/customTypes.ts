import type {
  CommunityCreate,
  CommunityMemberRole,
  CommunityMemberStatus,
  CommunityPublic,
  CommunityUpdate,
  InterestPublic,
  ItemType,
  UserProfilePublic,
  UserProfileUpdate,
  UserPublic,
  UserSettingsSchema,
} from "./client"

export type {
  ItemType,
  UserProfileUpdate,
  UserSettingsSchema as UserSettingsUpdate,
  InterestPublic,
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

export interface UserProfilePublicExtended
  extends Omit<UserProfilePublic, "image_url"> {
  image_url?: string | null
}

export interface UserPublicExtended extends Omit<UserPublic, "profile"> {
  profile?: UserProfilePublicExtended
  settings?: UserSettingsSchema
  interests?: InterestPublic[]
}
