import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { ItemsService, UsersService } from "@/client"
import ItemCard from "@/components/Items/ItemCard"

export const Route = createFileRoute("/_layout/users/$userId")({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { userId } = Route.useParams()

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => UsersService.readUserById({ userId }),
  })

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["items", userId],
    queryFn: () => ItemsService.readItems({ ownerId: userId }),
  })

  const userItems = items?.data || []

  if (isLoadingUser) return <Text p={4}>Loading profile...</Text>
  if (!user) return <Text p={4}>User not found</Text>

  return (
    <Container maxW="full" py={8}>
      <VStack align="start" gap={4} mb={8}>
        <Heading size="xl">{user.full_name || "User"}</Heading>
        <Text color="gray.500">{user.email}</Text>
        {user.profile?.bio && (
          <Box p={4} borderWidth="1px" borderRadius="md" w="full" bg="bg.panel">
            <Text fontStyle="italic">"{user.profile.bio}"</Text>
          </Box>
        )}
      </VStack>

      <Heading size="lg" mb={4}>
        Items Owned
      </Heading>
      {isLoadingItems ? (
        <Text>Loading items...</Text>
      ) : userItems.length === 0 ? (
        <Text color="gray.500">No items found.</Text>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 4 }} gap={6}>
          {userItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}
