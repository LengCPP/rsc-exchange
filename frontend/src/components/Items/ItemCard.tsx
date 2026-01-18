import type { ItemPublic } from "@/client"
import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
import { ItemType } from "@/customTypes"
import useAuth from "@/hooks/useAuth"
import { Badge, Box, Card, Flex, Image, Text } from "@chakra-ui/react"
import { useState } from "react"

interface ItemCardProps {
  item: ItemPublic
}

const ItemCard = ({ item }: ItemCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const { user } = useAuth()

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const ownersList =
    item.owners?.map((o) => o.full_name || o.email).join(", ") || "Unknown"
  const isOwner = item.owners?.some((o) => o.id === user?.id)

  return (
    <Box
      style={{ perspective: "1000px" }}
      width="100%"
      height="300px"
      cursor="pointer"
    >
      <Box
        position="relative"
        width="100%"
        height="100%"
        transition="transform 0.6s"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          style={{
            backfaceVisibility: "hidden",
          }}
          onClick={handleFlip}
          overflow="hidden"
        >
          {item.image_url && (
            <Image
              src={item.image_url}
              alt={item.title}
              objectFit="cover"
              height="120px"
              width="100%"
            />
          )}
          <Card.Body p={4}>
            <Flex justify="space-between" align="center" mb={2}>
              <Card.Title fontSize="lg" fontWeight="bold" lineClamp={1}>
                {item.title}
              </Card.Title>
              {item.count > 1 && (
                <Badge colorPalette="teal" variant="solid">
                  x{item.count}
                </Badge>
              )}
            </Flex>

            <Badge size="xs" colorPalette="blue" mb={2}>
              {item.item_type}
            </Badge>

            {item.item_type === ItemType.BOOK && item.extra_data?.author && (
              <Text fontSize="sm" fontStyle="italic" color="gray.600" mb={2}>
                By {item.extra_data.author}
              </Text>
            )}

            <Text color="gray.500" fontSize="xs" mt="auto">
              Click to see details
            </Text>
            {isOwner && (
              <Badge colorPalette="green" variant="subtle" mt={1}>
                You own this
              </Badge>
            )}
          </Card.Body>
        </Card.Root>

        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
          onClick={handleFlip}
        >
          <Card.Body p={4}>
            <Box position="absolute" top={2} right={2}>
              {isOwner && <ItemActionsMenu item={item} />}
            </Box>
            <Card.Title mb={2} fontSize="md" fontWeight="semibold">
              Description
            </Card.Title>
            <Text
              fontSize="sm"
              color={!item.description ? "gray.500" : "inherit"}
              mb={2}
              lineClamp={4}
            >
              {item.description || "No description provided"}
            </Text>

            {item.item_type === ItemType.BOOK && item.extra_data?.isbn && (
              <Text fontSize="xs" color="gray.600" mb={1}>
                ISBN: {item.extra_data.isbn}
              </Text>
            )}

            <Box mt="auto">
              <Text fontSize="xs" fontWeight="bold" color="gray.600">
                Owners:
              </Text>
              <Text
                fontSize="xs"
                color="gray.500"
                lineClamp={1}
                title={ownersList}
              >
                {ownersList}
              </Text>
            </Box>

            <Text fontSize="2xs" color="gray.400" fontFamily="mono" mt={1}>
              ID: {item.id.slice(0, 8)}...
            </Text>
          </Card.Body>
        </Card.Root>
      </Box>
    </Box>
  )
}

export default ItemCard
