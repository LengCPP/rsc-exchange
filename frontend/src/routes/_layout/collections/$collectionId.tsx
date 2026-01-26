import {
  Badge,
  Box,
  Container,
  Flex,
  Grid,
  HStack,
  Heading,
  IconButton,
  Select,
  Separator,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { FiChevronLeft, FiPlus, FiTrash2 } from "react-icons/fi"

import { CollectionsService, ItemsService } from "@/client"
import AddItem from "@/components/Items/AddItem"
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

  const [categoryFilter, setCategoryFilter] = useState("")
  const [genreFilter, setGenreFilter] = useState("")

  const bgColor = useColorModeValue("orange.50", "gray.800")
  const borderColor = useColorModeValue("orange.200", "gray.600")
  const selectBg = useColorModeValue("white", "gray.800")
  const selectColor = useColorModeValue("black", "white")
  const selectBorder = useColorModeValue("gray.300", "gray.600")

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

  // Derive filters and filtered items
  const { filteredItems, categories, genres } = useMemo(() => {
    if (!collection?.items) {
      return { filteredItems: [], categories: [], genres: [] }
    }

    const cats = new Set<string>()
    const gens = new Set<string>()

    const filtered = collection.items.filter((item) => {
      let itemCategory = ""
      let itemGenre = ""

      if (item.extra_data) {
        try {
          // extra_data might be a string or object depending on how it's returned
          const extra =
            typeof item.extra_data === "string"
              ? JSON.parse(item.extra_data)
              : item.extra_data
          itemCategory = extra.category || ""
          itemGenre = extra.genre || ""
        } catch (e) {
          // ignore parsing error
        }
      }

      if (itemCategory) cats.add(itemCategory)
      if (itemGenre) gens.add(itemGenre)

      const matchCategory = categoryFilter
        ? itemCategory === categoryFilter
        : true
      const matchGenre = genreFilter ? itemGenre === genreFilter : true

      return matchCategory && matchGenre
    })

    return {
      filteredItems: filtered,
      categories: Array.from(cats).sort(),
      genres: Array.from(gens).sort(),
    }
  }, [collection?.items, categoryFilter, genreFilter])

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

  const selectStyle = {
    padding: "8px",
    borderRadius: "4px",
    border: `1px solid ${selectBorder}`,
    backgroundColor: selectBg,
    color: selectColor,
    fontSize: "14px",
    minWidth: "150px",
  }

  return (
    <Container maxW="full" pt={12} pb={20}>
      <VStack align="start" gap={6} width="full">
        <HStack width="full" justify="space-between" wrap="wrap" gap={4}>
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

        <Flex
          width="full"
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={4}
        >
          <HStack gap={2}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="" style={{ backgroundColor: selectBg }}>
                All Categories
              </option>
              {categories.map((cat) => (
                <option
                  key={cat}
                  value={cat}
                  style={{ backgroundColor: selectBg }}
                >
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="" style={{ backgroundColor: selectBg }}>
                All Genres
              </option>
              {genres.map((gen) => (
                <option
                  key={gen}
                  value={gen}
                  style={{ backgroundColor: selectBg }}
                >
                  {gen}
                </option>
              ))}
            </select>
          </HStack>

          {isOwner && <AddItem collectionId={collection.id} />}
        </Flex>

        {isOwner && (
          <Box
            width="full"
            p={4}
            bg={bgColor}
            borderRadius="lg"
            border="1px solid"
            borderColor={borderColor}
          >
            <Heading size="sm" mb={4}>
              New Item
            </Heading>
            <Flex wrap="wrap" gap={2}>
              {availableItems.length === 0 ? (
                <Text fontSize="sm" color="gray.500">
                  All your existing items are already in this collection. Use "Add
                  Item" to create new ones.
                </Text>
              ) : (
                availableItems.map((item) => (
                  <Flex
                    key={item.id}
                    align="center"
                    p={2}
                    bg="whiteAlpha.500"
                    borderRadius="md"
                    border="1px solid"
                    borderColor={borderColor}
                    _dark={{ bg: "whiteAlpha.100" }}
                  >
                    <Text fontSize="xs" fontWeight="bold" mr={2}>
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
            </Flex>
          </Box>
        )}

        <Separator borderColor={borderColor} />

        <Box width="full">
          <Heading size="md" mb={4}>
            Items in this{" "}
            {collection.collection_type === "library"
              ? "Library"
              : "Collection"}
          </Heading>
          {!filteredItems || filteredItems.length === 0 ? (
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
              <Text color="gray.500">
                {collection.items?.length === 0
                  ? "No items in this collection yet."
                  : "No items match your filters."}
              </Text>
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
              {filteredItems.map((item) => (
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
      </VStack>
    </Container>
  )
}