import { Avatar, Box } from "@chakra-ui/react"
import type { UserPublicExtended } from "@/customTypes"
import { getImageUrl } from "@/utils"

interface UserAvatarProps {
  user?: UserPublicExtended | null
  size?: string
  fontSize?: string
}

const PALETTES = [
  "blue",
  "cyan",
  "green",
  "orange",
  "pink",
  "purple",
  "red",
  "teal",
  "yellow",
]

const pickPalette = (name: string) => {
  const index = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PALETTES[index % PALETTES.length]
}

const UserAvatar = ({ user, size = "40px", fontSize }: UserAvatarProps) => {
  const imageUrl = getImageUrl(user?.profile?.image_url)
  const fullName = user?.full_name || user?.email || ""
  
  return (
    <Box
      display="inline-flex"
      p="2px"
      borderRadius="full"
      border="2px solid"
      borderColor="ui.hover"
    >
      <Avatar.Root boxSize={size}>
        <Avatar.Fallback 
          name={fullName} 
          fontSize={fontSize || `calc(${size} * 0.4)`} 
          colorPalette={pickPalette(fullName)}
        />
        <Avatar.Image src={imageUrl || undefined} />
      </Avatar.Root>
    </Box>
  )
}

export default UserAvatar
