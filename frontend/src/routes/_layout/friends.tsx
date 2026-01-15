import {
  Button,
  Container,
  EmptyState,
  Flex,
  Heading,
  Text,
  VStack,
  SimpleGrid,
  Box,
  Separator,
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiUserPlus, FiUsers } from "react-icons/fi"

import { FriendsService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/friends")({
  component: Friends,
})

function Friends() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: friends, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => FriendsService.readFriends({}),
  })

  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: () => FriendsService.readFriendRequests({}),
  })

  const acceptMutation = useMutation({
    mutationFn: (id: string) => FriendsService.acceptFriendRequest({ friendId: id }),
    onSuccess: () => {
      showSuccessToast("Friend request accepted!")
      queryClient.invalidateQueries({ queryKey: ["friends"] })
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] })
    },
    onError: () => {
      showErrorToast("Failed to accept friend request")
    },
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => FriendsService.removeFriend({ friendId: id }),
    onSuccess: () => {
      showSuccessToast("Friend removed/Request declined")
      queryClient.invalidateQueries({ queryKey: ["friends"] })
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] })
    },
    onError: () => {
      showErrorToast("Failed to remove friend")
    },
  })

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        Friends Management
      </Heading>

      <Box mt={8}>
        <Heading size="md" mb={4}>
          Friend Requests
        </Heading>
        {isLoadingRequests ? (
          <Text>Loading requests...</Text>
        ) : requests?.data.length === 0 ? (
          <Text color="fg.muted">No pending requests</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {requests?.data.map((user) => (
              <Box key={user.id} p={4} borderWidth="1px" rounded="md" bg="bg.panel">
                <Text fontWeight="bold">{user.full_name || user.email}</Text>
                <Flex mt={3} gap={2}>
                  <Button size="sm" onClick={() => acceptMutation.mutate(user.id)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="subtle" colorPalette="red" onClick={() => removeMutation.mutate(user.id)}>
                    Decline
                  </Button>
                </Flex>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>

      <Separator my={8} />

      <Box>
        <Heading size="md" mb={4}>
          My Friends
        </Heading>
        {isLoadingFriends ? (
          <Text>Loading friends...</Text>
        ) : friends?.data.length === 0 ? (
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <FiUsers />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>No friends yet</EmptyState.Title>
                <EmptyState.Description>
                  Join a community to find people!
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
          </EmptyState.Root>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {friends?.data.map((user) => (
              <Box key={user.id} p={4} borderWidth="1px" rounded="md" bg="bg.panel">
                <Text fontWeight="bold">{user.full_name || user.email}</Text>
                <Button mt={3} size="sm" variant="subtle" colorPalette="red" onClick={() => removeMutation.mutate(user.id)}>
                  Remove Friend
                </Button>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Container>
  )
}
