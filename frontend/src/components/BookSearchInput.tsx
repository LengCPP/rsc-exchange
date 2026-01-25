import {
  Box,
  HStack,
  Image,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react"
import { useEffect, useRef, useState } from "react"
import { type BookResult, useBookSearch } from "@/hooks/useBookSearch"

interface BookSearchInputProps {
  onSelect: (book: BookResult) => void
  placeholder?: string
  id?: string
  name?: string
}

export const BookSearchInput = ({
  onSelect,
  placeholder = "Search for a book title...",
  id,
  name,
}: BookSearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm, setDebouncedTerm] = useState("")
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 500ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: results, isLoading } = useBookSearch(debouncedTerm)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSelect = (book: BookResult) => {
    onSelect(book)
    setSearchTerm(book.title)
    setShowResults(false)
  }

  return (
    <Box position="relative" width="100%" ref={containerRef}>
      <Input
        id={id}
        name={name}
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value)
          setShowResults(true)
        }}
        onFocus={() => setShowResults(true)}
        placeholder={placeholder}
      />

      {showResults && searchTerm.length >= 3 && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={1000}
          bg="bg.panel"
          boxShadow="lg"
          borderRadius="md"
          mt={1}
          maxH="300px"
          overflowY="auto"
          border="1px solid"
          borderColor="border.subtle"
        >
          {isLoading ? (
            <HStack p={4} justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm">Searching Google Books...</Text>
            </HStack>
          ) : results && results.length > 0 ? (
            <Stack gap={0}>
              {results.map((book, index) => (
                <HStack
                  key={`${book.isbn}-${index}`}
                  p={3}
                  _hover={{ bg: "bg.muted", cursor: "pointer" }}
                  onClick={() => handleSelect(book)}
                  borderBottom={index !== results.length - 1 ? "1px solid" : "none"}
                  borderColor="border.subtle"
                  align="start"
                >
                  {book.thumbnail && (
                    <Box
                      width="40px"
                      height="56px"
                      flexShrink={0}
                      bg="bg.muted"
                      borderRadius="sm"
                      overflow="hidden"
                    >
                      <Image
                        src={book.thumbnail}
                        alt={book.title}
                        width="100%"
                        height="100%"
                        objectFit="contain"
                      />
                    </Box>
                  )}
                  <Box flex={1}>
                    <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                      {book.title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                      {book.authors.join(", ")}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </Stack>
          ) : (
            <Box p={4}>
              <Text fontSize="sm" color="fg.muted">No books found.</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
