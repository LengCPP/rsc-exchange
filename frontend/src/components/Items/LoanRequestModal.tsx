import { LoansService } from "@/client"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { Button, Input as ChakraInput, VStack } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"

interface LoanRequestModalProps {
  item: any
  isOpen: boolean
  onClose: () => void
}

export function LoanRequestModal({
  item,
  isOpen,
  onClose,
}: LoanRequestModalProps) {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const mutation = useMutation({
    mutationFn: (data: {
      item_id: string
      start_date: string
      end_date: string
    }) => LoansService.createLoanRequest({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Loan request sent!")
      onClose()
    },
    onError: (err: any) => {
      showErrorToast(err.body?.detail || "Failed to send loan request")
    },
  })

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Loan: {item.title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <VStack gap={4} align="stretch">
            <Field label="Start Date">
              <ChakraInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Field>
            <Field label="End Date">
              <ChakraInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Field>
          </VStack>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorPalette="orange"
            onClick={() =>
              mutation.mutate({
                item_id: item.id,
                start_date: startDate,
                end_date: endDate,
              })
            }
            loading={mutation.isPending}
            disabled={!startDate || !endDate}
          >
            Send Request
          </Button>
        </DialogFooter>
        <DialogCloseTrigger />
      </DialogContent>
    </DialogRoot>
  )
}
