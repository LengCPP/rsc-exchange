import type { ItemPublic } from "@/client"
import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
import { Box, Card, Text } from "@chakra-ui/react"
import { useState } from "react"

interface ItemCardProps {
  item: ItemPublic
}

const ItemCard = ({ item }: ItemCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

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
            <Card.Title mb={4} fontSize="xl" fontWeight="bold">
              {item.title}
            </Card.Title>
            <Text color="gray.500" fontSize="sm" mb={2}>
              Click to see details
            </Text>
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
              <ItemActionsMenu item={item} />
            </Box>
            <Card.Title mb={3} fontSize="lg" fontWeight="semibold">
              Description
            </Card.Title>
            <Text
              fontSize="md"
              color={!item.description ? "gray.500" : "inherit"}
              mb={4}
            >
              {item.description || "No description provided"}
            </Text>
            <Text fontSize="xs" color="gray.500" fontFamily="mono">
              ID: {item.id.slice(0, 8)}...
            </Text>
          </Card.Body>
        </Card.Root>
      </Box>
    </Box>
  )
}

export default ItemCard
