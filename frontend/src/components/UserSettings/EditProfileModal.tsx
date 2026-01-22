import {
  Button,
  Flex,
  Input,
  Textarea,
  VStack,
  Heading,
  Separator,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"

import { OpenAPI, UsersService } from "@/client"
import { request as apiRequest } from "@/client/core/request"
import type {
  InterestPublic,
  UserProfileUpdate,
  UserPublicExtended,
  UserUpdateMe,
} from "@/customTypes"
import useCustomToast from "@/hooks/useCustomToast"
import { Checkbox } from "../ui/checkbox"
import {
  DialogActionTrigger,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface EditProfileModalProps {
  user: UserPublicExtended
  isOpen: boolean
  onClose: () => void
}

type EditProfileFormValues = UserUpdateMe & UserProfileUpdate

const EditProfileModal = ({ user, isOpen, onClose }: EditProfileModalProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<EditProfileFormValues>({
    mode: "onBlur",
    defaultValues: {
      full_name: user.full_name || "",
      email: user.email || "",
      bio: user.profile?.bio || "",
      alias: user.profile?.alias || "",
      interest_ids: user.interests?.map((i) => i.id) || [],
    },
  })

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
    mutationFn: async (data: EditProfileFormValues) => {
      const userUpdate: UserUpdateMe = {
        full_name: data.full_name,
        email: data.email,
      }
      const profileUpdate: UserProfileUpdate = {
        bio: data.bio,
        alias: data.alias,
        interest_ids: data.interest_ids,
      }

      await Promise.all([
        UsersService.updateUserMe({ requestBody: userUpdate }),
        apiRequest(OpenAPI, {
          method: "PATCH",
          url: "/api/v1/users/me/profile",
          body: profileUpdate,
          mediaType: "application/json",
        }),
      ])
    },
    onSuccess: () => {
      showSuccessToast("Profile updated successfully.")
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      onClose()
    },
    onError: () => {
      showErrorToast("Failed to update profile.")
    },
  })

  const onSubmit = (data: EditProfileFormValues) => {
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
    <DialogRoot
      open={isOpen}
      onOpenChange={(details) => !details.open && onClose()}
      size="lg"
      scrollBehavior="inside"
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <DialogCloseTrigger />
        <DialogBody>
          <VStack as="form" id="edit-profile-form" gap={4} align="stretch" onSubmit={handleSubmit(onSubmit)}>
            <Heading size="xs" mt={2}>General Info</Heading>
            <Field label="Name" invalid={!!errors.full_name} errorText={errors.full_name?.message}>
              <Input {...register("full_name")} placeholder="Full Name" />
            </Field>
            <Field label="Alias" invalid={!!errors.alias} errorText={errors.alias?.message}>
              <Input {...register("alias")} placeholder="Nickname / Alias" />
            </Field>
            <Field label="Bio" invalid={!!errors.bio} errorText={errors.bio?.message}>
              <Textarea {...register("bio")} placeholder="Tell us about yourself" />
            </Field>

            <Separator my={2} />
            <Heading size="xs">Contact Details</Heading>
            <Field label="Email" invalid={!!errors.email} errorText={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="Email Address" />
            </Field>

            <Separator my={2} />
            <Heading size="xs">Interests</Heading>
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
          </VStack>
        </DialogBody>
        <DialogFooter>
          <DialogActionTrigger asChild>
            <Button variant="subtle" colorPalette="gray" onClick={onClose}>
              Cancel
            </Button>
          </DialogActionTrigger>
          <Button type="submit" form="edit-profile-form" loading={isSubmitting}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  )
}

export default EditProfileModal
