import { Box, Flex, Image, Text } from "@chakra-ui/react"
import type { UserPublicExtended } from "@/customTypes"
import { getImageUrl } from "@/utils"

interface UserAvatarProps {
  user?: UserPublicExtended | null
  size?: string
  fontSize?: string
}

const UserAvatar = ({ user, size = "40px", fontSize = "md" }: UserAvatarProps) => {
  const imageUrl = getImageUrl(user?.profile?.image_url)
  const fullName = user?.full_name || user?.email || ""
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={fullName}
        borderRadius="full"
        boxSize={size}
        objectFit="cover"
        fallback={
          <Flex
            bg="teal.500"
            color="white"
            borderRadius="full"
            boxSize={size}
            align="center"
            justify="center"
          >
            <Text fontSize={fontSize} fontWeight="bold">
              {getInitials(fullName)}
            </Text>
          </Flex>
        }
      />
    )
  }

  return (
    <Flex
      bg="teal.500"
      color="white"
      borderRadius="full"
      boxSize={size}
      align="center"
      justify="center"
    >
      <Text fontSize={fontSize} fontWeight="bold">
        {getInitials(fullName)}
      </Text>
    </Flex>
  )
}

export default UserAvatar
