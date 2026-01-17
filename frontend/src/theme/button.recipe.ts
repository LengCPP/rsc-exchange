import { defineRecipe } from "@chakra-ui/react"

export const buttonRecipe = defineRecipe({
  base: {
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "l3",
    cursor: "pointer",
    transition: "all 0.2s ease-in-out",
  },
  variants: {
    variant: {
      primary: {
        bg: "ui.primary",
        color: "white",
        _hover: {
          bg: "ui.hover",
          _disabled: { bg: "ui.primary" },
        },
        _active: {
          bg: "ui.hover",
        },
      },
      secondary: {
        bg: "transparent",
        borderWidth: "1px",
        borderColor: "ui.primary",
        color: "ui.primary",
        _hover: {
          borderColor: "ui.hover",
          color: "ui.hover",
          bg: "transparent",
        },
      },
      danger: {
        bg: "ui.danger",
        color: "white",
        _hover: {
          bg: "ui.dangerHover",
        },
      },
      dangerSecondary: {
        bg: "transparent",
        borderWidth: "1px",
        borderColor: "ui.danger",
        color: "ui.danger",
        _hover: {
          bg: "ui.danger/10",
          borderColor: "ui.dangerHover",
          color: "ui.dangerHover",
        },
      },
      ghost: {
        bg: "transparent",
        color: "ui.primary",
        _hover: {
          bg: "gray.100",
          color: "ui.hover",
        },
      },
      // Aliases/Fallbacks
      solid: {
        bg: "ui.primary",
        color: "white",
        _hover: {
          bg: "ui.hover",
        },
      },
      outline: {
        bg: "transparent",
        borderWidth: "1px",
        borderColor: "ui.primary",
        color: "ui.primary",
        _hover: {
          borderColor: "ui.hover",
          color: "ui.hover",
          bg: "transparent",
        },
      },
      subtle: {
        bg: "ui.primary/10",
        color: "ui.primary",
        _hover: {
          bg: "ui.hover/20",
          color: "ui.hover",
        },
      },
    },
  },
  defaultVariants: {
    variant: "primary",
  },
})