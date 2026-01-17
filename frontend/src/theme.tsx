import { createSystem, defaultConfig } from "@chakra-ui/react"
import { buttonRecipe } from "./theme/button.recipe"
import { inputRecipe } from "./theme/input.recipe"

export const system = createSystem(defaultConfig, {
  globalCss: {
    html: {
      fontSize: "16px",
    },
    body: {
      fontSize: "0.875rem",
      margin: 0,
      padding: 0,
    },
    ".main-link": {
      color: "ui.primary",
      fontWeight: "bold",
    },
  },
  theme: {
    tokens: {
      colors: {
        ui: {
          primary: { value: "#35cafb" },
          hover: { value: "#fb6635" },
          danger: { value: "#e53e3e" },
          dangerHover: { value: "#c53030" },
        },
      },
      radii: {
        l1: { value: "2rem" },
        l2: { value: "2rem" },
        l3: { value: "2rem" },
      },
    },
    recipes: {
      button: buttonRecipe,
      input: inputRecipe,
    },
  },
})
