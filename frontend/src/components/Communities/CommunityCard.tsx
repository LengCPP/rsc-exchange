import { Badge, Box, Button, Flex, Heading, Text } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { FiTrash2 } from "react-icons/fi"

import { CommunitiesService } from "@/client"
import EditCommunity from "@/components/Communities/EditCommunity"
import type { CommunityPublicExtended } from "@/customTypes"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

interface CommunityCardProps {
  community: CommunityPublicExtended
}

const CommunityCard = ({ community }: CommunityCardProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user: currentUser } = useAuth()

  const isClosed = community.is_closed

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

  const disbandMutation = useMutation({
    mutationFn: () => CommunitiesService.deleteCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Community disbanded")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: () => showErrorToast("Failed to disband community"),
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
            <Link
              to="/communities/$communityId"
              params={{ communityId: community.id }}
            >
              <Button size="sm" colorPalette="orange" variant="solid">
                View Community
              </Button>
            </Link>
          </>
        )}
      </Flex>
    </Box>
  )
}

export default CommunityCard
