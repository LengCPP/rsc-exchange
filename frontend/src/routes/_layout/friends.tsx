import {
  Badge,
  Box,
  Button,
  Container,
  EmptyState,
  Flex,
  HStack,
  Heading,
  Input,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { FiPlus, FiSend, FiUserPlus, FiUsers } from "react-icons/fi"

import { FriendsService } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { formatPublicId } from "@/utils"

export const Route = createFileRoute("/_layout/friends")({
  component: Friends,
})

function AddFriendModal() {
  const [searchId, setSearchId] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const searchAndRequestMutation = useMutation({
    mutationFn: async (publicId: string) => {
      const user = await FriendsService.searchUserById({ publicId })
      return FriendsService.createFriendRequest({ friendId: user.id })
    },
    onSuccess: () => {
      showSuccessToast("Friend request sent!")
      setSearchId("")
      setIsOpen(false)
      queryClient.invalidateQueries({ queryKey: ["friendRequestsSent"] })
    },
    onError: (err: any) => {
      showErrorToast(err.detail || "User not found or request already exists")
    },
  })

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
      <DialogTrigger asChild>
        <Button variant="solid" colorPalette="orange">
          <FiUserPlus /> Add Friend by ID
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Text fontSize="sm" color="fg.muted">
              Enter the unique User ID (e.g., u-1234abcd) of the person you want
              to add.
            </Text>
            <Field label="User ID">
              <Input
                placeholder="u-xxxxxxx"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                autofocus
              />
            </Field>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            colorPalette="orange"
            loading={searchAndRequestMutation.isPending}
            onClick={() => searchAndRequestMutation.mutate(searchId)}
            disabled={!searchId.trim()}
          >
            Send Request
          </Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

function Friends() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const { data: friends, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: () => FriendsService.readFriends({}),
  })

  const { data: requestsReceived, isLoading: isLoadingRequests } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: () => FriendsService.readFriendRequests({}),
  })

  const { data: requestsSent, isLoading: isLoadingSent } = useQuery({
    queryKey: ["friendRequestsSent"],
    queryFn: () => FriendsService.readSentFriendRequests({}),
  })

  const acceptMutation = useMutation({
    mutationFn: (id: string) =>
      FriendsService.acceptFriendRequest({ friendId: id }),
    onSuccess: () => {
      showSuccessToast("Friend request accepted!")
      queryClient.invalidateQueries({ queryKey: ["friends"] })
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] })
    },
    onError: () => showErrorToast("Failed to accept friend request"),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => FriendsService.removeFriend({ friendId: id }),
    onSuccess: () => {
      showSuccessToast("Friend removed/Request cancelled")
      queryClient.invalidateQueries({ queryKey: ["friends"] })
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] })
      queryClient.invalidateQueries({ queryKey: ["friendRequestsSent"] })
    },
    onError: () => showErrorToast("Operation failed"),
  })

  return (
    <Container maxW="full">
      <Flex justify="space-between" align="center" pt={12} wrap="wrap" gap={4}>
        <Heading size="lg">Friends Management</Heading>
        <AddFriendModal />
      </Flex>

      <Box mt={12}>
        <Heading size="md" mb={6}>
          Friend Requests
        </Heading>

        <VStack align="stretch" gap={8}>
          {/* Incoming */}
          <Box>
            <HStack mb={4}>
              <Text fontWeight="bold">Incoming</Text>
              <Badge colorPalette="orange" variant="subtle">
                {requestsReceived?.count || 0}
              </Badge>
            </HStack>
            {isLoadingRequests ? (
              <Text>Loading...</Text>
            ) : requestsReceived?.data.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                No incoming requests.
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                {requestsReceived?.data.map((user) => (
                  <Box
                    key={user.id}
                    p={4}
                    borderWidth="1px"
                    rounded="md"
                    bg="bg.panel"
                  >
                    <Text fontWeight="bold">
                      {user.full_name || user.email}
                    </Text>
                    <Text fontSize="xs" color="fg.muted" mb={3}>
                      ID: {formatPublicId(user.public_id)}
                    </Text>
                    <Flex gap={2}>
                      <Button
                        size="xs"
                        colorPalette="orange"
                        onClick={() => acceptMutation.mutate(user.id)}
                        loading={acceptMutation.isPending}
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => removeMutation.mutate(user.id)}
                        loading={removeMutation.isPending}
                      >
                        Decline
                      </Button>
                    </Flex>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </Box>

          <Separator />

          {/* Outgoing */}
          <Box>
            <HStack mb={4}>
              <Text fontWeight="bold">Sent</Text>
              <Badge colorPalette="blue" variant="subtle">
                {requestsSent?.count || 0}
              </Badge>
            </HStack>
            {isLoadingSent ? (
              <Text>Loading...</Text>
            ) : requestsSent?.data.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                No sent requests pending.
              </Text>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
                {requestsSent?.data.map((user) => (
                  <Box
                    key={user.id}
                    p={4}
                    borderWidth="1px"
                    rounded="md"
                    bg="bg.panel"
                    opacity={0.8}
                  >
                    <HStack justify="space-between" mb={1}>
                      <Text fontWeight="bold">
                        {user.full_name || user.email}
                      </Text>
                      <FiSend color="gray" size="12px" />
                    </HStack>
                    <Text fontSize="xs" color="fg.muted" mb={3}>
                      ID: {formatPublicId(user.public_id)}
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => removeMutation.mutate(user.id)}
                      loading={removeMutation.isPending}
                    >
                      Cancel Request
                    </Button>
                  </Box>
                ))}
              </SimpleGrid>
            )}
          </Box>
        </VStack>
      </Box>

      <Separator my={12} />

      <Box pb={20}>
        <Heading size="md" mb={6}>
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
                  to={
                    user.id === currentUser?.id ? "/profile" : "/users/$userId"
                  }
                  params={
                    user.id === currentUser?.id ? {} : { userId: user.id }
                  }
                >
                  <Text
                    fontWeight="bold"
                    _hover={{
                      textDecoration: "underline",
                      color: "orange.500",
                    }}
                  >
                    {user.full_name || user.email}
                  </Text>
                </Link>
                <Text fontSize="xs" color="fg.muted" mb={3}>
                  ID: {formatPublicId(user.public_id)}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Container>
  )
}
