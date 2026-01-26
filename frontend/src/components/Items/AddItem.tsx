import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"

import {
  Box,
  Button,
  DialogActionTrigger,
  DialogTitle,
  Flex,
  HStack,
  Input,
  Tabs,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react"
import { useRef, useState } from "react"
import { FaPlus } from "react-icons/fa"

import {
  type Body_items_create_item,
  CollectionsService,
  CommunitiesService,
  ItemsService,
} from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import { BookSearchInput } from "@/components/BookSearchInput"
import { useColorModeValue } from "@/components/ui/color-mode"
import useAuth from "@/hooks/useAuth"
import type { BookResult } from "@/hooks/useBookSearch"
import useCustomToast from "@/hooks/useCustomToast"
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

interface ItemCreate {
  title: string
  description?: string
  item_type?: string
  extra_data?: {
    author?: string
    isbn?: string
    category?: string
    genre?: string
    [key: string]: any
  }
  image_url?: string
}

export const BOOK_CLASSIFICATION: Record<string, string[]> = {
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

const AddItem = ({
  communityId,
  collectionId,
  isAdmin,
}: { communityId?: string; collectionId?: string; isAdmin?: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<"create" | "pool">("pool")
  const [searchQuery, setSearchQuery] = useState("")
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

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
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<ItemCreate>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      title: "",
      description: "",
      item_type: "general",
      extra_data: {},
      image_url: "",
    },
  })

  const itemType = watch("item_type")
  const description = watch("description") || ""
  const selectedCategory = watch("extra_data.category")

  const { data: myItems } = useQuery({
    queryKey: ["my-items-for-community"],
    queryFn: () =>
      ItemsService.readItems({
        ownerId: currentUser?.id,
      }),
    enabled: isOpen && !!communityId && mode === "pool" && !!currentUser,
  })

  const poolMutation = useMutation({
    mutationFn: (itemId: string) =>
      CommunitiesService.addItemToCommunity({ id: communityId!, itemId }),
    onSuccess: () => {
      showSuccessToast("Item added to community pool!")
      queryClient.invalidateQueries({
        queryKey: ["communityItems", communityId],
      })
    },
    onError: () => showErrorToast("Failed to add item"),
  })

  const handleBookSelect = (book: BookResult) => {
    setValue("title", book.title, { shouldValidate: true })
    setValue("description", book.description.substring(0, 1000))
    setValue("extra_data.author", book.authors.join(", "))
    setValue("extra_data.isbn", book.isbn)
    setValue("image_url", book.thumbnail)

    if (book.categories && book.categories.length > 0) {
      const gCategory = book.categories[0]
      for (const [cat, genres] of Object.entries(BOOK_CLASSIFICATION)) {
        if (
          genres.some((g) => gCategory.includes(g)) ||
          gCategory.includes(cat)
        ) {
          setValue("extra_data.category", cat)
          const matchedGenre = genres.find((g) => gCategory.includes(g))
          if (matchedGenre) {
            setValue("extra_data.genre", matchedGenre)
          }
          break
        }
      }
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageFile(e.target.files?.[0] || null)
  }

  const mutation = useMutation({
    mutationFn: (data: Body_items_create_item) =>
      ItemsService.createItem({ formData: data }),
    onSuccess: (newItem) => {
      showSuccessToast(
        communityId
          ? "Community item created successfully."
          : "Item created successfully.",
      )

      // If we are in a collection view, add the newly created item to the collection
      if (collectionId) {
        CollectionsService.addItemToCollection({
          id: collectionId,
          itemId: newItem.id,
        })
          .then(() => {
            showSuccessToast("Item added to collection.")
            queryClient.invalidateQueries({
              queryKey: ["collections", collectionId],
            })
          })
          .catch(() => {
            showErrorToast("Failed to add new item to collection.")
          })
      }

      reset()
      setImageFile(null)
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] })
      if (communityId) {
        queryClient.invalidateQueries({
          queryKey: ["communityItems", communityId],
        })
      }
    },
  })

  const onSubmit: SubmitHandler<ItemCreate> = async (data) => {
    const itemData: Body_items_create_item = {
      title: data.title,
      description: data.description,
      item_type: data.item_type,
      extra_data: JSON.stringify(data.extra_data || {}),
      image: imageFile,
      image_url: data.image_url,
      community_owner_id: communityId,
    }
    mutation.mutate(itemData)
  }

  const filteredItems = myItems?.data.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "4px",
    border: `1px solid ${selectBorder}`,
    backgroundColor: selectBg,
    color: selectColor,
  }

  const creationFormContent = (
    <form onSubmit={handleSubmit(onSubmit)}>
      <VStack gap={4}>
        <Text fontSize="sm" color="fg.muted">
          {communityId
            ? "Create an item that is directly owned by the community itself."
            : "Fill in the details to add a new item."}
        </Text>
        <Field label="Item Type">
          <select id="item_type" {...register("item_type")} style={selectStyle}>
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
          {itemType === "book" ? (
            <BookSearchInput
              id="title"
              name="title"
              onSelect={handleBookSelect}
            />
          ) : (
            <Input
              id="title"
              {...register("title", {
                required: "Title is required.",
              })}
              placeholder="Title"
              type="text"
            />
          )}
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
            id="description"
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
                id="author"
                placeholder="Author"
                {...register("extra_data.author" as any)}
              />
            </Field>
            <Field label="ISBN">
              <Input
                id="isbn"
                placeholder="ISBN"
                {...register("extra_data.isbn" as any)}
              />
            </Field>
            <HStack width="full" gap={4}>
              <Field label="Category" flex={1}>
                <select
                  id="category"
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
                  id="genre"
                  {...register("extra_data.genre" as any)}
                  style={selectStyle}
                  disabled={!selectedCategory}
                >
                  <option value="" style={{ backgroundColor: selectBg }}>
                    Select Genre
                  </option>
                  {selectedCategory &&
                    BOOK_CLASSIFICATION[selectedCategory].map((genre) => (
                      <option
                        key={genre}
                        value={genre}
                        style={{ backgroundColor: selectBg }}
                      >
                        {genre}
                      </option>
                    ))}
                </select>
              </Field>
            </HStack>
          </>
        )}

        <Field label="Upload Image">
          <Input
            id="image_file"
            name="image_file"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            ref={fileInputRef}
          />
        </Field>

        <Field label="Image URL (alternative)">
          <Input
            id="image_url"
            placeholder="https://example.com/image.jpg"
            {...register("image_url")}
          />
        </Field>

        <Flex width="full" justify="flex-end" gap={2} mt={4}>
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
            disabled={!isValid || description.length > 1000}
            loading={isSubmitting}
          >
            Save
          </Button>
        </Flex>
      </VStack>
    </form>
  )

  return (
    <DialogRoot
      size={communityId ? "lg" : { base: "xs", md: "md" }}
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
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {communityId ? (
            <Tabs.Root
              value={mode}
              onValueChange={(e) => setMode(e.value as any)}
              variant="plain"
            >
              <Tabs.List mb={4} gap={4}>
                <Tabs.Trigger value="pool">From My Collection</Tabs.Trigger>
                {(isAdmin || !communityId) && (
                  <Tabs.Trigger value="create">New Item</Tabs.Trigger>
                )}
              </Tabs.List>

              <Tabs.Content value="pool">
                <VStack gap={4} align="stretch">
                  <Text fontSize="sm" color="fg.muted">
                    Make your own items available for community members to
                    borrow.
                  </Text>
                  <Input
                    placeholder="Search your items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Box maxH="300px" overflowY="auto">
                    {filteredItems?.length === 0 ? (
                      <Text p={4} textAlign="center" color="fg.muted">
                        No items found.
                      </Text>
                    ) : (
                      <VStack align="stretch" gap={2}>
                        {filteredItems?.map((item) => (
                          <Flex
                            key={item.id}
                            p={3}
                            borderWidth="1px"
                            rounded="md"
                            justify="space-between"
                            align="center"
                          >
                            <Text fontWeight="medium">{item.title}</Text>
                            <Button
                              size="xs"
                              colorPalette="orange"
                              onClick={() => poolMutation.mutate(item.id)}
                              loading={poolMutation.isPending}
                            >
                              Pool Item
                            </Button>
                          </Flex>
                        ))}
                      </VStack>
                    )}
                  </Box>
                </VStack>
              </Tabs.Content>

              <Tabs.Content value="create">{creationFormContent}</Tabs.Content>
            </Tabs.Root>
          ) : (
            creationFormContent
          )}
        </DialogBody>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}

export default AddItem
