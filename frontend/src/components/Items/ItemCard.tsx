import type { ItemPublic } from "@/client"
import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
import useAuth from "@/hooks/useAuth"
import { Badge, Box, Card, Flex, Text } from "@chakra-ui/react"
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

  const ownersList = item.owners?.map(o => o.full_name || o.email).join(", ") || "Unknown"
  const isOwner = item.owners?.some(o => o.id === user?.id)

  return (
    <Box
      style={{ perspective: "1000px" }}
      width="100%"
      height="250px"
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
        {/* Front of card */}
        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          style={{
            backfaceVisibility: "hidden",
          }}
          onClick={handleFlip}
        >
          <Card.Body p={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <Card.Title fontSize="xl" fontWeight="bold">
                {item.title}
              </Card.Title>
              {item.count > 1 && (
                <Badge colorPalette="teal" variant="solid">
                   x{item.count}
                </Badge>
              )}
            </Flex>
            
            <Text color="gray.500" fontSize="sm" mb={2}>
              Click to see details
            </Text>
            {isOwner && (
                <Badge colorPalette="green" variant="subtle" mt={2}>
                    You own this
                </Badge>
            )}
          </Card.Body>
        </Card.Root>

        {/* Back of card */}
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
          <Card.Body p={6}>
            <Box position="absolute" top={2} right={2}>
              {/* Only show actions if user is an owner */}
              {isOwner && <ItemActionsMenu item={item} />}
            </Box>
            <Card.Title mb={3} fontSize="lg" fontWeight="semibold">
              Description
            </Card.Title>
            <Text
              fontSize="md"
              color={!item.description ? "gray.500" : "inherit"}
              mb={2}
              lineClamp={3}
            >
              {item.description || "No description provided"}
            </Text>
            
            <Box mt={2}>
                <Text fontSize="xs" fontWeight="bold" color="gray.600">Owners:</Text>
                <Text fontSize="xs" color="gray.500" lineClamp={2} title={ownersList}>
                    {ownersList}
                </Text>
            </Box>

            <Text fontSize="xs" color="gray.400" fontFamily="mono" mt={2}>
              ID: {item.id.slice(0, 8)}...
            </Text>
          </Card.Body>
        </Card.Root>
      </Box>
    </Box>
  )
}

export default ItemCard
