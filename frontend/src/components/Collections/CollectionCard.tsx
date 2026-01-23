import type { CollectionPublic } from "@/client"
import { useColorModeValue } from "@/components/ui/color-mode"
import { Badge, Box, Button, Card, Flex, HStack, Image, Text, VStack } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { getImageUrl } from "@/utils"

interface CollectionCardProps {
  collection: CollectionPublic
}

const CollectionCard = ({ collection }: CollectionCardProps) => {
  const bgColor = useColorModeValue("orange.50", "gray.800")
  const borderColor = useColorModeValue("orange.200", "gray.600")
  const textColor = useColorModeValue("gray.800", "gray.100")

  // Show up to 3 book covers as preview
  const previewItems = collection.items?.slice(0, 3) || []

  return (
    <Card.Root
      width="100%"
      variant="outline"
      bg={bgColor}
      borderColor={borderColor}
      overflow="hidden"
      transition="transform 0.2s"
      _hover={{ transform: "translateY(-4px)", boxShadow: "lg" }}
    >
      <Card.Body p={4}>
        <Flex justify="space-between" align="start" mb={4}>
          <VStack align="start" gap={0}>
            <Text fontSize="xl" fontWeight="bold" color={textColor}>
              {collection.title}
            </Text>
            <Badge colorPalette="orange" variant="subtle" size="sm">
              {collection.collection_type === "library" ? "Library" : "Collection"}
            </Badge>
          </VStack>
          <Badge variant="solid" colorPalette="teal">
            {collection.items?.length || 0} Items
          </Badge>
        </Flex>

        {/* Book Preview Section */}
        <Box height="120px" position="relative" mb={4} bg="blackAlpha.100" borderRadius="md" p={2}>
          {previewItems.length > 0 ? (
            <HStack gap={-4} justify="center" height="100%">
              {previewItems.map((item, index) => (
                <Box
                  key={item.id}
                  zIndex={3 - index}
                  transform={`translateX(${index * 10}px) rotate(${index * 5}deg)`}
                  transition="transform 0.2s"
                  _hover={{ transform: `translateX(${index * 10}px) rotate(0deg) scale(1.1)`, zIndex: 10 }}
                >
                  {item.image_url ? (
                    <Image
                      src={getImageUrl(item.image_url)}
                      alt={item.title}
                      height="100px"
                      width="70px"
                      objectFit="cover"
                      borderRadius="sm"
                      boxShadow="md"
                      border="1px solid white"
                    />
                  ) : (
                    <Box
                      height="100px"
                      width="70px"
                      bg="gray.400"
                      borderRadius="sm"
                      boxShadow="md"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      border="1px solid white"
                      p={1}
                    >
                      <Text fontSize="8px" fontWeight="bold" textAlign="center" color="white" lineClamp={3}>
                        {item.title}
                      </Text>
                    </Box>
                  )}
                </Box>
              ))}
            </HStack>
          ) : (
            <Flex height="100%" align="center" justify="center">
              <Text fontSize="sm" color="gray.500" fontStyle="italic">
                Empty {collection.collection_type === "library" ? "library" : "collection"}
              </Text>
            </Flex>
          )}
        </Box>

        <Text fontSize="sm" lineClamp={2} color={textColor} opacity={0.8} mb={4}>
          {collection.description || "No description provided."}
        </Text>

        <Button
          asChild
          variant="solid"
          colorPalette="orange"
          width="full"
          size="sm"
        >
          <Link
            to="/collections/$collectionId"
            params={{ collectionId: collection.id }}
          >
            View {collection.collection_type === "library" ? "Library" : "Collection"}
          </Link>
        </Button>
      </Card.Body>
    </Card.Root>
  )
}

export default CollectionCard
