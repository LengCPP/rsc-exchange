import { IconButton } from "@chakra-ui/react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BsThreeDotsVertical } from "react-icons/bs"
import { FiHeart, FiTrash2 } from "react-icons/fi"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"

import { CommunitiesService, type ItemPublic } from "@/client"
import useCustomToast from "@/hooks/useCustomToast"
import DeleteItem from "../Items/DeleteItem"
import EditItem from "../Items/EditItem"

interface ItemActionsMenuProps {
  item: ItemPublic
  communityId?: string
  isAdmin?: boolean
}

export const ItemActionsMenu = ({
  item,
  communityId,
  isAdmin,
}: ItemActionsMenuProps) => {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

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
    },
    onError: () => showErrorToast("Failed to initiate donation"),
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
    },
    onError: () => showErrorToast("Failed to remove item"),
  })

  return (
    <MenuRoot>
      <MenuTrigger asChild>
        <IconButton variant="ghost" color="inherit">
          <BsThreeDotsVertical />
        </IconButton>
      </MenuTrigger>
      <MenuContent>
        <EditItem item={item} />
        <DeleteItem id={item.id} />
        {communityId && (
          <>
            {!isCommunityOwned && !item.is_donation_pending && (
              <MenuItem
                value="donate"
                onClick={() => {
                  if (
                    window.confirm(
                      "Donate this item to the community? You will lose personal ownership.",
                    )
                  ) {
                    donateMutation.mutate()
                  }
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
                onClick={() => {
                  if (window.confirm("Remove this item from community pool?")) {
                    removeItemMutation.mutate()
                  }
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
  )
}
