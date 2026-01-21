import {
  Container,
  EmptyState,
  Flex,
  Grid,
  Heading,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { FiSearch } from "react-icons/fi"
import { z } from "zod"

import { ItemsService } from "@/client"
import AddItem from "@/components/Items/AddItem"
import ItemCard from "@/components/Items/ItemCard"
import PendingItems from "@/components/Pending/PendingItems"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"

const itemsSearchSchema = z.object({
  page: z.number().catch(1),
  sort_by: z.string().catch("created_at"),
  sort_order: z.string().catch("desc"),
})

const PER_PAGE = 5

function getItemsQueryOptions({ 
  page, 
  sort_by, 
  sort_order 
}: { 
  page: number, 
  sort_by: string, 
  sort_order: string 
}) {
  return {
    queryFn: () =>
      ItemsService.readItems({ 
        skip: (page - 1) * PER_PAGE, 
        limit: PER_PAGE,
        sortBy: sort_by,
        sortOrder: sort_order
      }),
    queryKey: ["items", { page, sort_by, sort_order }],
  }
}

export const Route = createFileRoute("/_layout/items")({
  component: Items,
  validateSearch: (search) => itemsSearchSchema.parse(search),
})

function SortingControls() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { sort_by, sort_order } = Route.useSearch()

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

  const selectStyle = {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc",
    backgroundColor: "transparent",
    fontSize: "14px",
  }

  return (
    <Flex gap={2} align="center">
      <select value={sort_by} onChange={handleSortByChange} style={selectStyle}>
        <option value="created_at">Date Created</option>
        <option value="title">Name</option>
      </select>
      <select value={sort_order} onChange={handleSortOrderChange} style={selectStyle}>
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </select>
    </Flex>
  )
}

function ItemsTable() {
  const navigate = useNavigate({ from: Route.fullPath })
  const { page, sort_by, sort_order } = Route.useSearch()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getItemsQueryOptions({ page, sort_by, sort_order }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) =>
    navigate({
      search: (prev: any) => ({ ...prev, page }),
    })

  const items = data?.data ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingItems />
  }

  if (items.length === 0 && page === 1) {
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
    <>
      <Grid
        templateColumns={{
          base: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
          lg: "repeat(4, 1fr)",
        }}
        gap={6}
        mt={6}
        opacity={isPlaceholderData ? 0.5 : 1}
      >
        {items?.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </Grid>
      <Flex justifyContent="center" mt={8}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          onPageChange={({ page }) => setPage(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  )
}

function Items() {
  return (
    <Container maxW="full">
      <Flex pt={12} justify="space-between" align="center" wrap="wrap" gap={4}>
        <Heading size="lg">Items Management</Heading>
        <Flex gap={4} align="center">
          <SortingControls />
          <AddItem />
        </Flex>
      </Flex>
      <ItemsTable />
    </Container>
  )
}
