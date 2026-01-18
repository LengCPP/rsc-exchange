import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { FiEdit } from "react-icons/fi"

import { CommunitiesService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import type { CommunityUpdate } from "@/client/types.gen"
import type { CommunityPublicExtended, CommunityUpdateExtended } from "@/customTypes"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"
import { Checkbox } from "../ui/checkbox"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface EditCommunityProps {
  community: CommunityPublicExtended
}

const EditCommunity = ({ community }: EditCommunityProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid, isSubmitting },
  } = useForm<CommunityUpdateExtended>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      name: community.name,
      description: community.description,
      is_closed: community.is_closed,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: CommunityUpdateExtended) =>
      CommunitiesService.updateCommunity({ 
        id: community.id, 
        requestBody: data as unknown as CommunityUpdate 
      }),
    onSuccess: () => {
      showSuccessToast("Community updated successfully.")
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] })
      queryClient.invalidateQueries({ queryKey: ["community", community.id] })
    },
  })

  const onSubmit: SubmitHandler<CommunityUpdateExtended> = (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    setIsOpen(false)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button size="xs" variant="outline" title="Edit Community">
          <FiEdit />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Community</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the details of the community.</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.name}
                errorText={errors.name?.message}
                label="Name"
              >
                <Input
                  id="name"
                  {...register("name", {
                    required: "Name is required.",
                  })}
                  placeholder="Community Name"
                  type="text"
                />
              </Field>

              <Field
                invalid={!!errors.description}
                errorText={errors.description?.message}
                label="Description"
              >
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="Description"
                  type="text"
                />
              </Field>

              <Controller
                control={control}
                name="is_closed"
                render={({ field }) => (
                  <Field disabled={field.disabled}>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={({ checked }) => field.onChange(checked)}
                    >
                      Private / Closed Community
                    </Checkbox>
                  </Field>
                )}
              />
            </VStack>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
                onClick={onCancel}
              >
                Cancel
              </Button>
            </DialogActionTrigger>
            <Button
              variant="solid"
              type="submit"
              disabled={!isValid}
              loading={isSubmitting}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditCommunity
