import {
  Box,
  Button,
  ButtonGroup,
  DialogActionTrigger,
  Image,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaExchangeAlt } from "react-icons/fa"

import { type ApiError, type ItemPublic, ItemsService } from "@/client"
import { ItemType } from "@/customTypes"
import useCustomToast from "@/hooks/useCustomToast"
import { supabase } from "@/supabase"
import { handleError } from "@/utils"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface EditItemProps {
  item: ItemPublic
}

const EditItem = ({ item }: EditItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ItemPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      ...item,
      description: item.description ?? undefined,
    },
  })

  const itemType = watch("item_type")

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setImageFile(e.target.files[0])
    }
  }

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split(".").pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `item-images/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("items")
      .upload(filePath, file)

    if (uploadError) {
      if (uploadError.message === "Bucket not found") {
        throw new Error(
          "Supabase storage bucket 'items' not found. Please create it in your Supabase dashboard.",
        )
      }
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("items").getPublicUrl(filePath)

    return publicUrl
  }

  const mutation = useMutation({
    mutationFn: (data: any) =>
      ItemsService.updateItem({ id: item.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Item updated successfully.")
      reset()
      setImageFile(null)
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
    },
  })

  const onSubmit: SubmitHandler<ItemPublic> = async (data) => {
    let image_url = item.image_url
    if (imageFile) {
      try {
        image_url = await uploadImage(imageFile)
      } catch (err) {
        handleError(err as ApiError)
        return
      }
    }

    const { owners, id, count, ...updateData } = data as any
    mutation.mutate({ ...updateData, image_url })
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost">
          <FaExchangeAlt fontSize="16px" />
          Edit Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Update the item details below.</Text>
            <VStack gap={4}>
              <Field label="Item Type">
                <select
                  {...register("item_type")}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "4px",
                    border: "1px solid #ccc",
                    backgroundColor: "transparent",
                  }}
                >
                  <option value={ItemType.GENERAL}>General</option>
                  <option value={ItemType.BOOK}>Book</option>
                </select>
              </Field>

              <Field
                required
                invalid={!!errors.title}
                errorText={errors.title?.message}
                label="Title"
              >
                <Input
                  id="title"
                  {...register("title", {
                    required: "Title is required",
                  })}
                  placeholder="Title"
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

              {itemType === ItemType.BOOK && (
                <>
                  <Field label="Author">
                    <Input
                      placeholder="Author"
                      {...register("extra_data.author" as any)}
                    />
                  </Field>
                  <Field label="ISBN">
                    <Input
                      placeholder="ISBN"
                      {...register("extra_data.isbn" as any)}
                    />
                  </Field>
                </>
              )}

              <Field label="Image">
                {item.image_url && !imageFile && (
                  <Box mb={2}>
                    <Image
                      src={item.image_url}
                      alt="Current"
                      height="100px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                  </Box>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                />
              </Field>
            </VStack>
          </DialogBody>

          <DialogFooter gap={2}>
            <ButtonGroup>
              <DialogActionTrigger asChild>
                <Button
                  variant="subtle"
                  colorPalette="gray"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </DialogActionTrigger>
              <Button variant="solid" type="submit" loading={isSubmitting}>
                Save
              </Button>
            </ButtonGroup>
          </DialogFooter>
        </form>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default EditItem
