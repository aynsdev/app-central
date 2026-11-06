"use client"

import * as React from "react"

/** Explicit wiring avoids dangling references when optional description/error text is absent. */
function useField({ id, description, error }: { id?: string; description?: string; error?: string } = {}) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId
  return {
    controlProps: {
      id: controlId,
      "aria-invalid": Boolean(error) || undefined,
      "aria-describedby": [description && `${controlId}-description`, error && `${controlId}-error`].filter(Boolean).join(" ") || undefined,
    },
    labelProps: { htmlFor: controlId },
    descriptionProps: { id: `${controlId}-description` },
    errorProps: { id: `${controlId}-error` },
  }
}
export { useField }
