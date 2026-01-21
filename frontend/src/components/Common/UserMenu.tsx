import { Box, Button, Flex, HStack, Text, VStack } from "@chakra-ui/react"
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
            _hover={{ bg: "gray.100" }}
            data-testid="user-menu"
          >
            <HStack gap={2}>
              <Box rounded="full" overflow="hidden" border="2px solid" borderColor="orange.400">
                <UserAvatar user={user as any} size="32px" fontSize="xs" />
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
              <Text fontWeight="600" color="gray.800" fontSize="sm" truncate maxW="180px">
                {name}
              </Text>
              <Text fontSize="xs" color="gray.500" truncate maxW="180px">
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
              _hover={{ bg: "orange.50", color: "orange.600" }}
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
              _hover={{ bg: "orange.50", color: "orange.600" }}
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
            color="red.500"
            _hover={{ bg: "red.50", color: "red.600" }}
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