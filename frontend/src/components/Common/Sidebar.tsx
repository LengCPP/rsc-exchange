import { Box, Flex, IconButton, Text, Spacer } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { FiLogOut } from "react-icons/fi"

import type { UserPublic } from "@/client"
import useAuth from "@/hooks/useAuth"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"
import SidebarItems from "./SidebarItems"
import { ColorModeButton } from "../ui/color-mode"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    logout()
  }

  return (
    <>
      {/* Mobile */}
      <DrawerRoot
        placement="start"
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
      >
        <DrawerBackdrop />
        <DrawerTrigger asChild>
          <IconButton
            variant="ghost"
            color="inherit"
            display={{ base: "flex", md: "none" }}
            aria-label="Open Menu"
            position="absolute"
            zIndex="100"
            m={4}
          >
            <FaBars />
          </IconButton>
        </DrawerTrigger>
        <DrawerContent maxW="280px" h="full">
          <DrawerCloseTrigger />
          <DrawerBody>
            <Flex flexDir="column" h="full">
              <SidebarItems />
              <Box mt={4}>
                <Flex
                  as="button"
                  onClick={handleLogout}
                  alignItems="center"
                  gap={4}
                  px={4}
                  py={2}
                  _hover={{
                    background: "gray.subtle",
                  }}
                  w="full"
                  fontSize="sm"
                >
                  <FiLogOut />
                  <Text>Log Out</Text>
                </Flex>
              </Box>
              {currentUser?.email && (
                <Flex alignItems="center">
                  <Text fontSize="xs" p={4} color="gray.500">
                    Logged in as: {currentUser.email}
                  </Text>
                  <Spacer />
                  <Box p={4}>
                    <ColorModeButton />
                  </Box>
                </Flex>
              )}
            </Flex>
          </DrawerBody>
          <DrawerCloseTrigger />
        </DrawerContent>
      </DrawerRoot>

      {/* Desktop */}

      <Box
        display={{ base: "none", md: "flex" }}
        position="sticky"
        bg="bg.subtle"
        top={0}
        minW="280px"
        h="100vh"
        p={4}
      >
        <Flex w="100%" direction="column">
          <SidebarItems />
          <Box mt={4}>
            <Flex
              as="button"
              onClick={handleLogout}
              alignItems="center"
              gap={4}
              px={4}
              py={2}
              _hover={{
                background: "gray.subtle",
              }}
              w="full"
              fontSize="sm"
            >
              <FiLogOut />
              <Text>Log Out</Text>
            </Flex>
          </Box>
          {currentUser?.email && (
            <Flex alignItems="center">
              <Text fontSize="xs" p={4} color="gray.500">
                Logged in as: {currentUser.email}
              </Text>
              <Spacer />
              <Box p={4}>
                <ColorModeButton />
              </Box>
            </Flex>
          )}
        </Flex>
      </Box>
    </>
  )
}

export default Sidebar
