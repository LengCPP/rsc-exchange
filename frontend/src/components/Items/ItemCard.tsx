import type { ItemPublic } from "@/client"
import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
import { useColorModeValue } from "@/components/ui/color-mode"
import useAuth from "@/hooks/useAuth"
import { getImageUrl } from "@/utils"
import { Badge, Box, Card, Flex, HStack, Image, Text, VStack } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { useState } from "react"

interface ItemCardProps {
  item: ItemPublic
}

const ItemCard = ({ item }: ItemCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const { user } = useAuth()

  // Color Mode Values
  const bgColor = useColorModeValue("orange.50", "gray.800")
  const textColor = useColorModeValue("gray.800", "gray.100")
  const borderColor = useColorModeValue("orange.200", "gray.600")

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const isOwner = item.owners?.some((o) => o.id === user?.id)

  return (
    <Box
      aspectRatio={3 / 4}
      width="100%"
      minW="160px" // Ensure reasonable minimum width
      cursor="pointer"
      perspective="1000px"
      borderRadius="lg"
    >
      <Box
        position="relative"
        width="100%"
        height="100%"
        transition="transform 0.6s"
        transformStyle="preserve-3d"
        transform={isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"}
      >
        {/* --- FRONT FACE (Cover) --- */}
        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          backfaceVisibility="hidden"
          onClick={handleFlip}
          overflow="hidden"
          borderRadius="lg"
          borderWidth="0"
          boxShadow="md"
          bg={item.image_url ? "gray.200" : bgColor} // Fallback bg if no image
        >
          {item.image_url ? (
            <Image
              src={getImageUrl(item.image_url)}
              alt={item.title}
              objectFit="cover"
              width="100%"
              height="100%"
            />
          ) : (
            // Fallback Cover if no image is present
            <Flex
              direction="column"
              justify="center"
              align="center"
              height="100%"
              p={6}
              bg={bgColor}
              color={textColor}
              textAlign="center"
              borderWidth="4px"
              borderColor={borderColor}
              borderStyle="double"
            >
              <Text fontSize="xl" fontWeight="bold" fontFamily="serif" mb={2} lineClamp={3}>
                {item.title}
              </Text>
              {item.item_type === "book" && item.extra_data?.author && (
                <Text fontSize="md" fontStyle="italic">
                  {String(item.extra_data.author)}
                </Text>
              )}
            </Flex>
          )}
        </Card.Root>

        {/* --- BACK FACE (Details) --- */}
        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          backfaceVisibility="hidden"
          transform="rotateY(180deg)"
          onClick={handleFlip}
          overflow="hidden"
          borderRadius="lg"
          boxShadow="md"
          bg={bgColor}
          color={textColor}
          borderColor={borderColor}
        >
          <Card.Body p={4} height="100%" display="flex" flexDirection="column">
            <Flex justify="space-between" align="start" mb={2}>
              <Badge colorPalette="teal" variant="solid" size="sm">
                {String(item.item_type || "General")}
              </Badge>
              {isOwner && (
                // Stop propagation to prevent flip when clicking menu
                <Box onClick={(e) => e.stopPropagation()}>
                  <ItemActionsMenu item={item} />
                </Box>
              )}
            </Flex>

            <VStack align="start" gap={1} mb={3} flex="1">
              <Text fontSize="lg" fontWeight="bold" lineClamp={2}>
                {item.title}
              </Text>
              
              {item.item_type === "book" && item.extra_data?.author && (
                <Text fontSize="sm" fontStyle="italic" color="gray.500" lineClamp={1}>
                  By {String(item.extra_data.author)}
                </Text>
              )}

              <Text fontSize="sm" mt={2} lineClamp={5} color="inherit" opacity={0.9}>
                {item.description || "No description provided."}
              </Text>
            </VStack>

            <Box mt="auto" pt={2} borderTopWidth="1px" borderColor={borderColor}>
              {isOwner && (
                <Badge colorPalette="yellow" variant="subtle" mb={2} width="full" justifyContent="center">
                  You own this
                </Badge>
              )}
              
              <Text fontSize="xs" fontWeight="semibold" mb={1}>
                Owners:
              </Text>
              <HStack gap={1} flexWrap="wrap">
                {item.owners?.map((owner, index, arr) => (
                  <Link
                    key={owner.id}
                    to="/users/$userId"
                    params={{ userId: owner.id }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ textDecoration: "none" }}
                  >
                    <Text
                      fontSize="xs"
                      color="blue.500"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {String(owner.full_name || owner.email)}
                      {index < arr.length - 1 ? "," : ""}
                    </Text>
                  </Link>
                )) || <Text fontSize="xs" color="gray.500">Unknown</Text>}
              </HStack>
              
              {item.item_type === "book" && item.extra_data?.isbn && (
                 <Text fontSize="2xs" color="gray.400" mt={2} fontFamily="mono">
                   ISBN: {String(item.extra_data.isbn)}
                 </Text>
              )}
            </Box>
          </Card.Body>
        </Card.Root>
      </Box>
    </Box>
  )
}

export default ItemCard