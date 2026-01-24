import { IconButton } from "@chakra-ui/react"
import { BsThreeDotsVertical } from "react-icons/bs"
import { MenuContent, MenuItem, MenuRoot, MenuTrigger } from "../ui/menu"
import { useState } from "react"
import { FiBookOpen, FiCornerUpLeft } from "react-icons/fi"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LoansService, type ItemPublic } from "@/client"
import { LoanRequestModal } from "./LoanRequestModal"
import useCustomToast from "@/hooks/useCustomToast"

interface FriendItemActionsMenuProps {
  item: ItemPublic
  isBorrowing?: boolean
  loanId?: string
}

export const FriendItemActionsMenu = ({ item, isBorrowing = false, loanId }: FriendItemActionsMenuProps) => {
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const signalReturnMutation = useMutation({
    mutationFn: () => LoansService.signalReturn({ id: loanId! }),
    onSuccess: () => {
      showSuccessToast("Return signaled to owner.")
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
    onError: (err: any) => {
      showErrorToast(err.body?.detail || "Failed to signal return")
    }
  })

  if (isBorrowing) {
    return (
      <IconButton 
        size="xs" 
        colorPalette="blue" 
        variant="ghost" 
        onClick={(e) => {
          e.stopPropagation()
          signalReturnMutation.mutate()
        }}
        loading={signalReturnMutation.isPending}
        title="Signal Return"
      >
        <FiCornerUpLeft />
      </IconButton>
    )
  }

  return (
    <>
      <MenuRoot>
        <MenuTrigger asChild>
          <IconButton variant="ghost" color="inherit">
            <BsThreeDotsVertical />
          </IconButton>
        </MenuTrigger>
        <MenuContent>
          <MenuItem 
            value="request-loan" 
            onClick={() => setIsLoanModalOpen(true)}
            disabled={!item.is_available}
          >
            <FiBookOpen style={{ marginRight: "8px" }} /> 
            {item.is_available ? "Request Loan" : "On Loan (Unavailable)"}
          </MenuItem>
        </MenuContent>
      </MenuRoot>

      <LoanRequestModal 
        item={item} 
        isOpen={isLoanModalOpen} 
        onClose={() => setIsLoanModalOpen(false)} 
      />
    </>
  )
}
