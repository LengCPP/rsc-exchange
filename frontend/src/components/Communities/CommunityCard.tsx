import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Separator,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { FiSettings, FiTrash2, FiUserMinus, FiUserPlus } from "react-icons/fi"

import { CommunitiesService, FriendsService } from "@/client"
import EditCommunity from "@/components/Communities/EditCommunity"
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
} from "@/components/ui/menu"
import type { CommunityPublicExtended, UserPublicWithRole } from "@/customTypes"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

interface CommunityCardProps {
  community: CommunityPublicExtended
}

const CommunityCard = ({ community }: CommunityCardProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user: currentUser } = useAuth()
  const [showMembers, setShowMembers] = useState(false)

  const isClosed = community.is_closed

  // Fetch friends list for the current user
  const { data: friendsData, isLoading: isLoadingFriends } = useQuery({
    queryKey: ["currentUserFriends"],
    queryFn: () => FriendsService.readFriends(),
    enabled: showMembers && !!currentUser?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  const friendIds = useMemo(() => {
    return new Set(friendsData?.data.map((friend) => friend.id) || [])
  }, [friendsData])

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ["communityMembers", community.id],
    queryFn: () =>
      CommunitiesService.readCommunityMembers({ id: community.id }),
    enabled: showMembers,
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      CommunitiesService.leaveCommunity({ id: community.id, userId }),
    onSuccess: () => {
      showSuccessToast("Member removed")
      queryClient.invalidateQueries({
        queryKey: ["communityMembers", community.id],
      })
    },
    onError: () => showErrorToast("Failed to remove member"),
  })

  const joinMutation = useMutation({
    mutationFn: () => CommunitiesService.joinCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast(
        isClosed ? "Request sent to admins!" : "Joined community!",
      )
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: () => showErrorToast("Failed to join community"),
  })

  const friendMutation = useMutation({
    mutationFn: (userId: string) =>
      FriendsService.createFriendRequest({ friendId: userId }),
    onSuccess: () => showSuccessToast("Friend request sent!"),
    onError: () => showErrorToast("Failed to send friend request"),
  })

  const disbandMutation = useMutation({
    mutationFn: () => CommunitiesService.deleteCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Community disbanded")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: () => showErrorToast("Failed to disband community"),
  })

  const leaveMutation = useMutation({
    mutationFn: () => CommunitiesService.leaveCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Left community")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: () => showErrorToast("Failed to leave community"),
  })

  // Update Member Mutation
  const updateMemberMutation = useMutation({
    mutationFn: (data: { userId: string; role?: string; status?: string }) =>
      CommunitiesService.updateCommunityMemberRole({
        id: community.id,
        userId: data.userId,
        requestBody: { role: data.role as any, status: data.status as any },
      }),
    onSuccess: () => {
      showSuccessToast("Member updated successfully")
      queryClient.invalidateQueries({
        queryKey: ["communityMembers", community.id],
      })
    },
    onError: () => showErrorToast("Failed to update member"),
  })

  const isMember = currentUser?.communities?.some((c) => c.id === community.id)
  const isAdmin =
    community.created_by === currentUser?.id ||
    currentUser?.is_superuser ||
    community.current_user_role === "admin"

  return (
    <Box p={6} rounded="lg" borderWidth="1px" bg="bg.panel" h="fit-content">
      <Flex justify="space-between" align="start">
        <Box>
          <Flex align="center" gap={2}>
            <Heading size="md">{community.name}</Heading>
            {isClosed ? (
              <Badge colorPalette="red" variant="subtle">
                Closed
              </Badge>
            ) : (
              <Badge colorPalette="green" variant="subtle">
                Open
              </Badge>
            )}
          </Flex>
          <Text mt={2} color="fg.muted">
            {community.description || "No description"}
          </Text>
        </Box>
        {isAdmin && (
          <Flex gap={2}>
            <EditCommunity community={community} />
            <Button
              size="xs"
              variant={"danger" as any}
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to disband this community?",
                  )
                ) {
                  disbandMutation.mutate()
                }
              }}
              title="Disband Community"
            >
              <FiTrash2 />
            </Button>
          </Flex>
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
            <Button
              size="sm"
              variant={"secondary" as any}
              onClick={() => setShowMembers(!showMembers)}
            >
              {showMembers ? "Hide Members" : "Show Members"}
            </Button>
            {!isAdmin && (
              <Button
                size="sm"
                variant={"dangerSecondary" as any}
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to leave this community?",
                    )
                  ) {
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
          <Text fontWeight="bold" fontSize="sm">
            Members:
          </Text>
          {isLoadingMembers || isLoadingFriends ? (
            <Text fontSize="xs">Loading...</Text>
          ) : (
            members?.data
              .filter((m: any) => m.id !== currentUser?.id)
              .map((m: any) => {
                const member = m as UserPublicWithRole
                const role =
                  member.community_role ||
                  (member.id === community.created_by ? "admin" : "member")
                const status = member.community_status
                const isCreator = member.id === community.created_by
                const isFriend = friendIds.has(member.id)

                return (
                  <Flex
                    key={member.id}
                    justify="space-between"
                    align="center"
                    p={2}
                    _hover={{ bg: "bg.muted" }}
                    rounded="md"
                  >
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium">
                        {member.full_name || member.email}
                      </Text>
                      <Flex gap={1}>
                        <Badge
                          size="xs"
                          colorPalette={role === "admin" ? "purple" : "gray"}
                        >
                          {role.toUpperCase()}
                        </Badge>
                        {status === "pending" && (
                          <Badge size="xs" colorPalette="yellow">
                            PENDING
                          </Badge>
                        )}
                        {isFriend && (
                          <Badge size="xs" colorPalette="blue" variant="solid">
                            Friend
                          </Badge>
                        )}
                      </Flex>
                    </VStack>

                    <Flex gap={1} align="center">
                      {status === "pending" && isAdmin && (
                        <Button
                          size="xs"
                          colorPalette="green"
                          variant="solid"
                          onClick={() =>
                            updateMemberMutation.mutate({
                              userId: member.id,
                              status: "accepted",
                            })
                          }
                          title="Approve Member"
                        >
                          Approve
                        </Button>
                      )}

                      {isAdmin &&
                        !isCreator &&
                        member.id !== currentUser?.id &&
                        status === "accepted" && (
                          <MenuRoot>
                            <MenuTrigger asChild>
                              <Button
                                size="xs"
                                variant="outline"
                                title="Manage Role"
                              >
                                <FiSettings />
                              </Button>
                            </MenuTrigger>
                            <MenuContent>
                              <MenuItem
                                value="admin"
                                onClick={() =>
                                  updateMemberMutation.mutate({
                                    userId: member.id,
                                    role: "admin",
                                  })
                                }
                                disabled={role === "admin"}
                              >
                                Promote to Admin
                              </MenuItem>
                              <MenuItem
                                value="member"
                                onClick={() =>
                                  updateMemberMutation.mutate({
                                    userId: member.id,
                                    role: "member",
                                  })
                                }
                                disabled={role === "member"}
                              >
                                Demote to Member
                              </MenuItem>
                            </MenuContent>
                          </MenuRoot>
                        )}

                      {isAdmin && member.id !== currentUser?.id && (
                        <Button
                          size="xs"
                          variant={"danger" as any}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Are you sure you want to remove ${
                                  member.full_name || member.email
                                }?`,
                              )
                            ) {
                              removeMemberMutation.mutate(member.id)
                            }
                          }}
                          title="Remove Member"
                        >
                          <FiUserMinus />
                        </Button>
                      )}

                      {member.id !== currentUser?.id && !isFriend && (
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
    </Box>
  )
}

export default CommunityCard
