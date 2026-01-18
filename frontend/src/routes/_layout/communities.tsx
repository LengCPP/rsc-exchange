import {
  Container,
  EmptyState,
  Flex,
  Heading,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiGlobe } from "react-icons/fi"
import { z } from "zod"

import { CommunitiesService } from "@/client"
import AddCommunity from "@/components/Communities/AddCommunity"
import CommunityCard from "@/components/Communities/CommunityCard"

const communitiesSearchSchema = z.object({
  page: z.number().catch(1),
})

export const Route = createFileRoute("/_layout/communities")({
  component: Communities,
  validateSearch: (search) => communitiesSearchSchema.parse(search),
})

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
