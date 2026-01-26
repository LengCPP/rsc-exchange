import {
  Box,
  Button,
  Container,
  EmptyState,
  Flex,
  Grid,
  HStack,
  Heading,
  Popover,
  Portal,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type React from "react"
import { FaFilter, FaSortAmountDown } from "react-icons/fa"
import { FiSearch } from "react-icons/fi"
import { z } from "zod"

import { CollectionsService, ItemsService } from "@/client"
import AddCollection from "@/components/Collections/AddCollection"
import CollectionCard from "@/components/Collections/CollectionCard"
import AddItem from "@/components/Items/AddItem"
import ItemCard from "@/components/Items/ItemCard"
import PendingItems from "@/components/Pending/PendingItems"
import {
  MenuContent,
  MenuItemGroup,
  MenuRadioItem,
  MenuRadioItemGroup,
  MenuRoot,
  MenuTrigger,
} from "@/components/ui/menu"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination"
import useAuth from "@/hooks/useAuth"
import { useColorModeValue } from "@/components/ui/color-mode"
import { BOOK_CLASSIFICATION } from "@/constants"

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

  const updateSearch = (newParams: any) => {
    navigate({
      search: (prev: any) => ({ ...prev, ...newParams, page: 1 }),
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
    width: "100%",
  }

  return (
    <Flex gap={2} align="center" wrap="wrap">
      {/* Filter Button */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            colorPalette={category || genre ? "orange" : "gray"}
          >
            <FaFilter /> Filter
          </Button>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content width="300px">
              <Popover.Arrow />
              <Popover.Body>
                <VStack gap={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={1}>
                      Category
                    </Text>
                    <select
                      value={category || ""}
                      onChange={(e) =>
                        updateSearch({
                          category: e.target.value || undefined,
                          genre: undefined,
                        })
                      }
                      style={selectStyle}
                    >
                      <option value="" style={{ backgroundColor: selectBg }}>
                        All Categories
                      </option>
                      {Object.keys(BOOK_CLASSIFICATION).map((cat) => (
                        <option
                          key={cat}
                          value={cat}
                          style={{ backgroundColor: selectBg }}
                        >
                          {cat}
                        </option>
                      ))}
                    </select>
                  </Box>
                  <Box>
                    <Text fontSize="sm" fontWeight="bold" mb={1}>
                      Genre
                    </Text>
                    <select
                      value={genre || ""}
                      onChange={(e) =>
                        updateSearch({ genre: e.target.value || undefined })
                      }
                      style={selectStyle}
                      disabled={!category}
                    >
                      <option value="" style={{ backgroundColor: selectBg }}>
                        All Genres
                      </option>
                      {category &&
                        BOOK_CLASSIFICATION[category]?.map((gen) => (
                          <option
                            key={gen}
                            value={gen}
                            style={{ backgroundColor: selectBg }}
                          >
                            {gen}
                          </option>
                        ))}
                    </select>
                  </Box>
                  {(category || genre) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        updateSearch({ category: undefined, genre: undefined })
                      }
                    >
                      Clear Filters
                    </Button>
                  )}
                </VStack>
              </Popover.Body>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>

      {/* Sort Button */}
      <MenuRoot>
        <MenuTrigger asChild>
          <Button variant="outline" size="sm">
            <FaSortAmountDown /> Sort
          </Button>
        </MenuTrigger>
        <MenuContent>
          <MenuItemGroup title="Sort By">
            <MenuRadioItemGroup
              value={sort_by}
              onValueChange={(e) => updateSearch({ sort_by: e.value })}
            >
              <MenuRadioItem value="created_at">Date Created</MenuRadioItem>
              <MenuRadioItem value="title">Name</MenuRadioItem>
            </MenuRadioItemGroup>
          </MenuItemGroup>
          <MenuItemGroup title="Order">
            <MenuRadioItemGroup
              value={sort_order}
              onValueChange={(e) => updateSearch({ sort_order: e.value })}
            >
              <MenuRadioItem value="desc">Descending</MenuRadioItem>
              <MenuRadioItem value="asc">Ascending</MenuRadioItem>
            </MenuRadioItemGroup>
          </MenuItemGroup>
          <MenuItemGroup title="Items per page">
            <MenuRadioItemGroup
              value={String(limit)}
              onValueChange={(e) => updateSearch({ limit: Number(e.value) })}
            >
              <MenuRadioItem value="4">4</MenuRadioItem>
              <MenuRadioItem value="8">8</MenuRadioItem>
              <MenuRadioItem value="12">12</MenuRadioItem>
              <MenuRadioItem value="10000">All</MenuRadioItem>
            </MenuRadioItemGroup>
          </MenuItemGroup>
        </MenuContent>
      </MenuRoot>
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