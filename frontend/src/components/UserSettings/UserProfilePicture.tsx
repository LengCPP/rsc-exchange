import {
  Box,
  Button,
  Flex,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { FiCamera } from "react-icons/fi"

import { UsersService } from "@/client"
import UserAvatar from "@/components/Common/UserAvatar"
import type { UserPublicExtended } from "@/customTypes"
import useCustomToast from "@/hooks/useCustomToast"

interface UserProfilePictureProps {
  user: UserPublicExtended
  isReadOnly?: boolean
}

const UserProfilePicture = ({ user, isReadOnly = false }: UserProfilePictureProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      return UsersService.uploadUserProfilePicture({ formData: { file: file } })
    },
    onSuccess: () => {
      showSuccessToast("Profile picture updated successfully.")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: (err: any) => {
      const msg = err.body?.detail || "Failed to upload profile picture"
      showErrorToast(msg)
    },
    onSettled: () => {
      setIsUploading(false)
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(true)
      uploadMutation.mutate(file)
    }
  }

  const handleButtonClick = () => {
    if (!isReadOnly) {
      fileInputRef.current?.click()
    }
  }

  return (
    <Box>
      <Flex align="center" gap={6} direction={{ base: "column", sm: "row" }}>
        <Box position="relative" role="group" onClick={handleButtonClick} cursor={isReadOnly ? "default" : "pointer"}>
          <UserAvatar user={user as any} size="100px" />
          {!isReadOnly && (
            <Box
              position="absolute"
              inset="2px" // Account for the ring in UserAvatar
              bg="blackAlpha.400"
              display="none"
              _groupHover={{ display: "flex" }}
              alignItems="center"
              justifyContent="center"
              borderRadius="full"
            >
              <FiCamera color="white" size="24px" />
            </Box>
          )}
        </Box>
        <VStack align="start" gap={2}>
          <VStack align="start" gap={0}>
            <Text fontSize="xl" fontWeight="bold">
              {user?.full_name || user?.email}
            </Text>
            {user?.profile?.alias && (
              <Text fontSize="sm" color="fg.muted">
                @{user.profile.alias}
              </Text>
            )}
          </VStack>
          
          <Flex gap={2} wrap="wrap">
            {user?.interests?.length ? (
              user.interests.map((i) => (
                <Box
                  key={i.id}
                  px={2}
                  py={0.5}
                  bg="teal.subtle"
                  color="teal.fg"
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="medium"
                >
                  {i.name}
                </Box>
              ))
            ) : (
              <Text fontSize="xs" color="fg.muted">No interests selected</Text>
            )}
          </Flex>

          {!isReadOnly && (
            <>
              <Button
                size="xs"
                variant="ghost"
                onClick={handleButtonClick}
                loading={isUploading}
                colorPalette="teal"
              >
                Change Photo
              </Button>
              <Input
                type="file"
                display="none"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
              />
            </>
          )}
        </VStack>
      </Flex>
    </Box>
  )
}

export default UserProfilePicture
