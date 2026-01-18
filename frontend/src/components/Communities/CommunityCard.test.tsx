import * as Client from "@/client"
import * as ApiRequest from "@/client/core/request"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CommunityCard from "./CommunityCard"

// Mock hooks
vi.mock("@/hooks/useAuth", () => ({
  default: () => ({
    user: {
      id: "current-user-id",
      is_superuser: false,
      communities: [{ id: "community-id" }],
    },
  }),
}))

vi.mock("@/hooks/useCustomToast", () => ({
  default: () => ({
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
  }),
}))

// Mock API services
vi.mock("@/client", async (importOriginal) => {
  const actual = await importOriginal<typeof Client>()
  return {
    ...actual,
    CommunitiesService: {
      ...actual.CommunitiesService,
      readCommunityMembers: vi.fn(),
      leaveCommunity: vi.fn(),
      joinCommunity: vi.fn(),
      deleteCommunity: vi.fn(),
    },
    FriendsService: {
      readFriends: vi.fn(),
      createFriendRequest: vi.fn(),
    },
  }
})

// Mock apiRequest specifically since it's used directly in the mutation
vi.mock("@/client/core/request", () => ({
  request: vi.fn(),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <ChakraProvider value={defaultSystem}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ChakraProvider>
  )
}

describe("CommunityCard", () => {
  const mockCommunity = {
    id: "community-id",
    name: "Test Community",
    description: "A test community",
    created_by: "current-user-id", // User is admin
    is_closed: false,
  }

  const mockMembers = [
    {
      id: "current-user-id",
      full_name: "Current User",
      email: "user@test.com",
      community_role: "admin",
      community_status: "accepted",
    },
    {
      id: "member-1",
      full_name: "Member One",
      email: "member1@test.com",
      community_role: "member",
      community_status: "accepted",
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(Client.CommunitiesService.readCommunityMembers).mockResolvedValue(
      {
        data: mockMembers,
        count: 2,
      },
    )
    vi.mocked(Client.FriendsService.readFriends).mockResolvedValue({
      data: [],
      count: 0,
    })
  })

  it("should promote a member to admin", async () => {
    vi.mocked(ApiRequest.request).mockResolvedValue({ success: true })

    render(<CommunityCard community={mockCommunity} />, {
      wrapper: createWrapper(),
    })

    // Open members list
    const showMembersBtn = screen.getByText("Show Members")
    fireEvent.click(showMembersBtn)

    // Wait for members to load
    await waitFor(() => {
      expect(screen.getByText("Member One")).toBeInTheDocument()
    })

    // Find the settings/manage role button for Member One
    const manageRoleBtns = screen.getAllByTitle("Manage Role")
    const manageRoleBtn = manageRoleBtns[0]
    fireEvent.click(manageRoleBtn)

    // Click "Promote to Admin"
    const promoteBtn = await screen.findByText("Promote to Admin")
    fireEvent.click(promoteBtn)

    // Verify API call
    await waitFor(() => {
      expect(ApiRequest.request).toHaveBeenCalledWith(
        expect.anything(), // OpenAPI config
        expect.objectContaining({
          method: "PATCH",
          url: "/api/v1/communities/{id}/members/{user_id}",
          path: {
            id: "community-id",
            user_id: "member-1",
          },
          body: { role: "admin", status: undefined },
        }),
      )
    })
  })

  it("should demote an admin to member", async () => {
    // Setup a scenario where Member One is an admin
    const adminMembers = [...mockMembers]
    adminMembers[1].community_role = "admin"

    vi.mocked(Client.CommunitiesService.readCommunityMembers).mockResolvedValue(
      {
        data: adminMembers,
        count: 2,
      },
    )

    vi.mocked(ApiRequest.request).mockResolvedValue({ success: true })

    render(<CommunityCard community={mockCommunity} />, {
      wrapper: createWrapper(),
    })

    // Open members list
    fireEvent.click(screen.getByText("Show Members"))

    // Wait for members
    await waitFor(() => {
      expect(screen.getByText("Member One")).toBeInTheDocument()
    })

    // Click manage role
    const manageRoleBtns = screen.getAllByTitle("Manage Role")
    fireEvent.click(manageRoleBtns[0])

    // Click "Demote to Member"
    const demoteBtn = await screen.findByText("Demote to Member")
    fireEvent.click(demoteBtn)

    // Verify API call
    await waitFor(() => {
      expect(ApiRequest.request).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: "PATCH",
          url: "/api/v1/communities/{id}/members/{user_id}",
          path: {
            id: "community-id",
            user_id: "member-1",
          },
          body: { role: "member", status: undefined },
        }),
      )
    })
  })
})
