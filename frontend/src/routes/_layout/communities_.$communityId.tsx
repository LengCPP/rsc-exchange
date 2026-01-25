import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  Separator,
  SimpleGrid,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useState } from "react"
import { FiArrowLeft, FiMessageSquare, FiSend, FiUsers } from "react-icons/fi"

import { CommunitiesService } from "@/client"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

export const Route = createFileRoute("/_layout/communities/$communityId")({
  component: CommunityBoard,
})

function CommunityBoard() {
  const { communityId } = Route.useParams()
  const { user: currentUser } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")

  const { data: community, isLoading: isLoadingCommunity } = useQuery({
    queryKey: ["community", communityId],
    queryFn: () => CommunitiesService.readCommunity({ id: communityId }),
  })

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["communityMembers", communityId],
    queryFn: () => CommunitiesService.readCommunityMembers({ id: communityId }),
  })

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["communityMessages", communityId],
    queryFn: () => CommunitiesService.readCommunityMessages({ id: communityId }),
  })

  const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ["communityAnnouncements", communityId],
    queryFn: () => CommunitiesService.readCommunityAnnouncements({ id: communityId }),
  })

  const postMessageMutation = useMutation({
    mutationFn: (content: string) =>
      CommunitiesService.createCommunityMessage({
        id: communityId,
        requestBody: { content },
      }),
    onSuccess: () => {
      setMessage("")
      queryClient.invalidateQueries({ queryKey: ["communityMessages", communityId] })
    },
    onError: () => showErrorToast("Failed to post message"),
  })

  const isMember = currentUser?.communities?.some((c) => c.id === communityId)
  const isAdmin =
    community?.created_by === currentUser?.id ||
    currentUser?.is_superuser ||
    community?.current_user_role === "admin"

  if (isLoadingCommunity) {
    return (
      <Container maxW="full" pt={12}>
        <Text>Loading community...</Text>
      </Container>
    )
  }

  if (!community) {
    return (
      <Container maxW="full" pt={12}>
        <Text>Community not found</Text>
      </Container>
    )
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    postMessageMutation.mutate(message)
  }

  return (
    <Container maxW="full">
      <VStack align="stretch" gap={6} pt={8}>
        <Flex align="center" gap={4}>
          <Link to="/communities">
            <Button variant="ghost" size="sm">
              <FiArrowLeft /> Back
            </Button>
          </Link>
          <Heading size="xl">{community.name}</Heading>
          {community.is_closed ? (
            <Badge colorPalette="red">Closed</Badge>
          ) : (
            <Badge colorPalette="green">Open</Badge>
          )}
        </Flex>

        <Text color="fg.muted" fontSize="lg">
          {community.description || "No description provided."}
        </Text>

        <Separator />

        <Tabs.Root defaultValue="board" variant="enclosed">
          <Tabs.List>
            <Tabs.Trigger value="board">
              <FiMessageSquare /> Board
            </Tabs.Trigger>
            <Tabs.Trigger value="members">
              <FiUsers /> Address Book ({members?.count || 0})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="board" pt={6}>
            {!isMember ? (
              <Box p={8} textAlign="center" borderWidth="1px" rounded="md" bg="bg.muted">
                <Text>You must be a member to see the board and messages.</Text>
              </Box>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
                <Box md={{ colSpan: 2 }}>
                  <VStack align="stretch" gap={4}>
                    <Heading size="md">Community Chat</Heading>
                    <Box
                      h="400px"
                      borderWidth="1px"
                      rounded="md"
                      p={4}
                      bg="bg.panel"
                      overflowY="auto"
                      display="flex"
                      flexDirection="column-reverse"
                    >
                      <VStack align="stretch" gap={3}>
                        {isLoadingMessages ? (
                          <Text color="fg.muted">Loading messages...</Text>
                        ) : messages?.data.length === 0 ? (
                          <Text color="fg.muted" fontStyle="italic">No messages yet. Start the conversation!</Text>
                        ) : (
                          messages?.data.map((msg) => (
                            <Box key={msg.id} p={3} bg="bg.muted" rounded="lg">
                              <Flex justify="space-between" align="baseline" mb={1}>
                                <Text fontWeight="bold" fontSize="xs" color="ui.hover">
                                  {msg.author.full_name || msg.author.email}
                                </Text>
                                <Text fontSize="2xs" color="fg.subtle">
                                  {new Date(msg.created_at).toLocaleString()}
                                </Text>
                              </Flex>
                              <Text fontSize="sm">{msg.content}</Text>
                            </Box>
                          ))
                        )}
                      </VStack>
                    </Box>
                    <form onSubmit={handleSendMessage}>
                      <Flex gap={2}>
                        <Input
                          placeholder="Type a message..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                        <Button
                          type="submit"
                          colorPalette="orange"
                          loading={postMessageMutation.isPending}
                        >
                          <FiSend />
                        </Button>
                      </Flex>
                    </form>
                  </VStack>
                </Box>
                <Box>
                  <VStack align="stretch" gap={4}>
                    <Heading size="md">Announcements</Heading>
                    {isLoadingAnnouncements ? (
                      <Text>Loading...</Text>
                    ) : announcements?.data.length === 0 ? (
                      <Box p={4} borderWidth="1px" rounded="md" bg="bg.panel">
                        <Text color="fg.muted" fontStyle="italic">No announcements yet.</Text>
                      </Box>
                    ) : (
                      announcements?.data.map((ann) => (
                        <Box key={ann.id} p={4} borderWidth="1px" rounded="md" bg="bg.panel" borderColor="ui.hover">
                          <Heading size="sm" mb={2}>{ann.title}</Heading>
                          <Text fontSize="sm" mb={2}>{ann.content}</Text>
                          <Text fontSize="2xs" color="fg.subtle">
                            By {ann.author.full_name} • {new Date(ann.created_at).toLocaleDateString()}
                          </Text>
                        </Box>
                      ))
                    )}
                  </VStack>
                </Box>
              </SimpleGrid>
            )}
          </Tabs.Content>

          <Tabs.Content value="members" pt={6}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
              {isLoadingMembers ? (
                <Text>Loading members...</Text>
              ) : (
                members?.data.map((member) => (
                  <Box
                    key={member.id}
                    p={4}
                    borderWidth="1px"
                    rounded="md"
                    bg="bg.panel"
                    _hover={{ borderColor: "ui.hover" }}
                  >
                    <Flex justify="space-between" align="center">
                      <VStack align="start" gap={0}>
                        <Text fontWeight="bold">{member.full_name || member.email}</Text>
                        <Badge size="xs" colorPalette={member.community_role === "admin" ? "purple" : "gray"}>
                          {member.community_role?.toUpperCase() || "MEMBER"}
                        </Badge>
                      </VStack>
                      <Link to={`/users/${member.id}`}>
                        <Button size="xs" variant="outline">View Profile</Button>
                      </Link>
                    </Flex>
                  </Box>
                ))
              )}
            </SimpleGrid>
          </Tabs.Content>
        </Tabs.Root>
      </VStack>
    </Container>
  )
}