import { CommunitiesService, type ItemPublic, type LoanPublic } from "@/client"
import { ItemActionsMenu } from "@/components/Common/ItemActionsMenu"
import { useColorModeValue } from "@/components/ui/color-mode"
import useAuth from "@/hooks/useAuth"
import { getImageUrl } from "@/utils"
import {
  Badge,
  Box,
  Card,
  Flex,
  HStack,
  IconButton,
  Image,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { format } from "date-fns"
import type React from "react"
import { useState } from "react"
import { FiExternalLink } from "react-icons/fi"
import { FriendItemActionsMenu } from "./FriendItemActionsMenu"

interface ItemCardProps {
  item: ItemPublic
  loan?: LoanPublic
  communityId?: string
  isAdmin?: boolean
  displayOwnerId?: string
}

const ItemCard = ({
  item,
  loan,
  communityId,
  isAdmin,
  displayOwnerId,
}: ItemCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Color Mode Values
  const bgColor = useColorModeValue("orange.50", "gray.800")
  const textColor = useColorModeValue("gray.800", "gray.100")
  const borderColor = useColorModeValue("orange.200", "gray.600")
  const scrollbarColor = useColorModeValue("orange.200", "gray.600")

  const handleFlip = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFlipped(!isFlipped)
  }

  const handleGoToCollection = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (item.collection_id) {
      navigate({
        to: "/collections/$collectionId",
        params: { collectionId: item.collection_id },
      })
    }
  }

  const isOwner = item.owners?.some((o) => o.id === user?.id)
  const isBorrowing =
    !!loan &&
    loan.requester_id === user?.id &&
    ["active", "return_pending"].includes(loan.status)

  const { data: ownerCommunity } = useQuery({
    queryKey: ["community", item.community_owner_id],
    queryFn: () =>
      CommunitiesService.readCommunity({ id: item.community_owner_id! }),
    enabled: !!item.community_owner_id,
  })

  const isBook = item.item_type === "book"
  const extraData = (item.extra_data as any) || {}

  const effectiveDisplayOwnerId = displayOwnerId || item.added_by_id

  // Determine availability status based on context
  let isDisplayAvailable = item.is_available
  if (isOwner) {
    const myOwner = item.owners?.find((o) => o.id === user?.id)
    if (myOwner) isDisplayAvailable = myOwner.is_available
  } else if (effectiveDisplayOwnerId) {
    const displayOwner = item.owners?.find(
      (o) => o.id === effectiveDisplayOwnerId,
    )
    if (displayOwner) isDisplayAvailable = displayOwner.is_available
  }

  return (
    <Box
      aspectRatio={isBook ? 2 / 3 : 3 / 4}
      width="100%"
      minW="160px"
      cursor="pointer"
      perspective="1000px"
      borderRadius="lg"
    >
      <Box
        position="relative"
        width="100%"
        height="100%"
        transition="transform 0.6s"
        transformStyle="preserve-3d"
        transform={isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"}
      >
        {/* --- FRONT FACE (Cover) --- */}
        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          backfaceVisibility="hidden"
          onClick={handleFlip}
          overflow="hidden"
          borderRadius="lg"
          borderWidth="0"
          boxShadow="md"
          bg={item.image_url ? "black" : bgColor} // Black bg for covers to avoid white gaps
        >
          {item.image_url ? (
            <Image
              src={getImageUrl(item.image_url)}
              alt={item.title}
              objectFit="cover" // Cover entire area to avoid white spaces
              width="100%"
              height="100%"
            />
          ) : (
            // Fallback Cover if no image is present
            <Flex
              direction="column"
              justify="center"
              align="center"
              height="100%"
              p={6}
              bg={bgColor}
              color={textColor}
              textAlign="center"
              borderWidth="4px"
              borderColor={borderColor}
              borderStyle="double"
            >
              <Text
                fontSize="xl"
                fontWeight="bold"
                fontFamily="serif"
                mb={2}
                lineClamp={3}
              >
                {item.title}
              </Text>
              {isBook && extraData.author && (
                <Text fontSize="md" fontStyle="italic">
                  {String(extraData.author)}
                </Text>
              )}
            </Flex>
          )}

          {item.collection_id && (
            <IconButton
              aria-label="Go to collection"
              size="xs"
              position="absolute"
              top={2}
              right={2}
              colorPalette="orange"
              variant="solid"
              onClick={handleGoToCollection}
              zIndex={10}
            >
              <FiExternalLink />
            </IconButton>
          )}
        </Card.Root>

        {/* --- BACK FACE (Details) --- */}
        <Card.Root
          position="absolute"
          width="100%"
          height="100%"
          backfaceVisibility="hidden"
          transform="rotateY(180deg)"
          onClick={handleFlip}
          overflow="hidden"
          borderRadius="lg"
          boxShadow="md"
          bg={bgColor}
          color={textColor}
          borderColor={borderColor}
        >
          <Card.Body p={4} height="100%" display="flex" flexDirection="column">
            <Flex justify="space-between" align="start" mb={2}>
              <Badge colorPalette="teal" variant="solid" size="sm">
                {String(item.item_type || "General")}
              </Badge>
              <HStack gap={1} onClick={(e) => e.stopPropagation()}>
                {item.collection_id && (
                  <IconButton
                    aria-label="Go to collection"
                    size="xs"
                    colorPalette="orange"
                    variant="ghost"
                    onClick={handleGoToCollection}
                  >
                    <FiExternalLink />
                  </IconButton>
                )}
                {isOwner ? (
                  <ItemActionsMenu
                    item={item}
                    communityId={communityId}
                    isAdmin={isAdmin}
                  />
                ) : (
                  <FriendItemActionsMenu
                    item={item}
                    isBorrowing={isBorrowing}
                    loanId={loan?.id}
                    communityId={communityId}
                    isAdmin={isAdmin}
                  />
                )}
              </HStack>
            </Flex>

            <VStack align="start" gap={1} mb={3} flex="1" overflow="hidden">
              <Text fontSize="lg" fontWeight="bold" lineClamp={2}>
                {item.title}
              </Text>

              {isBook && extraData.author && (
                <Text
                  fontSize="sm"
                  fontStyle="italic"
                  color="gray.500"
                  lineClamp={1}
                >
                  By {String(extraData.author)}
                </Text>
              )}

              {isBook && (extraData.category || extraData.genre) && (
                <HStack gap={1} mt={1} wrap="wrap">
                  {extraData.category && (
                    <Badge variant="outline" size="xs" colorPalette="blue">
                      {extraData.category}
                    </Badge>
                  )}
                  {extraData.genre && (
                    <Badge variant="outline" size="xs" colorPalette="purple">
                      {extraData.genre}
                    </Badge>
                  )}
                </HStack>
              )}

              <Box
                mt={2}
                flex="1"
                overflowY="auto"
                width="full"
                pr={1}
                css={{
                  "&::-webkit-scrollbar": { width: "4px" },
                  "&::-webkit-scrollbar-thumb": {
                    background: scrollbarColor,
                    borderRadius: "full",
                  },
                }}
              >
                <Text fontSize="xs" color="inherit" opacity={0.9}>
                  {item.description || "No description provided."}
                </Text>
              </Box>
            </VStack>

            <Box
              mt="auto"
              pt={2}
              borderTopWidth="1px"
              borderColor={borderColor}
            >
              {loan && (
                <VStack align="start" gap={0} mb={2}>
                  <Text
                    fontSize="2xs"
                    color="fg.muted"
                    fontWeight="bold"
                    textTransform="uppercase"
                  >
                    Due Date
                  </Text>
                  <Text fontSize="xs" fontWeight="bold" color="orange.500">
                    {format(new Date(loan.end_date), "MMM d, yyyy")}
                  </Text>
                </VStack>
              )}

              {isOwner ? (
                <Badge
                  colorPalette={isDisplayAvailable ? "green" : "red"}
                  variant="solid"
                  mb={2}
                  width="full"
                  justifyContent="center"
                >
                  {isDisplayAvailable ? "Available" : "On Loan"}
                </Badge>
              ) : isBorrowing ? (
                <Badge
                  colorPalette={
                    loan?.status === "return_pending" ? "blue" : "green"
                  }
                  variant="solid"
                  mb={2}
                  width="full"
                  justifyContent="center"
                >
                  {loan?.status === "return_pending"
                    ? "Return Pending"
                    : "In your possession"}
                </Badge>
              ) : (
                !isDisplayAvailable && (
                  <Badge
                    colorPalette="red"
                    variant="solid"
                    mb={2}
                    width="full"
                    justifyContent="center"
                  >
                    On Loan
                  </Badge>
                )
              )}

              <Text fontSize="xs" fontWeight="semibold" mb={1}>
                {loan || effectiveDisplayOwnerId ? "Owner:" : "Owners:"}
              </Text>
              <HStack gap={1} flexWrap="wrap">
                {loan ? (
                  <Link
                    to={
                      loan.owner?.id === user?.id
                        ? "/profile"
                        : "/users/$userId"
                    }
                    params={
                      loan.owner?.id === user?.id
                        ? {}
                        : { userId: loan.owner?.id || "" }
                    }
                    onClick={(e) => e.stopPropagation()}
                    style={{ textDecoration: "none" }}
                  >
                    <Text
                      fontSize="xs"
                      color="blue.500"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {loan.owner
                        ? loan.owner.id === user?.id
                          ? "You"
                          : String(loan.owner.full_name || loan.owner.email)
                        : ownerCommunity?.name || "Community"}
                    </Text>
                  </Link>
                ) : (
                  <>
                    {item.community_owner_id && ownerCommunity ? (
                      <Link
                        to="/communities/$communityId"
                        params={{ communityId: item.community_owner_id }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ textDecoration: "none" }}
                      >
                        <Text
                          fontSize="xs"
                          color="purple.500"
                          fontWeight="bold"
                          _hover={{ textDecoration: "underline" }}
                        >
                          {ownerCommunity.name}
                        </Text>
                      </Link>
                    ) : (
                      <>
                        {effectiveDisplayOwnerId && (
                          <Link
                            to={
                              effectiveDisplayOwnerId === user?.id
                                ? "/profile"
                                : "/users/$userId"
                            }
                            params={
                              effectiveDisplayOwnerId === user?.id
                                ? {}
                                : { userId: effectiveDisplayOwnerId }
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={{ textDecoration: "none" }}
                          >
                            <Text
                              fontSize="xs"
                              color="blue.500"
                              _hover={{ textDecoration: "underline" }}
                            >
                              {effectiveDisplayOwnerId === user?.id
                                ? "You"
                                : String(
                                    item.owners?.find(
                                      (o) => o.id === effectiveDisplayOwnerId,
                                    )?.full_name ||
                                      item.owners?.find(
                                        (o) => o.id === effectiveDisplayOwnerId,
                                      )?.email ||
                                      "Owner",
                                  )}
                              {/* If we are showing specific owner, we usually don't need others unless specifically multiple ownership is key. 
                                  For now, hiding others if effectiveDisplayOwnerId is set to reduce clutter/confusion. 
                              */}
                            </Text>
                          </Link>
                        )}
                        {!effectiveDisplayOwnerId &&
                          item.owners?.map((owner, index, arr) => (
                            <Link
                              key={owner.id}
                              to={
                                owner.id === user?.id
                                  ? "/profile"
                                  : "/users/$userId"
                              }
                              params={
                                owner.id === user?.id
                                  ? {}
                                  : { userId: owner.id }
                              }
                              onClick={(e) => e.stopPropagation()}
                              style={{ textDecoration: "none" }}
                            >
                              <Text
                                fontSize="xs"
                                color="blue.500"
                                _hover={{ textDecoration: "underline" }}
                              >
                                {owner.id === user?.id
                                  ? "You"
                                  : String(owner.full_name || owner.email)}
                                <Text
                                  as="span"
                                  color={
                                    owner.is_available ? "green.500" : "red.500"
                                  }
                                >
                                  {owner.is_available
                                    ? " (Available)"
                                    : " (On Loan)"}
                                </Text>
                                {index < arr.length - 1 ? "," : ""}
                              </Text>
                            </Link>
                          ))}
                      </>
                    )}
                  </>
                )}
              </HStack>

              {isBook && extraData.isbn && (
                <Text fontSize="2xs" color="gray.400" mt={2} fontFamily="mono">
                  ISBN: {String(extraData.isbn)}
                </Text>
              )}
            </Box>
          </Card.Body>
        </Card.Root>
      </Box>
    </Box>
  )
}

export default ItemCard
