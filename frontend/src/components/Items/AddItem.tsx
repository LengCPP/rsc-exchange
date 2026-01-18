import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import {
  Button,
  DialogActionTrigger,
  DialogTitle,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useRef, useState } from "react"
import { FaPlus } from "react-icons/fa"

import { type ItemCreate, ItemsService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
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
  DialogTrigger,
} from "../ui/dialog"
import { Field } from "../ui/field"

const AddItem = () => {
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
    formState: { errors, isValid, isSubmitting },
  } = useForm<ItemCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      description: "",
      item_type: ItemType.GENERAL,
      extra_data: {},
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
      .from("rsc-xchange-images")
      .upload(filePath, file)

    if (uploadError) {
      if (uploadError.message === "Bucket not found") {
        throw new Error(
          "Supabase storage bucket 'rsc-xchange-images' not found. Please create it in your Supabase dashboard.",
        )
      }
      throw uploadError
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("rsc-xchange-images").getPublicUrl(filePath)

    return publicUrl
  }

  const mutation = useMutation({
    mutationFn: (data: ItemCreate) =>
      ItemsService.createItem({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Item created successfully.")
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

  const onSubmit: SubmitHandler<ItemCreate> = async (data) => {
    let image_url = ""
    if (imageFile) {
      try {
        image_url = await uploadImage(imageFile)
      } catch (err) {
        handleError(err as ApiError)
        return
      }
    }
    mutation.mutate({ ...data, image_url })
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button value="add-item" my={4}>
          <FaPlus fontSize="16px" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>Fill in the details to add a new item.</Text>
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
                    required: "Title is required.",
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
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
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

export default AddItem
