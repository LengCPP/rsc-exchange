"use client"

import type { IconButtonProps, SpanProps } from "@chakra-ui/react"
import { ClientOnly, IconButton, Skeleton, Span } from "@chakra-ui/react"
import { ThemeProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import * as React from "react"
import { LuMoon, LuSun } from "react-icons/lu"
import useAuth from "@/hooks/useAuth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { UsersService } from "@/client"

export interface ColorModeProviderProps extends ThemeProviderProps {}

export function SyncColorMode() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const lastSyncedUserId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (user?.id && user.settings?.theme_mode) {
      if (lastSyncedUserId.current !== user.id) {
        if (user.settings.theme_mode !== theme) {
          setTheme(user.settings.theme_mode)
        }
        lastSyncedUserId.current = user.id
      }
    } else if (!user) {
      lastSyncedUserId.current = null
    }
  }, [user, theme, setTheme])

  return null
}

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider
      attribute="class"
      disableTransitionOnChange
      defaultTheme="system"
      enableSystem
      storageKey="theme"
      {...props}
    />
  )
}

export type ColorMode = "light" | "dark"

export interface UseColorModeReturn {
  colorMode: ColorMode
  setColorMode: (colorMode: ColorMode) => void
  toggleColorMode: () => void
}

export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const mutation = useMutation({
    mutationFn: (newTheme: string) =>
      UsersService.updateUserSettings({
        requestBody: { theme_mode: newTheme },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })

  const toggleColorMode = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    setTheme(newTheme)
    if (user) {
      mutation.mutate(newTheme)
    }
  }

  return {
    colorMode: resolvedTheme as ColorMode,
    setColorMode: (newTheme: ColorMode) => {
      setTheme(newTheme)
      if (user) mutation.mutate(newTheme)
    },
    toggleColorMode,
  }
}

export function useColorModeValue<T>(light: T, dark: T) {
  const { colorMode } = useColorMode()
  return colorMode === "dark" ? dark : light
}

import { Flex, Text } from "@chakra-ui/react"

export function ColorModeIcon() {
  const { colorMode } = useColorMode()
  // Show the icon for the mode we will switch TO
  return colorMode === "dark" ? <LuSun /> : <LuMoon />
}

interface ColorModeButtonProps extends Omit<IconButtonProps, "aria-label"> {
  showLabel?: boolean
}

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  ColorModeButtonProps
>(function ColorModeButton(props, ref) {
  const { showLabel, ...rest } = props
  const { toggleColorMode, colorMode } = useColorMode()
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}
        size="sm"
        ref={ref}
        {...rest}
        css={{
          _icon: {
            width: "5",
            height: "5",
          },
        }}
      >
        <Flex align="center" gap={2}>
          <ColorModeIcon />
          {showLabel && (
            <Text fontSize="sm">
              Switch to {colorMode === "dark" ? "Light" : "Dark"}
            </Text>
          )}
        </Flex>
      </IconButton>
    </ClientOnly>
  )
})

export const LightMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function LightMode(props, ref) {
    return (
      <Span
        color="fg"
        display="contents"
        className="chakra-theme light"
        colorPalette="gray"
        colorScheme="light"
        ref={ref}
        {...props}
      />
    )
  },
)

export const DarkMode = React.forwardRef<HTMLSpanElement, SpanProps>(
  function DarkMode(props, ref) {
    return (
      <Span
        color="fg"
        display="contents"
        className="chakra-theme dark"
        colorPalette="gray"
        colorScheme="dark"
        ref={ref}
        {...props}
      />
    )
  },
)
