"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

import { cn } from "@/lib/utils"

// ── Mobile detection ───────────────────────────────────────────────────────
// Selects render as Vaul bottom sheets on small viewports and as Radix
// popovers on desktop. Detection is JS-driven so the two surfaces never
// render at the same time.
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches : false
  )
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const handler = () => setIsMobile(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [breakpoint])
  return isMobile
}

// ── Shared context for the responsive Select ──────────────────────────────
// Carries the open state and the resolved value/options so the mobile trigger
// can display the selected label and the mobile sheet can render option buttons
// — both derived from the <SelectItem> children without requiring Radix to
// mount its content (which only happens on desktop).
const SelectSheetContext = React.createContext(null)

function collectOptions(children) {
  const options = []
  const visit = (node) => {
    if (node == null || node === false || node === true) return
    if (Array.isArray(node)) { node.forEach(visit); return }
    if (!React.isValidElement(node)) return
    if (node.type === SelectItem) {
      options.push({
        value: node.props.value,
        label: node.props.children,
        disabled: node.props.disabled,
      })
    } else if (node.props && node.props.children !== undefined) {
      visit(node.props.children)
    }
  }
  visit(children)
  return options
}

// ── Root ──────────────────────────────────────────────────────────────────
// Wraps Radix Root to control open state and (for uncontrolled usage) mirror
// the value internally, so the mobile surface can read/write both.
const Select = React.forwardRef(
  ({ children, value, defaultValue, onValueChange, open: openProp, onOpenChange, ...props }, ref) => {
    const controlledValue = value !== undefined
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const currentValue = controlledValue ? value : internalValue
    const handleValueChange = React.useCallback((v) => {
      if (!controlledValue) setInternalValue(v)
      onValueChange?.(v)
    }, [controlledValue, onValueChange])

    const controlledOpen = openProp !== undefined
    const [internalOpen, setInternalOpen] = React.useState(false)
    const open = controlledOpen ? openProp : internalOpen
    const setOpen = React.useCallback((o) => {
      if (!controlledOpen) setInternalOpen(o)
      onOpenChange?.(o)
    }, [controlledOpen, onOpenChange])

    const options = React.useMemo(() => collectOptions(children), [children])

    const ctx = React.useMemo(
      () => ({ open, setOpen, value: currentValue, onValueChange: handleValueChange, options }),
      [open, setOpen, currentValue, handleValueChange, options]
    )

    return (
      <SelectSheetContext.Provider value={ctx}>
        <SelectPrimitive.Root
          ref={ref}
          {...props}
          value={currentValue}
          onValueChange={handleValueChange}
          open={open}
          onOpenChange={setOpen}
        >
          {children}
        </SelectPrimitive.Root>
      </SelectSheetContext.Provider>
    )
  }
)
Select.displayName = "Select"

const SelectGroup = SelectPrimitive.Group

// ── Value (trigger label) ──────────────────────────────────────────────────
const SelectValue = React.forwardRef(({ placeholder, children, ...props }, ref) => {
  const isMobile = useIsMobile()
  const ctx = React.useContext(SelectSheetContext)
  if (isMobile && ctx) {
    const selected = ctx.value != null && ctx.value !== ""
      ? ctx.options.find((o) => o.value === ctx.value)
      : null
    return (
      <span ref={ref} className="truncate" {...props}>
        {selected ? selected.label : (placeholder || children)}
      </span>
    )
  }
  return <SelectPrimitive.Value ref={ref} placeholder={placeholder} {...props}>{children}</SelectPrimitive.Value>
})
SelectValue.displayName = "SelectValue"

// ── Trigger ────────────────────────────────────────────────────────────────
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile()
  const ctx = React.useContext(SelectSheetContext)
  if (isMobile && ctx) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => ctx.setOpen(!ctx.open)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}
      >
        {children}
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectPrimitive.Icon>
      </button>
    )
  }
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

// ── Content (popover on desktop, Vaul bottom sheet on mobile) ──────────────
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const isMobile = useIsMobile()
  const ctx = React.useContext(SelectSheetContext)

  if (isMobile && ctx) {
    return (
      <Drawer open={ctx.open} onOpenChange={ctx.setOpen} dismissible>
        <DrawerContent className="max-h-[82vh] p-0">
          <DrawerHeader className="px-4 pt-3 pb-1">
            <DrawerTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Select</DrawerTitle>
          </DrawerHeader>
          <div className="px-1 pb-4 max-h-[68vh] overflow-y-auto">
            {ctx.options.length > 0 && ctx.options.map((opt) => {
              const active = opt.value === ctx.value
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    ctx.onValueChange?.(opt.value)
                    ctx.setOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm outline-none transition-colors",
                    "disabled:opacity-50 disabled:pointer-events-none",
                    active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 ml-2" />}
                </button>
              )
            })}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}