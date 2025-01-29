import React from "react"

/**
 * Minimal tailwind-based button
 * usage: <Button onClick={...} variant="outline">Click Me</Button>
 */
export function Button({
  children,
  onClick,
  disabled = false,
  variant = "default",
  ...props
}) {
  let base = "inline-flex items-center justify-center px-3 py-1.5 font-medium rounded-md transition-colors"
  let styles = ""

  if (variant === "outline") {
    styles = "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
  } else {
    styles = "bg-blue-600 text-white hover:bg-blue-700"
  }

  if (disabled) {
    styles += " opacity-50 pointer-events-none"
  }

  return (
    <button onClick={onClick} className={`${base} ${styles}`} disabled={disabled} {...props}>
      {children}
    </button>
  )
}