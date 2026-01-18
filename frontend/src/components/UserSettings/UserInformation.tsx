import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  IconButton,
  Input,
  Text,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaShare, FaUserCircle } from "react-icons/fa"

import {
  type ApiError,
  type UserPublic,
  type UserUpdateMe,
  UsersService,
} from "@/client"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, formatPublicId, handleError } from "@/utils"
import { Field } from "../ui/field"

const UserInformation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UserPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("User updated successfully.")
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit: SubmitHandler<UserUpdateMe> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    toggleEditMode()
  }

  const handleShareId = async () => {
    const formattedId = formatPublicId(currentUser?.public_id)
    try {
      await navigator.clipboard.writeText(formattedId)
      showSuccessToast("User ID copied to clipboard!")
    } catch (err) {
      handleError({ message: "Failed to copy to clipboard" } as ApiError)
    }
  }

  return (
    <>
      <Container maxW="full">
        <Heading size="sm" py={4}>
          User Information
        </Heading>
        <Box
          w={{ sm: "full", md: "50%" }}
          as="form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Flex align="center" mb={6} gap={4}>
            <FaUserCircle size="60px" color="gray" />
            <Box>
              <Text fontSize="sm" color="gray.500">
                Avatar
              </Text>
              <Text fontSize="xs" color="gray.400">
                Profile picture upload coming soon
              </Text>
            </Box>
          </Flex>

          <Field label="User ID">
            <Flex align="center" gap={2}>
              <Text
                fontSize="md"
                py={2}
                fontWeight="semibold"
                letterSpacing="wide"
                fontFamily="mono"
              >
                {formatPublicId(currentUser?.public_id)}
              </Text>
              <IconButton
                aria-label="Share User ID"
                size="sm"
                variant="ghost"
                onClick={handleShareId}
                title="Copy ID to share with friends"
              >
                <FaShare />
              </IconButton>
            </Flex>
          </Field>
          <Field mt={4} label="Full name">
            {editMode ? (
              <Input
                {...register("full_name", { maxLength: 30 })}
                type="text"
                size="md"
                w="auto"
              />
            ) : (
              <Text
                fontSize="md"
                py={2}
                color={!currentUser?.full_name ? "gray" : "inherit"}
                truncate
                maxWidth="250px"
              >
                {currentUser?.full_name || "N/A"}
              </Text>
            )}
          </Field>
          <Field
            mt={4}
            label="Email"
            invalid={!!errors.email}
            errorText={errors.email?.message}
          >
            {editMode ? (
              <Input
                {...register("email", {
                  required: "Email is required",
                  pattern: emailPattern,
                })}
                type="email"
                size="md"
                w="auto"
              />
            ) : (
              <Text fontSize="md" py={2} truncate maxWidth="250px">
                {currentUser?.email}
              </Text>
            )}
          </Field>
          <Flex mt={4} gap={3}>
            <Button
              variant="solid"
              onClick={toggleEditMode}
              type={editMode ? "button" : "submit"}
              loading={editMode ? isSubmitting : false}
              disabled={editMode ? !isDirty || !getValues("email") : false}
            >
              {editMode ? "Save" : "Edit"}
            </Button>
            {editMode && (
              <Button
                variant="subtle"
                colorPalette="gray"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </Flex>
        </Box>
      </Container>
    </>
  )
}

export default UserInformation
