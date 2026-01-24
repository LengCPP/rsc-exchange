import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  IconButton,
  Separator,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { FiChevronLeft, FiPlus, FiTrash2 } from "react-icons/fi"

import { CollectionsService, ItemsService } from "@/client"
import ItemCard from "@/components/Items/ItemCard"
import { useColorModeValue } from "@/components/ui/color-mode"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

export const Route = createFileRoute("/_layout/collections/$collectionId")({
  component: CollectionDetail,
})

function CollectionDetail() {
  const { collectionId } = Route.useParams()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const bgColor = useColorModeValue("orange.50", "gray.800")
  const borderColor = useColorModeValue("orange.200", "gray.600")

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collections", collectionId],
    queryFn: () => CollectionsService.readCollection({ id: collectionId }),
  })

  // Get user's items to allow adding them if owner
  const { data: userItemsData } = useQuery({
    queryKey: ["items", "me", { excludeCollections: true }],
    queryFn: () =>
      ItemsService.readItems({ limit: 100, excludeCollections: true }),
    enabled: !!user && collection?.owner_id === user.id,
  })

  const addMutation = useMutation({
    mutationFn: (itemId: string) =>
      CollectionsService.addItemToCollection({ id: collectionId, itemId }),
    onSuccess: () => {
      showSuccessToast("Item added to collection")
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] })
    },
    onError: handleError,
  })

  const removeMutation = useMutation({
    mutationFn: (itemId: string) =>
      CollectionsService.removeItemFromCollection({ id: collectionId, itemId }),
    onSuccess: () => {
      showSuccessToast("Item removed from collection")
      queryClient.invalidateQueries({ queryKey: ["collections", collectionId] })
    },
    onError: handleError,
  })

  if (isLoading) {
    return (
      <Container maxW="full" pt={12}>
        <Skeleton height="40px" width="300px" mb={4} />
        <Skeleton height="20px" width="500px" mb={8} />
        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={6}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="300px" />
          ))}
        </Grid>
      </Container>
    )
  }

  if (!collection) {
    return <Text>Collection not found</Text>
  }

  const isOwner = user?.id === collection.owner_id

  // Filter out items already in collection
  const availableItems =
    userItemsData?.data.filter(
      (item) => !collection.items?.some((ci) => ci.id === item.id),
    ) || []

  return (
    <Container maxW="full" pt={12} pb={20}>
      <VStack align="start" gap={6} width="full">
        <HStack width="full" justify="space-between">
          <HStack gap={4}>
            <IconButton asChild variant="ghost" colorPalette="orange">
              <Link
                to={isOwner ? "/items" : "/users/$userId"}
                params={isOwner ? {} : { userId: collection.owner_id }}
              >
                <FiChevronLeft />
              </Link>
            </IconButton>
            <VStack align="start" gap={0}>
              <Heading size="2xl">{collection.title}</Heading>
              <Text color="gray.500">
                {collection.description || "No description provided."}
              </Text>
            </VStack>
          </HStack>

          {isOwner && (
            <Badge colorPalette="orange" size="lg" variant="solid">
              Owner View
            </Badge>
          )}
        </HStack>

        <Separator borderColor={borderColor} />

        <Grid
          templateColumns={{
            base: "1fr",
            lg: isOwner ? "3fr 1fr" : "1fr",
          }}
          gap={8}
          width="full"
        >
          {/* Items Grid */}
          <Box>
            <Heading size="md" mb={4}>
              Items in this{" "}
              {collection.collection_type === "library"
                ? "Library"
                : "Collection"}
            </Heading>
            {!collection.items || collection.items.length === 0 ? (
              <Flex
                direction="column"
                align="center"
                justify="center"
                p={10}
                bg={bgColor}
                borderRadius="lg"
                border="2px dashed"
                borderColor={borderColor}
              >
                <Text color="gray.500">No items in this collection yet.</Text>
              </Flex>
            ) : (
              <Grid
                templateColumns={{
                  base: "repeat(1, 1fr)",
                  sm: "repeat(2, 1fr)",
                  md: "repeat(3, 1fr)",
                  xl: "repeat(4, 1fr)",
                }}
                gap={6}
              >
                {collection.items.map((item) => (
                  <Box key={item.id} position="relative">
                    <ItemCard item={item} />
                    {isOwner && (
                      <IconButton
                        aria-label="Remove from collection"
                        position="absolute"
                        top={2}
                        right={2}
                        size="xs"
                        colorPalette="red"
                        variant="solid"
                        onClick={() => removeMutation.mutate(item.id)}
                        zIndex={10}
                      >
                        <FiTrash2 />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Grid>
            )}
          </Box>

          {/* Sidebar for Owner to add items */}
          {isOwner && (
            <Box
              p={4}
              bg={bgColor}
              borderRadius="lg"
              border="1px solid"
              borderColor={borderColor}
              height="fit-content"
            >
              <Heading size="sm" mb={4}>
                Add your items
              </Heading>
              <VStack align="stretch" gap={3}>
                {availableItems.length === 0 ? (
                  <Text fontSize="xs" color="gray.500">
                    All your items are already in this collection.
                  </Text>
                ) : (
                  availableItems.map((item) => (
                    <Flex
                      key={item.id}
                      justify="space-between"
                      align="center"
                      p={2}
                      bg="whiteAlpha.500"
                      borderRadius="md"
                      _dark={{ bg: "whiteAlpha.100" }}
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="bold"
                        lineClamp={1}
                        flex={1}
                        mr={2}
                      >
                        {item.title}
                      </Text>
                      <IconButton
                        aria-label="Add to collection"
                        size="xs"
                        colorPalette="orange"
                        onClick={() => addMutation.mutate(item.id)}
                        loading={
                          addMutation.isPending &&
                          addMutation.variables === item.id
                        }
                      >
                        <FiPlus />
                      </IconButton>
                    </Flex>
                  ))
                )}
              </VStack>
            </Box>
          )}
        </Grid>
      </VStack>
    </Container>
  )
}
