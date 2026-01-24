import { Box, Container, Flex, Image, Input, Text } from "@chakra-ui/react"
import { useGoogleLogin } from "@react-oauth/google"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import axios from "axios"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FaGoogle } from "react-icons/fa"
import { FiLock, FiUser } from "react-icons/fi"

import type { UserRegister } from "@/client"
import { Button } from "@/components/ui/button"
import { useColorMode } from "@/components/ui/color-mode"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import {
  confirmPasswordRules,
  emailPattern,
  namePattern,
  passwordRules,
} from "@/utils"
import Logo from "/assets/images/rsc-x-logo.png"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

function SignUp() {
  const { colorMode } = useColorMode()
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
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
        console.log("Backend response:", response.data)
        localStorage.setItem("access_token", response.data.access_token)
        window.location.href = "/"
      } catch (err) {
        console.error("Backend login/signup failed", err)
      }
    },
    onError: () => console.log("Signup Failed"),
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    signUpMutation.mutate(data)
  }

  return (
    <>
      <Flex flexDir={{ base: "column", md: "row" }} justify="center" h="100vh">
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
            invalid={!!errors.full_name}
            errorText={errors.full_name?.message}
          >
            <InputGroup w="100%" startElement={<FiUser />}>
              <Input
                id="full_name"
                {...register("full_name", {
                  required: "Full Name is required",
                  pattern: namePattern,
                })}
                placeholder="Full Name"
                type="text"
              />
            </InputGroup>
          </Field>

          <Field invalid={!!errors.email} errorText={errors.email?.message}>
            <InputGroup w="100%" startElement={<FiUser />}>
              <Input
                id="email"
                {...register("email", {
                  required: "Email is required",
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
          <PasswordInput
            type="confirm_password"
            startElement={<FiLock />}
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Confirm Password"
            errors={errors}
          />
          <Button variant="solid" type="submit" loading={isSubmitting}>
            Sign Up
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
            Sign up with Google
          </Button>

          <Text>
            Already have an account?{" "}
            <RouterLink to="/login" className="main-link">
              Log In
            </RouterLink>
          </Text>
        </Container>
      </Flex>
    </>
  )
}

export default SignUp
