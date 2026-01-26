import {
  Box,
  Container,
  EmptyState,
  Flex,
  Grid,
  HStack,
  Heading,
  VStack,
  Text,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type React from "react"
import { FiSearch } from "react-icons/fi"
import { z } from "zod"

import { CollectionsService, ItemsService } from "@/client"
import AddCollection from "@/components/Collections/AddCollection"
import CollectionCard from "@/components/Collections/CollectionCard"
import AddItem, { BOOK_CLASSIFICATION } from "@/components/Items/AddItem"
import ItemCard from "@/components/Items/ItemCard"
import PendingItems from "@/components/Pending/PendingItems"
import { useColorModeValue } from "@/components/ui/color-mode"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import useAuth from "@/hooks/useAuth"

const itemsSearchSchema = z.object({
  page: z.number().catch(1),
  sort_by: z.string().catch("created_at"),
  sort_order: z.string().catch("desc"),
  limit: z.number().catch(8),
  category: z.string().optional(),
  genre: z.string().optional(),
})

function getItemsQueryOptions({
  page,
  sort_by,
  sort_order,
  limit,
  ownerId,
  category,
  genre,
}: {
  page: number
  sort_by: string
  sort_order: string
  limit: number
  ownerId?: string
  category?: string
  genre?: string
}) {
  return {
    queryFn: () =>
      ItemsService.readItems({
        skip: (page - 1) * limit,
        limit: limit,
        sortBy: sort_by,
        sortOrder: sort_order,
        excludeCollections: true,
        ownerId: ownerId,
        category: category,
        genre: genre,
      }),
    queryKey: [
      "items",
      {
        page,
        sort_by,
        sort_order,
        limit,
        excludeCollections: true,
        ownerId,
        category,
        genre,
      },
    ],
  }
}

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  validateSearch: (search) => itemsSearchSchema.parse(search),
})

function CollectionsTable() {
  const { data, isLoading } = useQuery({
    queryKey: ["collections"],
    queryFn: () => CollectionsService.readCollections({}),
  })

  if (isLoading) return <PendingItems />

  const collections = data?.data ?? []

  if (collections.length === 0) return null

  return (
    <Box mt={8}>
      <Heading size="md" mb={4}>
        My Collections & Libraries
      </Heading>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        }}
        gap={6}
      >
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} />
        ))}
      </Grid>
    </Box>
  )
}

function SortingControls() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { sort_by, sort_order, limit, category, genre } = Route.useSearch()

  const handleSortByChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev: any) => ({ ...prev, sort_by: e.target.value, page: 1 }),
    })
  }

  const handleSortOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev: any) => ({ ...prev, sort_order: e.target.value, page: 1 }),
    })
  }

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        limit: Number(e.target.value),
        page: 1,
      }),
    })
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        category: e.target.value || undefined,
        genre: undefined, // Reset genre when category changes
        page: 1,
      }),
    })
  }

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      search: (prev: any) => ({
        ...prev,
        genre: e.target.value || undefined,
        page: 1,
      }),
    })
  }

  const selectBg = useColorModeValue("white", "gray.800")
  const selectColor = useColorModeValue("black", "white")
  const selectBorder = useColorModeValue("gray.300", "gray.600")

  const selectStyle = {
    padding: "8px",
    borderRadius: "4px",
    border: `1px solid ${selectBorder}`,
    backgroundColor: selectBg,
    color: selectColor,
    fontSize: "14px",
  }

  return (
    <Flex gap={2} align="center" wrap="wrap">
      <select
        value={category || ""}
        onChange={handleCategoryChange}
        style={selectStyle}
      >
        <option value="" style={{ backgroundColor: selectBg }}>
          All Categories
        </option>
        {Object.keys(BOOK_CLASSIFICATION).map((cat) => (
          <option key={cat} value={cat} style={{ backgroundColor: selectBg }}>
            {cat}
          </option>
        ))}
      </select>

      <select
        value={genre || ""}
        onChange={handleGenreChange}
        style={selectStyle}
        disabled={!category}
      >
        <option value="" style={{ backgroundColor: selectBg }}>
          All Genres
        </option>
        {category &&
          BOOK_CLASSIFICATION[category]?.map((gen) => (
            <option key={gen} value={gen} style={{ backgroundColor: selectBg }}>
              {gen}
            </option>
          ))}
      </select>

      <select value={sort_by} onChange={handleSortByChange} style={selectStyle}>
        <option value="created_at" style={{ backgroundColor: selectBg }}>
          Date Created
        </option>
        <option value="title" style={{ backgroundColor: selectBg }}>
          Name
        </option>
      </select>
      <select
        value={sort_order}
        onChange={handleSortOrderChange}
        style={selectStyle}
      >
        <option value="desc" style={{ backgroundColor: selectBg }}>
          Descending
        </option>
        <option value="asc" style={{ backgroundColor: selectBg }}>
          Ascending
        </option>
      </select>
      <select value={limit} onChange={handleLimitChange} style={selectStyle}>
        <option value={4} style={{ backgroundColor: selectBg }}>
          4 per page
        </option>
        <option value={8} style={{ backgroundColor: selectBg }}>
          8 per page
        </option>
        <option value={12} style={{ backgroundColor: selectBg }}>
          12 per page
        </option>
        <option value={10000} style={{ backgroundColor: selectBg }}>
          All
        </option>
      </select>
    </Flex>
  )
}

function ItemsTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, sort_by, sort_order, limit, category, genre } =
    Route.useSearch()
  const { user } = useAuth()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getItemsQueryOptions({
      page,
      sort_by,
      sort_order,
      limit,
      ownerId: user?.id,
      category,
      genre,
    }),
    placeholderData: (prevData) => prevData,
    enabled: !!user,
  })

  // Check if user has ANY items at all (ignoring collection filtering)
  // to decide whether to show the "No items" empty state.
  const { data: allItemsCheck } = useQuery({
    queryKey: ["hasAnyItems", user?.id],
    queryFn: () => ItemsService.readItems({ limit: 1, ownerId: user?.id }),
    enabled: !!user,
  })

  const setPage = (page: number) =>
    navigate({
      search: (prev: any) => ({ ...prev, page }),
    })

  const items = data?.data ?? []
  const count = data?.count ?? 0
  const hasAnyItems = (allItemsCheck?.count ?? 0) > 0

  if (isLoading) {
    return <PendingItems />
  }

  if (items.length === 0 && page === 1) {
    // If we have no visible items, but we DO have items (hidden in collections or filtered out),
    // we should NOT show the empty state.
    if (hasAnyItems) {
      return (
        <Box mt={8}>
          <Heading size="md" mb={4}>
            My Items
          </Heading>
          <Text color="gray.500">No items match your filters.</Text>
        </Box>
      )
    }

    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <FiSearch />
          </EmptyState.Indicator>
          <VStack textAlign="center">
            <EmptyState.Title>You don't have any items yet</EmptyState.Title>
            <EmptyState.Description>
              Add a new item to get started
            </EmptyState.Description>
          </VStack>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  return (
    <Box mt={8}>
      <Heading size="md" mb={4}>
        My Items
      </Heading>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        }}
        gap={6}
        opacity={isPlaceholderData ? 0.5 : 1}
      >
        {items?.map((item) => (
          <ItemCard key={item.id} item={item} displayOwnerId={user?.id} />
        ))}
      </Grid>
      <Flex justifyContent="center" mt={8}>
        <PaginationRoot
          count={count}
          pageSize={limit}
          onPageChange={({ page }) => setPage(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </Box>
  )
}

function Items() {
  return (
    <Container maxW="full">
      <VStack pt={12} align="start" gap={6}>
        <Flex
          justify="space-between"
          align="center"
          width="full"
          wrap="wrap"
          gap={4}
        >
          <Heading size="lg">Items Management</Heading>
          <SortingControls />
        </Flex>
        <HStack gap={4}>
          <AddCollection />
          <AddItem />
        </HStack>
      </VStack>
      <CollectionsTable />
      <ItemsTable />
    </Container>
  )
}