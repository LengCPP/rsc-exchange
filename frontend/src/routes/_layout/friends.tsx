import {
  Box,
  Button,
  Container,
  EmptyState,
  Flex,
  Heading,
  Input,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { FiUsers, FiSearch, FiPlus } from "react-icons/fi"
import { useState } from "react"

import { FriendsService, OpenAPI } from "@/client"
import { request as apiRequest } from "@/client/core/request"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { formatPublicId } from "@/utils"

export const Route = createFileRoute("/_layout/friends")({
  component: Friends,
})

function Friends() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchId, setSearchId] = useState("")
  const [foundUser, setFoundUser] = useState<any>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchUser = async () => {
    if (!searchId) return
    setIsSearching(true)
    try {
      const user = await apiRequest(OpenAPI, {
        method: "GET",
        url: "/api/v1/friends/search-user",
        query: { public_id: searchId },
      })
      setFoundUser(user)
    } catch (err) {
      showErrorToast("User not found or error searching")
      setFoundUser(null)
    } finally {
      setIsSearching(false)
    }
  }

  const requestMutation = useMutation({
    mutationFn: (id: string) =>
      FriendsService.createFriendRequest({ friendId: id }),
    onSuccess: () => {
      showSuccessToast("Friend request sent!")
      setFoundUser(null)
      setSearchId("")
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] })
    },
    onError: () => {
      showErrorToast("Failed to send friend request")
    },
  })

  const { data: friends, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => FriendsService.readFriends({}),
  })

  const { data: requests, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: () => FriendsService.readFriendRequests({}),
  })

  const acceptMutation = useMutation({
    mutationFn: (id: string) =>
      FriendsService.acceptFriendRequest({ friendId: id }),
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

      <Box mt={8} p={6} borderWidth="1px" rounded="lg" bg="bg.panel">
        <Heading size="md" mb={4}>
          Add Friend
        </Heading>
        <VStack align="start" gap={4}>
          <Text fontSize="sm" color="fg.muted">
            Search for people using their unique User ID.
          </Text>
          <Flex gap={2} w="full" maxW="400px">
            <Input
              placeholder="e.g. u-1234abcd"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <Button
              onClick={handleSearchUser}
              loading={isSearching}
              variant={"primary" as any}
            >
              <FiSearch />
            </Button>
          </Flex>

          {foundUser && (
            <Box
              p={4}
              w="full"
              maxW="400px"
              borderWidth="1px"
              rounded="md"
              bg="bg.muted"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontWeight="bold">
                    {foundUser.full_name || "Anonymous"}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    ID: {formatPublicId(foundUser.public_id)}
                  </Text>
                </Box>
                {foundUser.friendship_status ? (
                  <Text fontSize="xs" color="teal.500" fontWeight="bold">
                    {foundUser.friendship_status === "accepted"
                      ? "Already Friends"
                      : "Request Pending"}
                  </Text>
                ) : (
                  <Button
                    size="xs"
                    onClick={() => requestMutation.mutate(foundUser.id)}
                    loading={requestMutation.isPending}
                  >
                    <FiPlus /> Add
                  </Button>
                )}
              </Flex>
            </Box>
          )}
        </VStack>
      </Box>

      <Box mt={12}>
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
              <Box
                key={user.id}
                p={4}
                borderWidth="1px"
                rounded="md"
                bg="bg.panel"
              >
                <Text fontWeight="bold">{user.full_name || user.email}</Text>
                <Flex mt={3} gap={2}>
                  <Button
                    size="sm"
                    variant={"primary" as any}
                    onClick={() => acceptMutation.mutate(user.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant={"dangerSecondary" as any}
                    onClick={() => removeMutation.mutate(user.id)}
                  >
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
              <Box
                key={user.id}
                p={4}
                borderWidth="1px"
                rounded="md"
                bg="bg.panel"
              >
                <Link
                  to={user.id === currentUser?.id ? "/profile" : "/users/$userId"}
                  params={user.id === currentUser?.id ? {} : { userId: user.id }}
                >
                  <Text
                    fontWeight="bold"
                    _hover={{ textDecoration: "underline", color: "teal.500" }}
                  >
                    {user.full_name || user.email}
                  </Text>
                </Link>
                <Button
                  mt={3}
                  size="sm"
                  variant={"dangerSecondary" as any}
                  onClick={() => removeMutation.mutate(user.id)}
                >
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
