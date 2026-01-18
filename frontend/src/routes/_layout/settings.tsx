import { Container, Heading, Separator, Tabs, VStack } from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"

import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import UserPreferences from "@/components/UserSettings/UserPreferences"
import UserProfile from "@/components/UserSettings/UserProfile"
import useAuth from "@/hooks/useAuth"

const ProfileTab = () => (
  <VStack align="stretch" gap={6}>
    <UserInformation />
    <Separator />
    <UserProfile />
  </VStack>
)

const tabsConfig = [
  { value: "profile", title: "Profile", component: ProfileTab },
  { value: "preferences", title: "Preferences", component: UserPreferences },
  { value: "password", title: "Password", component: ChangePassword },
  { value: "danger-zone", title: "Danger zone", component: DeleteAccount },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  const finalTabs = currentUser?.is_superuser
    ? tabsConfig.slice(0, 3)
    : tabsConfig

  if (!currentUser) {
    return null
  }

  return (
    <Container maxW="full">
      <Heading size="lg" textAlign={{ base: "center", md: "left" }} py={12}>
        User Settings
      </Heading>

      <Tabs.Root defaultValue="profile" variant="subtle">
        <Tabs.List>
          {finalTabs.map((tab) => (
            <Tabs.Trigger key={tab.value} value={tab.value}>
              {tab.title}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {finalTabs.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value}>
            <tab.component />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Container>
  )
}
