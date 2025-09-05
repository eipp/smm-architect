"use client"

import * as React from "react"

import { cn } from "@/lib/cn"

const Slider = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="range"
    className={cn(
      "w-full h-2 cursor-pointer appearance-none rounded-lg bg-secondary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
Slider.displayName = "Slider"

export { Slider }
