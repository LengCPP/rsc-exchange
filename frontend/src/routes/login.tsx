import {
  Box,
  Container,
  Flex,
  Image,
  Input,
  Separator,
  Text,
} from "@chakra-ui/react"
import { useGoogleLogin } from "@react-oauth/google"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import axios from "axios"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaGoogle } from "react-icons/fa"
import { FiLock, FiMail } from "react-icons/fi"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/button"
import { useColorMode } from "@/components/ui/color-mode"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import Logo from "/assets/images/rsc-x-logo.png"
import { emailPattern, passwordRules } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function Login() {
  const { colorMode } = useColorMode()
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log(tokenResponse)
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/v1/auth/google`,
          { token: tokenResponse.access_token },
        )
        // Handle success - store token, redirect, etc.
        // For now just log as requested
        console.log("Backend response:", response.data)
        localStorage.setItem("access_token", response.data.access_token)
        window.location.href = "/"
      } catch (err) {
        console.error("Backend login failed", err)
      }
    },
    onError: () => console.log("Login Failed"),
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  return (
    <>
      <Container
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        h="100vh"
        maxW="sm"
        alignItems="stretch"
        justifyContent="center"
        gap={4}
        centerContent
      >
        <Image
          src={Logo}
          alt="rsc-xchange logo"
          height="auto"
          maxW="2xs"
          alignSelf="center"
          mb={4}
        />
        <Field
          invalid={!!errors.username}
          errorText={errors.username?.message || !!error}
        >
          <InputGroup w="100%" startElement={<FiMail />}>
            <Input
              id="username"
              {...register("username", {
                required: "Username is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
            />
          </InputGroup>
        </Field>
        <PasswordInput
          type="password"
          startElement={<FiLock />}
          {...register("password", passwordRules())}
          placeholder="Password"
          errors={errors}
        />
        <RouterLink to="/recover-password" className="main-link">
          Forgot Password?
        </RouterLink>
        <Button variant="solid" type="submit" loading={isSubmitting} size="md">
          Log In
        </Button>

        <Flex align="center" width="full" my={2}>
          <Box flex="1" h="1px" bg="gray.600" />
          <Text mx={4} color="gray.400" fontSize="sm" fontWeight="medium">
            OR
          </Text>
          <Box flex="1" h="1px" bg="gray.600" />
        </Flex>

        <Button variant="outline" width="full" onClick={() => googleLogin()}>
          <FaGoogle style={{ marginRight: "8px" }} />
          Log in with Google
        </Button>

        <Text>
          Don't have an account?{" "}
          <RouterLink to="/signup" className="main-link">
            Sign Up
          </RouterLink>
        </Text>
      </Container>
    </>
  )
}
