import { CommunityCreate, CommunityPublic, UserPublic } from "./client"

export interface CommunityCreateExtended extends CommunityCreate {
  is_closed?: boolean
}

export interface CommunityPublicExtended extends CommunityPublic {
  is_closed?: boolean
}

export interface UserPublicWithRole extends UserPublic {
  community_role?: "admin" | "member"
}
