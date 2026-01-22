import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"

import { UsersService } from "@/client"
import UserAvatar from "@/components/Common/UserAvatar"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

const UserProfilePicture = () => {
  const { user } = useAuth()
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
    fileInputRef.current?.click()
  }

  return (
    <Box>
      <Heading size="md" mb={4}>Profile Picture</Heading>
      <Flex align="center" gap={6} direction={{ base: "column", sm: "row" }}>
        <UserAvatar user={user as any} size="100px" />
        <VStack align="start" gap={2}>
          <Text fontSize="sm" color="gray.500">
            JPG, GIF or PNG. Max size of 2MB
          </Text>
          <Button
            size="sm"
            onClick={handleButtonClick}
            loading={isUploading}
            variant="outline"
          >
            Upload New Photo
          </Button>
          <Input
            type="file"
            display="none"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileChange}
          />
        </VStack>
      </Flex>
    </Box>
  )
}

export default UserProfilePicture
