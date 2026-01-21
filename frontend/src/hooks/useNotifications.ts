import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { NotificationsService } from "../client"
import { OpenAPI } from "../client/core/OpenAPI"
import useAuth from "./useAuth"

export const useNotifications = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const token = localStorage.getItem("access_token")

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => NotificationsService.readNotifications({}),
    enabled: !!user,
  })

  useEffect(() => {
    if (!user || !token) return

    const baseUrl = OpenAPI.BASE || (window.location.hostname === "localhost" ? "http://localhost:8000" : window.location.origin)
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/api/v1/notifications/ws?token=" + token

    const socket = new WebSocket(wsUrl)

    socket.onmessage = (event) => {
      // In a real app, you might want to check the message content
      // and maybe show a toast or update the cache directly
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    }

    socket.onerror = (err) => {
      console.error("WebSocket error:", err)
    }

    return () => {
      socket.close()
    }
  }, [user, token, queryClient])

  return { data, isLoading, error }
}
