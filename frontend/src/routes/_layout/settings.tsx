import {
  Box,
  Container,
  Heading,
  Tabs,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react"
import { createFileRoute } from "@tanstack/react-router"
import { FiAlertTriangle, FiLock, FiSettings } from "react-icons/fi"

import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserPreferences from "@/components/UserSettings/UserPreferences"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  const isMobile = useBreakpointValue({ base: true, md: false })

  if (!currentUser) {
    return null
  }

  return (
    <Container maxW="full" py={8}>
      <Heading size="lg" mb={8}>
        Settings
      </Heading>

      <Tabs.Root
        defaultValue="preferences"
        orientation={isMobile ? "horizontal" : "vertical"}
        variant="line"
        colorPalette="teal"
      >
        <Tabs.List
          width={isMobile ? "full" : "250px"}
          borderRightWidth={isMobile ? 0 : "1px"}
          borderBottomWidth={isMobile ? "1px" : 0}
          mr={isMobile ? 0 : 8}
          mb={isMobile ? 8 : 0}
        >
          <Text
            fontWeight="bold"
            fontSize="xs"
            color="gray.500"
            mb={2}
            px={4}
            textTransform="uppercase"
          >
            Configuration
          </Text>
          <Tabs.Trigger value="preferences" justifyContent="flex-start">
            <Box mr={2}>
              <FiSettings />
            </Box>{" "}
            Preferences
          </Tabs.Trigger>
          <Tabs.Trigger value="password" justifyContent="flex-start">
            <Box mr={2}>
              <FiLock />
            </Box>{" "}
            Security
          </Tabs.Trigger>
          <Tabs.Trigger
            value="danger-zone"
            justifyContent="flex-start"
            color="red.500"
          >
            <Box mr={2}>
              <FiAlertTriangle />
            </Box>{" "}
            Danger Zone
          </Tabs.Trigger>
        </Tabs.List>

        <Box flex="1" maxW="3xl">
          <Tabs.Content value="preferences">
            <UserPreferences />
          </Tabs.Content>
          <Tabs.Content value="password">
            <ChangePassword />
          </Tabs.Content>
          <Tabs.Content value="danger-zone">
            <DeleteAccount />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Container>
  )
}
