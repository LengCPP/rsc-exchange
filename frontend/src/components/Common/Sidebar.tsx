import { Box, Flex, IconButton, Text } from "@chakra-ui/react"
import { useQueryClient } from "@tanstack/react-query"
import { Link as RouterLink } from "@tanstack/react-router"
import { useState } from "react"
import { FaBars } from "react-icons/fa"
import { FiSettings } from "react-icons/fi"

import type { UserPublic } from "@/client"
import { ColorModeButton } from "../ui/color-mode"
import {
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerRoot,
  DrawerTrigger,
} from "../ui/drawer"
import SidebarItems from "./SidebarItems"

const Sidebar = () => {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Mobile */}
      <Flex
        display={{ base: "flex", md: "none" }}
        position="absolute"
        zIndex="100"
        m={4}
        gap={2}
      >
        <DrawerRoot
          placement="start"
          open={open}
          onOpenChange={(e) => setOpen(e.open)}
        >
          <DrawerBackdrop />
          <DrawerTrigger asChild>
            <IconButton variant="ghost" color="inherit" aria-label="Open Menu">
              <FaBars />
            </IconButton>
          </DrawerTrigger>
          <DrawerContent maxW="280px" h="full">
            <DrawerCloseTrigger />
            <DrawerBody>
              <Flex flexDir="column" h="full">
                <SidebarItems />
                <Box mt={4}>
                  <RouterLink to="/settings">
                    <Flex
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
                      <FiSettings />
                      <Text>Settings</Text>
                    </Flex>
                  </RouterLink>
                </Box>
                {currentUser?.email && (
                  <Flex alignItems="center">
                    <Text fontSize="xs" p={4} color="gray.500">
                      Logged in as: {currentUser.email}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </DrawerBody>
            <DrawerCloseTrigger />
          </DrawerContent>
        </DrawerRoot>
        <ColorModeButton />
      </Flex>

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
            <RouterLink to="/settings">
              <Flex
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
                <FiSettings />
                <Text>Settings</Text>
              </Flex>
            </RouterLink>
          </Box>
          {currentUser?.email && (
            <Flex alignItems="center">
              <Text fontSize="xs" p={4} color="gray.500">
                Logged in as: {currentUser.email}
              </Text>
            </Flex>
          )}
        </Flex>
      </Box>
    </>
  )
}

export default Sidebar
