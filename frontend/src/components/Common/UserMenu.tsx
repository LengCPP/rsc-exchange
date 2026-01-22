import { Box, Button, HStack, Text, VStack } from "@chakra-ui/react"
import { Link } from "@tanstack/react-router"
import { FiChevronDown, FiLogOut, FiSettings, FiUser } from "react-icons/fi"

import useAuth from "@/hooks/useAuth"
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "../ui/menu"
import UserAvatar from "./UserAvatar"

const UserMenu = () => {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    logout()
  }

  const name = user?.full_name || "Main Admin"

  return (
    <Box>
      <MenuRoot positioning={{ placement: "bottom-end" }}>
        <MenuTrigger asChild>
          <Button
            variant="ghost"
            rounded="full"
            px={2}
            py={1}
            h="auto"
            _hover={{ bg: "blackAlpha.50" }}
            data-testid="user-menu"
          >
            <HStack gap={2}>
              <Box position="relative" role="group">
                <UserAvatar user={user as any} size="32px" />
                <Box
                  position="absolute"
                  inset="2px"
                  bg="blackAlpha.200"
                  display="none"
                  _groupHover={{ display: "flex" }}
                  borderRadius="full"
                />
              </Box>
              <FiChevronDown color="gray.500" />
            </HStack>
          </Button>
        </MenuTrigger>

        <MenuContent
          boxShadow="lg"
          borderRadius="xl"
          py={2}
          minW="220px"
        >
          <Box px={4} py={3} mb={1}>
            <VStack align="start" gap={0}>
              <Text fontWeight="600" fontSize="sm" truncate maxW="180px">
                {name}
              </Text>
              <Text fontSize="xs" color="fg.muted" truncate maxW="180px">
                {user?.email}
              </Text>
            </VStack>
          </Box>
          
          <MenuSeparator mx={2} mb={2} />

          <Link to="/profile" style={{ textDecoration: "none", color: "inherit" }}>
            <MenuItem
              value="profile"
              mx={2}
              borderRadius="md"
              gap={3}
              py={2.5}
              cursor="pointer"
              _hover={{ bg: "ui.hover", color: "white" }}
            >
              <FiUser />
              <Text fontWeight="500">My Profile</Text>
            </MenuItem>
          </Link>

          <Link to="/settings" style={{ textDecoration: "none", color: "inherit" }}>
            <MenuItem
              value="settings"
              mx={2}
              borderRadius="md"
              gap={3}
              py={2.5}
              cursor="pointer"
              _hover={{ bg: "ui.hover", color: "white" }}
            >
              <FiSettings />
              <Text fontWeight="500">Settings</Text>
            </MenuItem>
          </Link>

          <MenuSeparator mx={2} my={2} />

          <MenuItem
            value="logout"
            mx={2}
            borderRadius="md"
            gap={3}
            py={2.5}
            cursor="pointer"
            color="ui.danger"
            _hover={{ bg: "ui.danger", color: "white" }}
            onClick={handleLogout}
          >
            <FiLogOut />
            <Text fontWeight="500">Log Out</Text>
          </MenuItem>
        </MenuContent>
      </MenuRoot>
    </Box>
  )
}

export default UserMenu