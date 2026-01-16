import {
  Box,
  Container,
  Text,
  Input,
  VStack,
  Heading,
  Grid,
  Spinner,
  Flex,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { FiSearch } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import { SearchService, CommunitiesService } from "@/client"
import ItemCard from "@/components/Items/ItemCard"
import CommunityCard from "@/components/Communities/CommunityCard"
import { formatPublicId } from "@/utils"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  const { user: currentUser } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search", debouncedSearchTerm],
    queryFn: () => SearchService.search({ q: debouncedSearchTerm }),
    enabled: debouncedSearchTerm.length > 0,
  })

  const { data: recommendations, isLoading: isLoadingRecs } = useQuery({
    queryKey: ["recommended-communities"],
    queryFn: () => CommunitiesService.readCommunities({ limit: 4 }),
  })

  const showSearch = debouncedSearchTerm.length > 0

  return (
    <>
      <Container maxW="full">
        <Box pt={12} m={4}>
          <Text fontSize="2xl">
            Hi, {currentUser?.full_name || currentUser?.email} 👋🏼
          </Text>
          <Text mb={8}>Welcome back, nice to see you again!</Text>

          <Box maxW="600px" mb={12}>
            <Heading size="md" mb={4}>
              Global Search
            </Heading>
            <Flex position="relative" align="center">
              <Box position="absolute" left={3} color="gray.400" zIndex={1}>
                <FiSearch />
              </Box>
              <Input
                placeholder="Search users by ID, items by name, or communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                pl={10}
              />
            </Flex>
          </Box>

          {showSearch ? (
            <VStack align="stretch" gap={8} mb={12}>
              {isSearching ? (
                <Spinner />
              ) : (
                <>
                  {searchResults?.users.length! > 0 && (
                    <Box>
                      <Heading size="sm" mb={4}>
                        Users
                      </Heading>
                      <Grid
                        templateColumns="repeat(auto-fill, minmax(200px, 1fr))"
                        gap={4}
                      >
                        {searchResults?.users.map((user: any) => (
                          <Box
                            key={user.id}
                            p={4}
                            borderWidth="1px"
                            borderRadius="lg"
                          >
                            <Text fontWeight="bold">
                              {user.full_name || "Anonymous"}
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              ID: {formatPublicId(user.public_id)}
                            </Text>
                          </Box>
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {searchResults?.items.length! > 0 && (
                    <Box>
                      <Heading size="sm" mb={4}>
                        Items
                      </Heading>
                      <Grid
                        templateColumns="repeat(auto-fill, minmax(250px, 1fr))"
                        gap={6}
                      >
                        {searchResults?.items.map((item: any) => (
                          <ItemCard key={item.id} item={item} />
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {searchResults?.communities.length! > 0 && (
                    <Box>
                      <Heading size="sm" mb={4}>
                        Communities
                      </Heading>
                      <Grid
                        templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                        gap={6}
                      >
                        {searchResults?.communities.map((community: any) => (
                          <CommunityCard
                            key={community.id}
                            community={community}
                          />
                        ))}
                      </Grid>
                    </Box>
                  )}

                  {!isSearching &&
                    searchResults?.users.length === 0 &&
                    searchResults?.items.length === 0 &&
                    searchResults?.communities.length === 0 && (
                      <Text color="gray.500">No results found for "{debouncedSearchTerm}"</Text>
                    )}
                </>
              )}
            </VStack>
          ) : (
            <Box mb={12}>
              <Heading size="md" mb={4}>
                Recommended Communities
              </Heading>
              {isLoadingRecs ? (
                <Spinner />
              ) : (
                <Grid
                  templateColumns="repeat(auto-fill, minmax(300px, 1fr))"
                  gap={6}
                >
                  {recommendations?.data.map((community: any) => (
                    <CommunityCard key={community.id} community={community} />
                  ))}
                </Grid>
              )}
            </Box>
          )}
        </Box>
      </Container>
    </>
  )
}
