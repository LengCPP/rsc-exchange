import {
  Box,
  Container,
  Heading,
  Separator,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { FiArrowDownLeft, FiArrowUpRight, FiClock } from "react-icons/fi"

import { LoansService } from "@/client"
import ItemCard from "@/components/Items/ItemCard"
import { LoanCard } from "@/components/Items/LoanCard"

export const Route = createFileRoute("/_layout/loans")({
  component: LoansPage,
})

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
