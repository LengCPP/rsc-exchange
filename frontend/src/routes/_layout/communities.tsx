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
  Badge,
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiGlobe, FiUserPlus, FiTrash2, FiUserMinus, FiSettings } from "react-icons/fi"
import { useState, useMemo } from "react"
import { z } from "zod"

import { CommunitiesService, FriendsService } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import useAuth from "@/hooks/useAuth"
import AddCommunity from "@/components/Communities/AddCommunity"
import { CommunityPublicExtended, UserPublicWithRole } from "@/customTypes"
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "@/components/ui/menu"

const communitiesSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/communities")({
  component: Communities,
  validateSearch: (search) => communitiesSearchSchema.parse(search),
})

function CommunityCard({ community }: { community: any }) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user: currentUser } = useAuth()
  const [showMembers, setShowMembers] = useState(false)

  const communityExtended = community as CommunityPublicExtended
  const isClosed = communityExtended.is_closed

  // Fetch friends list for the current user
  const { data: friendsData, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["currentUserFriends"],
    queryFn: () => FriendsService.readFriends(),
    enabled: showMembers && !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const friendIds = useMemo(() => {
    return new Set(friendsData?.data.map(friend => friend.id) || []);
  }, [friendsData]);


  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["communityMembers", community.id],
    queryFn: () => CommunitiesService.readCommunityMembers({ id: community.id }),
    enabled: showMembers,
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => CommunitiesService.leaveCommunity({ id: community.id, userId }),
    onSuccess: () => {
      showSuccessToast("Member removed")
      queryClient.invalidateQueries({ queryKey: ["communityMembers", community.id] })
    },
    onError: () => showErrorToast("Failed to remove member"),
  })

  const joinMutation = useMutation({
    mutationFn: () => CommunitiesService.joinCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast(isClosed ? "Request sent to admins!" : "Joined community!")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: () => showErrorToast("Failed to join community"),
  })

  const friendMutation = useMutation({
    mutationFn: (userId: string) => FriendsService.createFriendRequest({ friendId: userId }),
    onSuccess: () => showSuccessToast("Friend request sent!"),
    onError: () => showErrorToast("Failed to send friend request"),
  })

  const disbandMutation = useMutation({
    mutationFn: () => CommunitiesService.deleteCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Community disbanded")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
    },
    onError: () => showErrorToast("Failed to disband community"),
  })

  const leaveMutation = useMutation({
    mutationFn: () => CommunitiesService.leaveCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Left community")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: () => showErrorToast("Failed to leave community"),
  })

  // Mock Mutation for Role Update
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      // Simulate API call
      console.log(`Updating user ${userId} to role ${role}`)
      return new Promise((resolve) => setTimeout(resolve, 500))
    },
    onSuccess: (_, variables) => {
      showSuccessToast(`User role updated to ${variables.role}`)
      // In a real app, we would invalidate queries or update cache
      queryClient.invalidateQueries({ queryKey: ["communityMembers", community.id] })
    },
  })

  const isMember = currentUser?.communities?.some(c => c.id === community.id)
  const isAdmin = community.created_by === currentUser?.id || currentUser?.is_superuser

  return (
    <Box p={6} rounded="lg" borderWidth="1px" bg="bg.panel">
      <Flex justify="space-between" align="start">
        <Box>
          <Flex align="center" gap={2}>
            <Heading size="md">{community.name}</Heading>
            {isClosed ? (
              <Badge colorPalette="red" variant="subtle">Closed</Badge>
            ) : (
              <Badge colorPalette="green" variant="subtle">Open</Badge>
            )}
          </Flex>
          <Text mt={2} color="fg.muted">
            {community.description || "No description"}
          </Text>
        </Box>
        {isAdmin && (
          <Button
            size="xs"
            variant={"danger" as any}
            onClick={() => {
               if (window.confirm("Are you sure you want to disband this community?")) {
                 disbandMutation.mutate()
               }
            }}
            title="Disband Community"
          >
            <FiTrash2 />
          </Button>
        )}
      </Flex>
      
      <Flex mt={4} gap={2}>
        {!isMember ? (
          <Button
            size="sm"
            variant={"primary" as any}
            onClick={() => joinMutation.mutate()}
            loading={joinMutation.isPending}
          >
            {isClosed ? "Request to Join" : "Join Community"}
          </Button>
        ) : (
          <>
            <Button size="sm" variant={"secondary" as any} onClick={() => setShowMembers(!showMembers)}>
              {showMembers ? "Hide Members" : "Show Members"}
            </Button>
            {!isAdmin && (
              <Button
                size="sm"
                variant={"dangerSecondary" as any}
                onClick={() => {
                   if (window.confirm("Are you sure you want to leave this community?")) {
                     leaveMutation.mutate()
                   }
                }}
              >
                Leave
              </Button>
            )}
          </>
        )}
      </Flex>

      {showMembers && (
        <VStack mt={4} align="stretch" gap={2}>
          <Separator />
          <Text fontWeight="bold" fontSize="sm">Members:</Text>
          {isLoadingMembers || isLoadingFriends ? ( // Show loading if either members or friends are loading
            <Text fontSize="xs">Loading...</Text>
          ) : (
            members?.data
              .filter((m: any) => m.id !== currentUser?.id) // Filter out current user
              .map((m: any) => {
                const member = m as UserPublicWithRole
                const role = member.community_role || (member.id === community.created_by ? "admin" : "member")
                const isCreator = member.id === community.created_by
                const isFriend = friendIds.has(member.id); // Check if current member is a friend

                return (
                  <Flex key={member.id} justify="space-between" align="center" p={2} _hover={{ bg: "bg.muted" }} rounded="md">
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium">{member.full_name || member.email}</Text>
                      <Badge size="xs" colorPalette={role === "admin" ? "purple" : "gray"}>
                        {role.toUpperCase()}
                      </Badge>
                      {isFriend && ( // Display Friend badge if they are a friend
                        <Badge size="xs" colorPalette="blue" variant="solid">
                          Friend
                        </Badge>
                      )}
                    </VStack>
                    
                    <Flex gap={1} align="center">
                      {/* Role Management Menu */}
                      {isAdmin && !isCreator && member.id !== currentUser?.id && (
                        <MenuRoot>
                          <MenuTrigger asChild>
                             <Button size="xs" variant="outline" title="Manage Role">
                               <FiSettings />
                             </Button>
                          </MenuTrigger>
                          <MenuContent>
                             <MenuItem 
                               value="admin" 
                               onClick={() => updateRoleMutation.mutate({ userId: member.id, role: "admin" })}
                               disabled={role === "admin"}
                             >
                               Promote to Admin
                             </MenuItem>
                             <MenuItem 
                               value="member" 
                               onClick={() => updateRoleMutation.mutate({ userId: member.id, role: "member" })}
                               disabled={role === "member"}
                             >
                               Demote to Member
                             </MenuItem>
                          </MenuContent>
                        </MenuRoot>
                      )}

                      {/* Remove Member Button */}
                      {isAdmin && member.id !== currentUser?.id && (
                        <Button
                          size="xs"
                          variant={"danger" as any}
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove ${member.full_name || member.email}?`)) {
                              removeMemberMutation.mutate(member.id)
                            }
                          }}
                          title="Remove Member"
                        >
                          <FiUserMinus />
                        </Button>
                      )}
                      
                      {/* Add Friend Button - Conditionally Rendered */}
                      {member.id !== currentUser?.id && !isFriend && ( // Only show if not current user AND not already a friend
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => friendMutation.mutate(member.id)}
                          title="Add Friend"
                        >
                          <FiUserPlus />
                        </Button>
                      )}
                    </Flex>
                  </Flex>
                )
              })
            )}
          </VStack>
        )}
      </Flex>
    </Box>
  )
}

function Communities() {
  const { data, isLoading } = useQuery({
    queryKey: ["communities"],
    queryFn: () => CommunitiesService.readCommunities({}),
  })

  const communities = data?.data ?? []

  return (
    <Container maxW="full">
      <Flex pt={12} justify="space-between" align="center">
        <Heading size="lg">Communities</Heading>
        <AddCommunity />
      </Flex>

      {isLoading ? (
        <Text mt={6}>Loading...</Text>
      ) : communities.length === 0 ? (
        <EmptyState.Root mt={6}>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <FiGlobe />
            </EmptyState.Indicator>
            <VStack textAlign="center">
              <EmptyState.Title>No communities found</EmptyState.Title>
              <EmptyState.Description>
                Create one to get started!
              </EmptyState.Description>
            </VStack>
          </EmptyState.Content>
        </EmptyState.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6} mt={6}>
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </SimpleGrid>
      )}
    </Container>
  )
}