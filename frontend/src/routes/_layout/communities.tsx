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
  Input,
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogTrigger,
} from "@chakra-ui/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiGlobe, FiPlus, FiUserPlus, FiTrash2, FiUserMinus } from "react-icons/fi"
import { useForm, type SubmitHandler } from "react-hook-form"
import { useState } from "react"
import { z } from "zod"

import { CommunitiesService, FriendsService, type CommunityCreate } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import { Field } from "@/components/ui/field"
import useAuth from "@/hooks/useAuth"

const communitiesSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/communities")({
  component: Communities,
  validateSearch: (search) => communitiesSearchSchema.parse(search),
})

function AddCommunity({ onSuccess }: { onSuccess: () => void }) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { register, handleSubmit, reset } = useForm<CommunityCreate>()

  const mutation = useMutation({
    mutationFn: (data: CommunityCreate) => CommunitiesService.createCommunity({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Community created successfully")
      reset()
      onSuccess()
    },
    onError: () => {
      showErrorToast("Failed to create community")
    },
  })

  const onSubmit: SubmitHandler<CommunityCreate> = (data) => {
    mutation.mutate(data)
  }

  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button variant="solid">
          <FiPlus /> Create Community
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Community</DialogTitle>
        </DialogHeader>
        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogBody pb="4">
            <VStack gap="4">
              <Field label="Name" required>
                <Input {...register("name", { required: true })} placeholder="Community Name" />
              </Field>
              <Field label="Description">
                <Input {...register("description")} placeholder="Description" />
              </Field>
            </VStack>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline">Cancel</Button>
            </DialogActionTrigger>
            <Button type="submit" loading={mutation.isPending}>
              Create
            </Button>
          </DialogFooter>
        </Box>
      </DialogContent>
    </DialogRoot>
  )
}

function CommunityCard({ community }: { community: any }) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const { user: currentUser } = useAuth()
  const [showMembers, setShowMembers] = useState(false)

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
      showSuccessToast("Joined community!")
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

  const isMember = currentUser?.communities?.some(c => c.id === community.id)
  const isAdmin = community.created_by === currentUser?.id || currentUser?.is_superuser

  return (
    <Box p={6} rounded="lg" borderWidth="1px" bg="bg.panel">
      <Flex justify="space-between" align="start">
        <Box>
          <Heading size="md">{community.name}</Heading>
          <Text mt={2} color="fg.muted">
            {community.description || "No description"}
          </Text>
        </Box>
        {isAdmin && (
          <Button
            size="xs"
            colorPalette="red"
            variant="ghost"
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
            onClick={() => joinMutation.mutate()}
            loading={joinMutation.isPending}
          >
            Join Community
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setShowMembers(!showMembers)}>
              {showMembers ? "Hide Members" : "Show Members"}
            </Button>
            {!isAdmin && (
              <Button
                size="sm"
                variant="ghost"
                colorPalette="gray"
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
          {isLoadingMembers ? (
            <Text fontSize="xs">Loading...</Text>
          ) : (
            members?.data.map((m: any) => (
              <Flex key={m.id} justify="space-between" align="center">
                <Text fontSize="sm">{m.full_name || m.email}</Text>
                <Flex gap={1}>
                  {isAdmin && m.id !== currentUser?.id && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to remove ${m.full_name || m.email}?`)) {
                          removeMemberMutation.mutate(m.id)
                        }
                      }}
                      title="Remove Member"
                    >
                      <FiUserMinus />
                    </Button>
                  )}
                  {m.id !== currentUser?.id && (
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => friendMutation.mutate(m.id)}
                      title="Add Friend"
                    >
                      <FiUserPlus />
                    </Button>
                  )}
                </Flex>
              </Flex>
            ))
          )}
        </VStack>
      )}
    </Box>
  )
}

function Communities() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["communities"],
    queryFn: () => CommunitiesService.readCommunities({}),
  })

  const communities = data?.data ?? []

  return (
    <Container maxW="full">
      <Flex pt={12} justify="space-between" align="center">
        <Heading size="lg">Communities</Heading>
        <AddCommunity onSuccess={() => queryClient.invalidateQueries({ queryKey: ["communities"] })} />
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
