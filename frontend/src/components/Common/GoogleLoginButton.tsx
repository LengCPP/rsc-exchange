import useCustomToast from "@/hooks/useCustomToast"
import { GoogleLogin } from "@react-oauth/google"
import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import axios from "axios"

const GoogleLoginButton = () => {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const navigate = useNavigate()

  const googleLoginMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        { token },
      )
      return response.data
    },
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token)
      showSuccessToast("You are now logged in.")
      navigate({ to: "/" })
    },
    onError: (error) => {
      console.error("Google login error", error)
      showErrorToast("Could not sign in with Google.")
    },
  })

  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) {
          googleLoginMutation.mutate(credentialResponse.credential)
        }
      }}
      onError={() => {
        showErrorToast("Google login was unsuccessful.")
      }}
    />
  )
}

export default GoogleLoginButton
