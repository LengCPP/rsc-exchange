import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  HStack,
  Heading,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiCheckCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi"

import { LoansService } from "@/client"
import ItemCard from "@/components/Items/ItemCard"
import useCustomToast from "@/hooks/useCustomToast"
import { format } from "date-fns"

export const Route = createFileRoute("/_layout/loans")({
  component: LoansPage,
})

function LoanCard({
  loan,
  type,
}: { loan: any; type: "incoming" | "outgoing" }) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const respondMutation = useMutation({
    mutationFn: (accept: boolean) =>
      LoansService.respondToLoanRequest({ id: loan.id, accept }),
    onSuccess: () => {
      showSuccessToast("Response sent successfully")
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })

  const ratifyMutation = useMutation({
    mutationFn: () => LoansService.ratifyLoan({ id: loan.id }),
    onSuccess: () => {
      showSuccessToast("Loan ratified! You now have the item.")
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })

  const returnMutation = useMutation({
    mutationFn: () => LoansService.returnLoan({ id: loan.id }),
    onSuccess: () => {
      showSuccessToast("Item marked as returned")
      queryClient.invalidateQueries({ queryKey: ["loans"] })
    },
  })

  const isPending = loan.status === "pending"
  const isAccepted = loan.status === "accepted"
  const isActive = loan.status === "active"

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel" boxShadow="sm">
      <Flex justify="space-between" align="start" mb={4}>
        <VStack align="start" gap={0}>
          <Text fontWeight="bold" fontSize="lg">
            {loan.item.title}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {type === "incoming"
              ? `Borrower: ${loan.requester.full_name || loan.requester.email}`
              : `Owner: ${loan.owner.full_name || loan.owner.email}`}
          </Text>
        </VStack>
        <Badge
          colorPalette={
            loan.status === "active"
              ? "green"
              : loan.status === "pending"
                ? "orange"
                : loan.status === "accepted"
                  ? "blue"
                  : loan.status === "rejected"
                    ? "red"
                    : "gray"
          }
        >
          {loan.status.toUpperCase()}
        </Badge>
      </Flex>

      <HStack fontSize="sm" gap={4} mb={4}>
        <VStack align="start" gap={0}>
          <Text
            fontSize="2xs"
            color="fg.muted"
            fontWeight="bold"
            textTransform="uppercase"
          >
            From
          </Text>
          <Text>{format(new Date(loan.start_date), "MMM d, yyyy")}</Text>
        </VStack>
        <VStack align="start" gap={0}>
          <Text
            fontSize="2xs"
            color="fg.muted"
            fontWeight="bold"
            textTransform="uppercase"
          >
            To
          </Text>
          <Text>{format(new Date(loan.end_date), "MMM d, yyyy")}</Text>
        </VStack>
      </HStack>

      <Flex gap={2} mt="auto">
        {type === "incoming" && isPending && (
          <>
            <Button
              size="xs"
              colorPalette="green"
              onClick={() => respondMutation.mutate(true)}
              loading={respondMutation.isPending}
            >
              <FiCheckCircle /> Accept
            </Button>
            <Button
              size="xs"
              colorPalette="red"
              variant="outline"
              onClick={() => respondMutation.mutate(false)}
              loading={respondMutation.isPending}
            >
              <FiXCircle /> Reject
            </Button>
          </>
        )}

        {type === "outgoing" && isAccepted && (
          <Button
            size="xs"
            colorPalette="blue"
            width="full"
            onClick={() => ratifyMutation.mutate()}
            loading={ratifyMutation.isPending}
          >
            <FiCheckCircle /> Confirm I have the item
          </Button>
        )}

        {type === "incoming" && isActive && (
          <Button
            size="xs"
            colorPalette="gray"
            width="full"
            onClick={() => returnMutation.mutate()}
            loading={returnMutation.isPending}
          >
            Mark as Returned
          </Button>
        )}
      </Flex>
    </Box>
  )
}

function LoansPage() {
  const { data: incoming, isLoading: isLoadingIn } = useQuery({
    queryKey: ["loans", "incoming"],
    queryFn: () => LoansService.readIncomingLoanRequests({}),
  })

  const { data: outgoing, isLoading: isLoadingOut } = useQuery({
    queryKey: ["loans", "outgoing"],
    queryFn: () => LoansService.readOutgoingLoanRequests({}),
  })

  const borrowedItems =
    outgoing?.data.filter(
      (l) => l.status === "active" || l.status === "return_pending",
    ) || []
  const pendingOutgoing =
    outgoing?.data.filter(
      (l) => l.status === "pending" || l.status === "accepted",
    ) || []
  const pendingIncoming =
    incoming?.data.filter(
      (l) => l.status === "pending" || l.status === "return_pending",
    ) || []

  return (
    <Container maxW="full" pb={20}>
      <Heading size="lg" py={12}>
        Loans & Possession
      </Heading>

      <VStack align="stretch" gap={12}>
        {/* Borrowed Items (The "New Collection") */}
        <Box>
          <Heading size="md" mb={6} display="flex" alignItems="center" gap={2}>
            <FiClock color="teal" /> Items I am Borrowing
          </Heading>
          {borrowedItems.length === 0 ? (
            <Box
              p={8}
              textAlign="center"
              borderWidth="1px"
              borderRadius="lg"
              borderStyle="dashed"
            >
              <Text color="fg.muted">
                You are not currently borrowing any items.
              </Text>
            </Box>
          ) : (
            <SimpleGrid
              columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
              gap={6}
            >
              {borrowedItems.map((loan) => (
                <VStack key={loan.id} align="stretch" gap={2}>
                  <ItemCard item={loan.item} loan={loan} />
                  {loan.status === "return_pending" && (
                    <Badge
                      colorPalette="blue"
                      variant="subtle"
                      width="full"
                      justifyContent="center"
                    >
                      Waiting for owner
                    </Badge>
                  )}
                </VStack>
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Separator />

        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={12}>
          {/* Actionable Requests */}
          <Box>
            <Heading
              size="md"
              mb={6}
              display="flex"
              alignItems="center"
              gap={2}
            >
              <FiArrowDownLeft color="orange" /> Incoming Requests & Returns
            </Heading>
            {pendingIncoming.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                No pending requests or returns for your items.
              </Text>
            ) : (
              <VStack align="stretch" gap={4}>
                {pendingIncoming.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} type="incoming" />
                ))}
              </VStack>
            )}
          </Box>

          <Box>
            <Heading
              size="md"
              mb={6}
              display="flex"
              alignItems="center"
              gap={2}
            >
              <FiArrowUpRight color="blue" /> My Requests
            </Heading>
            {pendingOutgoing.length === 0 ? (
              <Text fontSize="sm" color="fg.muted">
                You have no pending requests.
              </Text>
            ) : (
              <VStack align="stretch" gap={4}>
                {pendingOutgoing.map((loan) => (
                  <LoanCard key={loan.id} loan={loan} type="outgoing" />
                ))}
              </VStack>
            )}
          </Box>
        </SimpleGrid>
      </VStack>
    </Container>
  )
}
