import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { OpenAPI } from "@/client"
import { request as apiRequest } from "@/client/core/request"
import type {
  InterestPublic,
  UserProfileUpdate,
  UserPublicExtended,
} from "@/customTypes"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { Checkbox } from "../ui/checkbox"
import { Field } from "../ui/field"

const UserProfile = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUserData } = useAuth()
  const currentUser = currentUserData as UserPublicExtended

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<UserProfileUpdate>({
    mode: "onBlur",
    defaultValues: {
      bio: currentUser?.profile?.bio || "",
      interest_ids: currentUser?.interests?.map((i) => i.id) || [],
    },
  })

  // Reset form when user data changes (e.g. after save)
  useEffect(() => {
    if (currentUser) {
      reset({
        bio: currentUser.profile?.bio || "",
        interest_ids: currentUser.interests?.map((i) => i.id) || [],
      })
    }
  }, [currentUser, reset])

  const selectedInterests = watch("interest_ids") || []

  const { data: interests } = useQuery({
    queryKey: ["interests"],
    queryFn: () =>
      apiRequest(OpenAPI, {
        method: "GET",
        url: "/api/v1/interests/",
      }) as Promise<InterestPublic[]>,
  })

  const mutation = useMutation({
    mutationFn: (data: UserProfileUpdate) =>
      apiRequest(OpenAPI, {
        method: "PATCH",
        url: "/api/v1/users/me/profile",
        body: data,
        mediaType: "application/json",
      }),
    onSuccess: () => {
      showSuccessToast("Profile updated successfully.")
      setEditMode(false)
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
    onError: () => {
      showErrorToast("Failed to update profile.")
    },
  })

  const onSubmit = (data: UserProfileUpdate) => {
    mutation.mutate(data)
  }

  const toggleInterest = (id: string) => {
    const current = selectedInterests
    if (current.includes(id)) {
      setValue(
        "interest_ids",
        current.filter((i) => i !== id),
        { shouldDirty: true },
      )
    } else {
      setValue("interest_ids", [...current, id], { shouldDirty: true })
    }
  }

  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        Profile Details
      </Heading>
      <Box as="form" onSubmit={handleSubmit(onSubmit)} maxW="xl">
        <Field label="Bio">
          {editMode ? (
            <Textarea
              {...register("bio")}
              placeholder="Tell us about yourself"
            />
          ) : (
            <Text
              p={2}
              borderWidth="1px"
              borderRadius="md"
              minH="50px"
              whiteSpace="pre-wrap"
            >
              {currentUser?.profile?.bio || "No bio set."}
            </Text>
          )}
        </Field>

        <Field label="Interests" mt={4}>
          <VStack align="start" gap={2}>
            {!editMode ? (
              <Flex gap={2} wrap="wrap">
                {currentUser?.interests?.length ? (
                  currentUser.interests.map((i) => (
                    <Box
                      key={i.id}
                      px={2}
                      py={1}
                      bg="bg.subtle"
                      borderRadius="md"
                      fontSize="sm"
                    >
                      {i.name}
                    </Box>
                  ))
                ) : (
                  <Text color="fg.muted">No interests selected.</Text>
                )}
              </Flex>
            ) : (
              <Flex gap={4} wrap="wrap">
                {interests?.map((interest) => (
                  <Checkbox
                    key={interest.id}
                    checked={selectedInterests.includes(interest.id)}
                    onCheckedChange={() => toggleInterest(interest.id)}
                  >
                    {interest.name}
                  </Checkbox>
                ))}
              </Flex>
            )}
          </VStack>
        </Field>

        <Flex mt={6} gap={3}>
          {editMode ? (
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          ) : (
            <Button type="button" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          )}

          {editMode && (
            <Button
              variant="subtle"
              colorPalette="gray"
              onClick={() => {
                reset()
                setEditMode(false)
              }}
            >
              Cancel
            </Button>
          )}
        </Flex>
      </Box>
    </Container>
  )
}

export default UserProfile
