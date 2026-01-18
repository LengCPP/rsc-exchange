import { Container, Heading, Separator, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

import UserInformation from "@/components/UserSettings/UserInformation"
import UserProfile from "@/components/UserSettings/UserProfile"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/profile")({
  component: Profile,
})

function Profile() {
  const { user: currentUser } = useAuth()

  if (!currentUser) {
    return null
  }

  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} py={12}>
        My Profile
      </Heading>

      <VStack align="stretch" gap={8} maxW="3xl">
        <UserInformation />
        <Separator />
        <UserProfile />
      </VStack>
    </Container>
  )
}
