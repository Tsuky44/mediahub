"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
  const { setOpen } = React.useContext(TooltipContext)
  
  const handleMouseEnter = (e: React.MouseEvent) => {
    setOpen(true)
  }
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    setOpen(false)
  }

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>
    return React.cloneElement(child, {
      onMouseEnter: (e: React.MouseEvent) => {
        handleMouseEnter(e)
        child.props.onMouseEnter?.(e)
      },
      onMouseLeave: (e: React.MouseEvent) => {
        handleMouseLeave(e)
        child.props.onMouseLeave?.(e)
      },
      ref,
      ...props
    })
  }

  return (
    <div
      ref={ref as any}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { open } = React.useContext(TooltipContext)

  if (!open) return null

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md bg-gray-900 border border-gray-700 px-3 py-1.5 text-xs text-gray-100 animate-in fade-in-0 zoom-in-95",
        "bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-lg",
        className
      )}
      {...props}
    />
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
