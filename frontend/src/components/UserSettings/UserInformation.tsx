import {
  Box,
  Container,
  Flex,
  Heading,
  IconButton,
  Text,
} from "@chakra-ui/react"
import { FaShare, FaUserCircle } from "react-icons/fa"

import {
  type ApiError,
} from "@/client"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { formatPublicId, handleError } from "@/utils"
import { Field } from "../ui/field"

const UserInformation = () => {
  const { showSuccessToast } = useCustomToast()
  const { user: currentUser } = useAuth()

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
            <Text
              fontSize="md"
              py={2}
              color={!currentUser?.full_name ? "gray" : "inherit"}
              truncate
              maxWidth="250px"
            >
              {currentUser?.full_name || "N/A"}
            </Text>
          </Field>
          <Field
            mt={4}
            label="Email"
          >
            <Text fontSize="md" py={2} truncate maxWidth="250px">
              {currentUser?.email}
            </Text>
          </Field>
        </Box>
      </Container>
    </>
  )
}

export default UserInformation
