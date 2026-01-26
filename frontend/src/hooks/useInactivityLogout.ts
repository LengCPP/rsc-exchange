import { useEffect, useRef } from "react"
import useAuth from "./useAuth"
import { SESSION_INACTIVITY_TIMEOUT } from "@/constants"

const useInactivityLogout = () => {
  const { logout } = useAuth()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      logout()
    }, SESSION_INACTIVITY_TIMEOUT)
  }

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ]

    const handleEvent = () => {
      resetTimer()
    }

    // Initialize timer
    resetTimer()

    // Add listeners
    for (const event of events) {
      window.addEventListener(event, handleEvent)
    }

    return () => {
      // Remove listeners
      for (const event of events) {
        window.removeEventListener(event, handleEvent)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [logout])

  return null
}

export default useInactivityLogout
