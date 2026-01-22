import {
  Container,
  Heading,
  Text,
  VStack,
} from "@chakra-ui/react"

import type { UserPublicExtended } from "@/customTypes"
import useAuth from "@/hooks/useAuth"
import { Field } from "../ui/field"

const UserProfile = () => {
  const { user: currentUserData } = useAuth()
  const currentUser = currentUserData as UserPublicExtended

  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        Bio
      </Heading>
      <VStack align="stretch" gap={6} maxW="xl">
        <Field label="About Me">
          <Text
            p={3}
            bg="bg.subtle"
            borderRadius="md"
            minH="50px"
            whiteSpace="pre-wrap"
            color={!currentUser?.profile?.bio ? "fg.muted" : "inherit"}
          >
            {currentUser?.profile?.bio || "No bio set."}
          </Text>
        </Field>
      </VStack>
    </Container>
  )
}

export default UserProfile
