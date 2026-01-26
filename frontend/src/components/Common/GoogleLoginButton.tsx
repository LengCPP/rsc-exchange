import { Button } from "@chakra-ui/react"
import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { FaGoogle } from "react-icons/fa"

import useAuth from "../../hooks/useAuth"

interface GoogleLoginResponse {
  access_token: string
  token_type: string
}

const GoogleLoginButton = () => {
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()

  const googleLoginMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/v1/login/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        },
      )

      if (!response.ok) {
        throw new Error("Google login failed")
      }

      return response.json() as Promise<GoogleLoginResponse>
    },
    onSuccess: (data) => {
      login(data.access_token)
    },
    onError: (err) => {
      console.error("Google login failed", err)
      setError("Failed to log in with Google. Please try again.")
    },
  })

  const handleGoogleLogin = () => {
    // This function will be called when the user clicks the Google Login button
    // It should trigger the Google OAuth flow and get the token
    // For now, we'll just simulate a successful login for demonstration purposes
    // In a real application, you would use the Google Identity Services SDK
    console.log("Initiating Google Login...")
  }

  return (
    <>
      <Button
        w="full"
        variant="outline"
        leftIcon={<FaGoogle />}
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </Button>
      {error && <div style={{ color: "red", marginTop: "10px" }}>{error}</div>}
    </>
  )
}

export default GoogleLoginButton
