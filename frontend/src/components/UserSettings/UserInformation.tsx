import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid,
} from "@chakra-ui/react"

import type { UserPublicExtended } from "@/customTypes"
import useAuth from "@/hooks/useAuth"
import { Field } from "../ui/field"

const UserInformation = () => {
  const { user: currentUserData } = useAuth()
  const currentUser = currentUserData as UserPublicExtended

  return (
    <Container maxW="full" p={0}>
      <VStack align="stretch" gap={10}>
        <Box>
          <Heading size="sm" mb={6}>
            About Me
          </Heading>
          <Box
            p={4}
            bg="bg.subtle"
            borderRadius="md"
            borderWidth="1px"
            maxH="150px" // Height for roughly 5-6 lines
            overflowY="auto"
            whiteSpace="pre-wrap"
            color={!currentUser?.profile?.bio ? "fg.muted" : "inherit"}
            css={{
              "&::-webkit-scrollbar": { width: "4px" },
              "&::-webkit-scrollbar-thumb": { background: "gray.300", borderRadius: "full" },
            }}
          >
            {currentUser?.profile?.bio || "No bio set."}
          </Box>
        </Box>

        <Box pt={4} pb={8}>
          <Heading size="sm" mb={6}>
            Contact Details
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            <Field label="Email Address">
              <Text fontSize="md" py={2}>
                {currentUser?.email}
              </Text>
            </Field>
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  )
}

export default UserInformation