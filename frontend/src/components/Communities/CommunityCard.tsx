import { Card, Button, Flex } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CommunitiesService, type CommunityPublic, type ApiError } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import useAuth from "@/hooks/useAuth"

interface CommunityCardProps {
  community: CommunityPublic
}

const CommunityCard = ({ community }: CommunityCardProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { user: currentUser } = useAuth()

  const isMember = currentUser?.communities?.some((c) => c.id === community.id)
  const isAdmin = community.created_by === currentUser?.id

  const joinMutation = useMutation({
    mutationFn: () => CommunitiesService.joinCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Joined community successfully")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const leaveMutation = useMutation({
    mutationFn: () => CommunitiesService.leaveCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Left community successfully")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const disbandMutation = useMutation({
    mutationFn: () => CommunitiesService.deleteCommunity({ id: community.id }),
    onSuccess: () => {
      showSuccessToast("Community disbanded")
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["search"] })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  return (
    <Card.Root>
      <Card.Body gap="2">
        <Card.Title mt="2">{community.name}</Card.Title>
        <Card.Description>
          {community.description || "No description"}
        </Card.Description>
      </Card.Body>
      <Card.Footer justifyContent="flex-end">
        <Flex gap="2">
          {isMember ? (
            <Button
              variant="dangerSecondary"
              size="sm"
              onClick={() => leaveMutation.mutate()}
              loading={leaveMutation.isPending}
              disabled={isAdmin}
            >
              Leave
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => joinMutation.mutate()}
              loading={joinMutation.isPending}
            >
              Join
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => disbandMutation.mutate()}
              loading={disbandMutation.isPending}
            >
              Disband
            </Button>
          )}
        </Flex>
      </Card.Footer>
    </Card.Root>
  )
}

export default CommunityCard
