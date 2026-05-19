"use client"

import * as React from "react"
import { Controller } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const FormFieldContext = React.createContext(null)

export function Form({ children }) {
  return <>{children}</>
}

export function FormField({ control, name, render }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormFieldContext.Provider value={fieldState}>{render({ field })}</FormFieldContext.Provider>
      )}
    />
  )
}

export function FormItem({ className, ...props }) {
  return <div className={cn("space-y-2", className)} {...props} />
}

export function FormLabel({ className, ...props }) {
  return <Label className={cn("text-sm font-medium leading-none", className)} {...props} />
}

export function FormControl({ className, ...props }) {
  return <div className={cn("flex flex-col gap-2", className)} {...props} />
}

export function FormMessage({ className, children, ...props }) {
  const fieldState = React.useContext(FormFieldContext)
  const message = fieldState?.error?.message || children
  if (!message) return null
  return (
    <p className={cn("text-sm text-destructive", className)} {...props}>
      {message}
    </p>
  )
}
