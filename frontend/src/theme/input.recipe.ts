import { defineRecipe } from "@chakra-ui/react"

export const inputRecipe = defineRecipe({
  base: {
    borderRadius: "l3",
  },
  variants: {
    variant: {
      outline: {
        field: {
          borderRadius: "l3",
        },
      },
      filled: {
        field: {
          borderRadius: "l3",
        },
      },
      flushed: {
        field: {
          borderRadius: "0",
        },
      },
    },
  },
})
