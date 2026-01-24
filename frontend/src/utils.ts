import type { ApiError } from "./client"
import { OpenAPI } from "./client"
import useCustomToast from "./hooks/useCustomToast"

export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: "Invalid email address",
}

export const namePattern = {
  value: /^[A-Za-z\s\u00C0-\u017F]{1,30}$/,
  message: "Invalid name",
}

export const passwordRules = (isRequired = true) => {
  const rules: any = {
    minLength: {
      value: 8,
      message: "Password must be at least 8 characters",
    },
  }

  if (isRequired) {
    rules.required = "Password is required"
  }

  return rules
}

export const confirmPasswordRules = (
  getValues: () => any,
  isRequired = true,
) => {
  const rules: any = {
    validate: (value: string) => {
      const password = getValues().password || getValues().new_password
      return value === password ? true : "The passwords do not match"
    },
  }

  if (isRequired) {
    rules.required = "Password confirmation is required"
  }

  return rules
}

export const handleError = (err: ApiError | Error) => {
  const { showErrorToast } = useCustomToast()
  console.error(err)
  let errorMessage = "Something went wrong."

  if ("body" in err && (err.body as any)?.detail) {
    const errDetail = (err.body as any).detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      errorMessage = errDetail[0].msg
    } else if (typeof errDetail === "string") {
      errorMessage = errDetail
    }
  } else if (err.message) {
    errorMessage = err.message
  }

  showErrorToast(errorMessage)
}

/**
 * Format a public ID for display by converting to uppercase
 * @param publicId - The public ID string (e.g., 'u1a2b3c4' or 'i5d6e7f8')
 * @returns Uppercase formatted ID (e.g., 'U1A2B3C4' or 'I5D6E7F8')
 */
export const formatPublicId = (publicId: string | undefined): string => {
  if (!publicId) return ""
  return publicId.toUpperCase()
}

/**
 * Get the full URL for an image.
 * If it's a relative path (starting with /api), prepend OpenAPI.BASE.
 * @param url - The image URL or path
 * @returns The full image URL
 */
export const getImageUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (!url) return undefined
  if (url.startsWith("http")) return url
  if (url.startsWith("/api")) return `${OpenAPI.BASE}${url}`
  return url
}
