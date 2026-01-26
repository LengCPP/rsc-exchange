import { IconButton } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FiHeart, FiMinusCircle, FiTrash2 } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

import { CommunitiesService, type ItemPublic } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import ConfirmationModal from "./ConfirmationModal"
import DeleteItem from "../Items/DeleteItem"
import EditItem from "../Items/EditItem"

interface ItemActionsMenuProps {
  item: ItemPublic
  communityId?: string
  isAdmin?: boolean
  onRemoveFromCollection?: () => void
}

export const ItemActionsMenu = ({
  item,
  communityId,
  isAdmin,
  onRemoveFromCollection,
}: ItemActionsMenuProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [confirmationType, setConfirmationType] = useState<
    "donate" | "removeCommunity" | "removeCollection" | null
  >(null)

  const isCommunityOwned = !!item.community_owner_id

  const donateMutation = useMutation({
    mutationFn: () =>
      CommunitiesService.initiateDonation({
        id: communityId!,
        itemId: item.id,
      }),
    onSuccess: () => {
      showSuccessToast("Donation request sent!")
      queryClient.invalidateQueries({
        queryKey: ["communityItems", communityId],
      })
      queryClient.invalidateQueries({ queryKey: ["items"] })
      setConfirmationType(null)
    },
    onError: () => {
      showErrorToast("Failed to initiate donation")
      setConfirmationType(null)
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: () =>
      CommunitiesService.removeItemFromCommunity({
        id: communityId!,
        itemId: item.id,
      }),
    onSuccess: () => {
      showSuccessToast("Item removed from community")
      queryClient.invalidateQueries({
        queryKey: ["communityItems", communityId],
      })
      queryClient.invalidateQueries({ queryKey: ["items"] })
      setConfirmationType(null)
    },
    onError: () => {
      showErrorToast("Failed to remove item")
      setConfirmationType(null)
    },
  })

  const handleConfirm = () => {
    if (confirmationType === "donate") {
      donateMutation.mutate()
    } else if (confirmationType === "removeCommunity") {
      removeItemMutation.mutate()
    } else if (confirmationType === "removeCollection") {
      if (onRemoveFromCollection) {
        onRemoveFromCollection()
      }
      setConfirmationType(null)
    }
  }

  const getConfirmationConfig = () => {
    switch (confirmationType) {
      case "donate":
        return {
          title: "Donate Item",
          message:
            "Donate this item to the community? You will lose personal ownership.",
          isLoading: donateMutation.isPending,
        }
      case "removeCommunity":
        return {
          title: "Remove from Community",
          message: "Remove this item from community pool?",
          isLoading: removeItemMutation.isPending,
        }
      case "removeCollection":
        return {
          title: "Remove from Collection",
          message: "Remove this item from the collection?",
          isLoading: false, // Since it's a callback, we don't track loading state here easily unless passed in
        }
      default:
        return {
          title: "",
          message: "",
          isLoading: false,
        }
    }
  }

  const config = getConfirmationConfig()

  return (
    <>
      <MenuRoot>
        <MenuTrigger asChild>
          <IconButton variant="ghost" color="inherit">
            <BsThreeDotsVertical />
          </IconButton>
        </MenuTrigger>
        <MenuContent>
          <EditItem item={item} />
          <DeleteItem id={item.id} />
          {onRemoveFromCollection && (
            <MenuItem
              value="remove-from-collection"
              color="red.500"
              onClick={(e) => {
                e.stopPropagation()
                setConfirmationType("removeCollection")
              }}
            >
              <FiMinusCircle style={{ marginRight: "8px" }} />
              Remove from Collection
            </MenuItem>
          )}
          {communityId && (
            <>
              {!isCommunityOwned && !item.is_donation_pending && (
                <MenuItem
                  value="donate"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmationType("donate")
                  }}
                >
                  <FiHeart style={{ marginRight: "8px" }} />
                  Donate to Community
                </MenuItem>
              )}
              {(isAdmin || !isCommunityOwned) && (
                <MenuItem
                  value="remove-from-community"
                  color="red.500"
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmationType("removeCommunity")
                  }}
                >
                  <FiTrash2 style={{ marginRight: "8px" }} />
                  Remove from Community
                </MenuItem>
              )}
            </>
          )}
        </MenuContent>
      </MenuRoot>

      <ConfirmationModal
        isOpen={!!confirmationType}
        onClose={() => setConfirmationType(null)}
        onConfirm={handleConfirm}
        title={config.title}
        message={config.message}
        isLoading={config.isLoading}
      />
    </>
  )
}
