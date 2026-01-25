import {
  Box,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { FaBell, FaCircle } from "react-icons/fa"
import { NotificationsService } from "../../client"
import { useNotifications } from "../../hooks/useNotifications"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

const NotificationsMenu = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data: notifications, isLoading } = useNotifications()

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      NotificationsService.markNotificationAsRead({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => NotificationsService.markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id)
    }
    if (notification.link) {
      // If it's a community link, we can try to navigate more explicitly
      const communityMatch = notification.link.match(/\/communities\/([a-f0-9-]+)/i)
      if (communityMatch) {
        navigate({
          to: "/communities/$communityId",
          params: { communityId: communityMatch[1] },
        })
      } else {
        navigate({ to: notification.link as any })
      }
    }
  }

  const unreadCount = notifications?.unread_count || 0

  return (
    <MenuRoot size="sm" positioning={{ placement: "bottom-end" }}>
      <MenuTrigger asChild>
        <Box position="relative">
          <IconButton variant="ghost" aria-label="Notifications" rounded="full">
            <FaBell />
          </IconButton>
          {unreadCount > 0 && (
            <Flex
              position="absolute"
              top="1"
              right="1"
              bg="red.500"
              color="white"
              rounded="full"
              minW="4"
              h="4"
              px={1}
              align="center"
              justify="center"
              fontSize="10px"
              fontWeight="bold"
              zIndex={1}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Flex>
          )}
        </Box>
      </MenuTrigger>
      <MenuContent minW="xs" maxH="md" overflowY="auto">
        <Flex
          justify="space-between"
          align="center"
          px={4}
          py={2}
          borderBottomWidth="1px"
        >
          <Text fontWeight="bold">Notifications</Text>
          {unreadCount > 0 && (
            <Text
              fontSize="xs"
              color="blue.500"
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                markAllAsReadMutation.mutate()
              }}
            >
              Mark all as read
            </Text>
          )}
        </Flex>
        {isLoading ? (
          <Flex justify="center" p={4}>
            <Spinner size="sm" />
          </Flex>
        ) : !notifications || notifications.data.length === 0 ? (
          <Box p={4}>
            <Text fontSize="sm" color="gray.500">
              No notifications
            </Text>
          </Box>
        ) : (
          <VStack align="stretch" gap={0}>
            {notifications.data.map((notification) => (
              <MenuItem
                value={notification.id}
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                _hover={{ bg: "bg.muted" }}
                px={4}
                py={3}
                cursor="pointer"
              >
                <Flex gap={3} w="100%" align="start">
                  <Box mt={1.5} w={2}>
                    {!notification.is_read && (
                      <Icon color="blue.500" fontSize="8px">
                        <FaCircle />
                      </Icon>
                    )}
                  </Box>
                  <VStack align="start" gap={0} flex={1}>
                    <Text
                      fontWeight={notification.is_read ? "normal" : "bold"}
                      fontSize="sm"
                    >
                      {notification.title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {notification.message}
                    </Text>
                    <Text fontSize="10px" color="fg.subtle" mt={1}>
                      {new Date(notification.created_at).toLocaleString()}
                    </Text>
                  </VStack>
                </Flex>
              </MenuItem>
            ))}
          </VStack>
        )}
      </MenuContent>
    </MenuRoot>
  )
}

export default NotificationsMenu