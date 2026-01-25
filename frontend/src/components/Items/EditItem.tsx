import {
  Box,
  Button,
  ButtonGroup,
  DialogActionTrigger,
  HStack,
  Image,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaExchangeAlt } from "react-icons/fa"

import {
  type ApiError,
  type Body_items_update_item,
  type ItemPublic,
  ItemsService,
} from "@/client"
import { useColorModeValue } from "@/components/ui/color-mode"
import useCustomToast from "@/hooks/useCustomToast"
import { getImageUrl, handleError } from "@/utils"
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

const BOOK_CLASSIFICATION: Record<string, string[]> = {
  Fiction: [
    "Fantasy",
    "Science Fiction (Sci-Fi)",
    "Mystery & Crime",
    "Thriller & Suspense",
    "Romance",
    "Historical Fiction",
    "Horror",
    "Literary Fiction",
    "Adventure",
    "Dystopian",
    "Graphic Novels & Comics",
    "Westerns",
  ],
  "Non-Fiction": [
    "Biography & Memoir",
    "Self-Help & Personal Development",
    "History",
    "Science & Nature",
    "Business & Money",
    "Health & Fitness",
    "Travel",
    "Cookbooks & Food",
    "Religion & Spirituality",
    "Philosophy",
    "Politics & Social Sciences",
    "True Crime",
    "Art & Photography",
    "Essays & Criticism",
  ],
  "Children's & Young Adult": [
    "Board Books",
    "Picture Books",
    "Early Readers",
    "Middle Grade",
    "Young Adult (YA)",
  ],
  "Academic & Professional": [
    "Textbooks",
    "Reference (Dictionaries, Encyclopedias)",
    "Medical",
    "Law",
    "Computer Science & Technology",
    "Engineering",
  ],
}

const EditItem = ({ item }: EditItemProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()

  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Color mode responsive styles for raw HTML elements
  const selectBg = useColorModeValue("white", "gray.800")
  const selectColor = useColorModeValue("black", "white")
  const selectBorder = useColorModeValue("#ccc", "gray.600")

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
      image_url: item.image_url ?? "",
    },
  })

  const itemType = watch("item_type")
  const description = watch("description") || ""
  const selectedCategory = watch("extra_data.category" as any)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] || null)
  }

  const mutation = useMutation({
    mutationFn: (data: Body_items_update_item) =>
      ItemsService.updateItem({ id: item.id, formData: data }),
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
    const itemData: Body_items_update_item = {
      title: data.title,
      description: data.description,
      item_type: data.item_type,
      extra_data: JSON.stringify(data.extra_data || {}),
      image: imageFile,
      image_url: data.image_url,
    }
    mutation.mutate(itemData)
  }

  const selectStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: `1px solid ${selectBorder}`,
    backgroundColor: selectBg,
    color: selectColor,
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
                  id="edit_item_type"
                  {...register("item_type")}
                  style={selectStyle}
                >
                  <option value="general" style={{ backgroundColor: selectBg }}>
                    General
                  </option>
                  <option value="book" style={{ backgroundColor: selectBg }}>
                    Book
                  </option>
                </select>
              </Field>

              <Field
                required
                invalid={!!errors.title}
                errorText={errors.title?.message}
                label="Title"
              >
                <Input
                  id="edit_title"
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
                helperText={
                  <HStack justify="space-between" width="full">
                    <Text fontSize="xs">Brief summary of the item.</Text>
                    <Text
                      fontSize="xs"
                      color={description.length > 1000 ? "red.500" : "inherit"}
                    >
                      {description.length}/1000
                    </Text>
                  </HStack>
                }
              >
                <Textarea
                  id="edit_description"
                  {...register("description", {
                    maxLength: {
                      value: 1000,
                      message: "Maximum 1000 characters",
                    },
                  })}
                  placeholder="Description"
                  rows={5}
                />
              </Field>

              {itemType === "book" && (
                <>
                  <Field label="Author">
                    <Input
                      id="edit_author"
                      placeholder="Author"
                      {...register("extra_data.author" as any)}
                    />
                  </Field>
                  <Field label="ISBN">
                    <Input
                      id="edit_isbn"
                      placeholder="ISBN"
                      {...register("extra_data.isbn" as any)}
                    />
                  </Field>
                  <HStack width="full" gap={4}>
                    <Field label="Category" flex={1}>
                      <select
                        id="edit_category"
                        {...register("extra_data.category" as any)}
                        style={selectStyle}
                      >
                        <option value="" style={{ backgroundColor: selectBg }}>
                          Select Category
                        </option>
                        {Object.keys(BOOK_CLASSIFICATION).map((cat) => (
                          <option
                            key={cat}
                            value={cat}
                            style={{ backgroundColor: selectBg }}
                          >
                            {cat}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Genre" flex={1}>
                      <select
                        id="edit_genre"
                        {...register("extra_data.genre" as any)}
                        style={selectStyle}
                        disabled={!selectedCategory}
                      >
                        <option value="" style={{ backgroundColor: selectBg }}>
                          Select Genre
                        </option>
                        {selectedCategory &&
                          BOOK_CLASSIFICATION[selectedCategory].map(
                            (genre) => (
                              <option
                                key={genre}
                                value={genre}
                                style={{ backgroundColor: selectBg }}
                              >
                                {genre}
                              </option>
                            ),
                          )}
                      </select>
                    </Field>
                  </HStack>
                </>
              )}

              <Field label="Upload New Image">
                {item.image_url && !imageFile && (
                  <Box mb={2}>
                    <Image
                      src={getImageUrl(item.image_url)}
                      alt="Current"
                      height="100px"
                      objectFit="cover"
                      borderRadius="md"
                    />
                  </Box>
                )}
                <Input
                  id="edit_image_file"
                  name="edit_image_file"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                />
              </Field>

              <Field label="Image URL">
                <Input
                  id="edit_image_url"
                  placeholder="https://example.com/image.jpg"
                  {...register("image_url")}
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
              <Button
                variant="solid"
                type="submit"
                loading={isSubmitting}
                disabled={description.length > 1000}
              >
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
