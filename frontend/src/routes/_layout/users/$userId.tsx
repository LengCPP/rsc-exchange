import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiUserCheck, FiUserPlus } from "react-icons/fi"

import { FriendsService, ItemsService, UsersService } from "@/client"
import ItemCard from "@/components/Items/ItemCard"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/users/$userId")({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { userId } = Route.useParams()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => UsersService.readUserById({ userId }),
  })

  const isFriend = user?.friendship_status === "accepted"

  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ["items", userId],
    queryFn: () => ItemsService.readItems({ ownerId: userId }),
    enabled: isFriend,
  })

  const friendMutation = useMutation({
    mutationFn: (userId: string) =>
      FriendsService.createFriendRequest({ friendId: userId }),
    onSuccess: () => {
      showSuccessToast("Friend request sent!")
      queryClient.invalidateQueries({ queryKey: ["user", userId] })
    },
    onError: () => showErrorToast("Failed to send friend request"),
  })

  const userItems = items?.data || []

  if (isLoadingUser) return <Text p={4}>Loading profile...</Text>
  if (!user) return <Text p={4}>User not found</Text>

  return (
    <Container maxW="full" py={8}>
      <VStack align="start" gap={4} mb={8}>
        <Flex justify="space-between" align="center" w="full">
          <VStack align="start" gap={1}>
            <Heading size="xl">{user.full_name || "User"}</Heading>
            <Text color="gray.500">{user.email}</Text>
          </VStack>
          
          <Button
            onClick={() => {
              if (!user.friendship_status) {
                friendMutation.mutate(user.id)
              }
            }}
            colorPalette={
              user.friendship_status === "pending"
                ? "orange"
                : user.friendship_status === "accepted"
                  ? "green"
                  : "blue"
            }
            variant={user.friendship_status ? "outline" : "solid"}
            disabled={!!user.friendship_status}
            loading={friendMutation.isPending}
          >
            {user.friendship_status === "pending" ? (
              <>
                <FiUserPlus /> Request Pending
              </>
            ) : user.friendship_status === "accepted" ? (
              <>
                <FiUserCheck /> Friends
              </>
            ) : (
              <>
                <FiUserPlus /> Add Friend
              </>
            )}
          </Button>
        </Flex>

        {user.profile?.bio && (
          <Box p={4} borderWidth="1px" borderRadius="md" w="full" bg="bg.panel">
            <Text fontStyle="italic">"{user.profile.bio}"</Text>
          </Box>
        )}

        {!isFriend && (
          <Badge colorPalette="orange" variant="subtle" p={2} rounded="md">
            You must be friends to see more details and items.
          </Badge>
        )}
      </VStack>

      <Heading size="lg" mb={4}>
        Items Owned
      </Heading>
      {!isFriend ? (
        <Text color="gray.500">Items are hidden. Send a friend request to see them!</Text>
      ) : isLoadingItems ? (
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
