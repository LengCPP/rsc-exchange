import { Avatar } from "@chakra-ui/react"
import type { UserPublicExtended } from "@/customTypes"
import { getImageUrl } from "@/utils"

interface UserAvatarProps {
  user?: UserPublicExtended | null
  size?: string
  fontSize?: string
}

const UserAvatar = ({ user, size = "40px", fontSize }: UserAvatarProps) => {
  const imageUrl = getImageUrl(user?.profile?.image_url)
  const fullName = user?.full_name || user?.email || ""
  
  return (
    <Avatar.Root boxSize={size}>
      <Avatar.Fallback 
        name={fullName} 
        fontSize={fontSize || `calc(${size} * 0.4)`} 
        bg="orange.400" 
        color="white" 
        fontWeight="bold" 
        lineHeight="1"
      />
      <Avatar.Image src={imageUrl || undefined} />
    </Avatar.Root>
  )
}

export default UserAvatar
