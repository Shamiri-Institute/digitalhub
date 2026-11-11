"use client";

import type { Menu as MenuParts } from "@base-ui/react/menu";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { Check } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  use,
  useRef,
} from "react";

import { afterPage, type StandIn, useStandIn } from "#/components/deferred";
import { cn } from "#/lib/utils";

// Base UI's Menu adds about 22 KB gzipped to a page, and every table page draws menus (row
// actions, Edit columns) that most visits never open. Each menu draws its trigger until the code
// has loaded after the page, then hands the trigger to Base UI.
const [useMenuCode, loadMenuCode] = afterPage(() =>
  import("@base-ui/react/menu").then((mod) => mod.Menu),
);

const MenuCode = createContext<({ Menu: typeof MenuParts | null } & StandIn) | null>(null);

function useMenuCodeContext() {
  const context = use(MenuCode);
  if (!context) throw new Error("Menu parts must be inside <DropdownMenu>");
  return context;
}

// Items render only inside an open popup, and a popup opens only once the code has loaded.
function useLoadedMenu() {
  const { Menu } = useMenuCodeContext();
  if (!Menu) throw new Error("A menu item rendered before the menu's code loaded");
  return Menu;
}

// A dialog opened from a menu item renders inside the menu, so it unmounts if the menu closes.
// While one is on screen the menu stays open: Escape, a click outside and focus leaving belong to
// the dialog, whose own guard keeps it open while it saves.
const OpenDialogs = createContext<RefObject<number> | null>(null);

/** A ref for a dialog's popup that holds the menu it was opened from open while it is mounted. */
function useHoldMenuOpen() {
  const openDialogs = use(OpenDialogs);
  return (node: HTMLElement | null) => {
    if (!node || !openDialogs) return;
    openDialogs.current += 1;
    return () => {
      openDialogs.current -= 1;
    };
  };
}

function DropdownMenu({
  onOpenChange,
  ...props
}: Omit<MenuParts.Root.Props, "children"> & { children?: ReactNode }) {
  const Menu = useMenuCode();
  const standIn = useStandIn(loadMenuCode);
  const openDialogs = useRef(0);
  return (
    <MenuCode value={{ Menu, ...standIn }}>
      <OpenDialogs value={openDialogs}>
        {Menu ? (
          <Menu.Root
            {...props}
            onOpenChange={(open, details) => {
              if (!open && openDialogs.current > 0) {
                details.cancel();
                return;
              }
              onOpenChange?.(open, details);
            }}
          />
        ) : (
          props.children
        )}
      </OpenDialogs>
    </MenuCode>
  );
}

// Only what a plain button also takes, so the stand-in draws the same element.
type TriggerProps = Omit<ComponentProps<"button">, "ref"> & { render?: ReactElement };

function DropdownMenuTrigger(props: TriggerProps) {
  const { Menu, standInHandlers, takeOver } = useMenuCodeContext();
  if (!Menu) return <StandInTrigger {...props} handlers={standInHandlers} />;
  return <Menu.Trigger {...props} ref={takeOver} />;
}

// The closed trigger as Base UI draws it, so nothing moves when the real one takes over.
function StandInTrigger({
  render,
  handlers,
  ...props
}: TriggerProps & { handlers: StandIn["standInHandlers"] }) {
  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      { type: "button", "aria-haspopup": "menu", "aria-expanded": false },
      props,
      handlers,
    ),
  });
}

function DropdownMenuContent({
  className,
  side,
  align,
  sideOffset = 4,
  ...props
}: MenuParts.Popup.Props & Pick<MenuParts.Positioner.Props, "side" | "align" | "sideOffset">) {
  const { Menu } = useMenuCodeContext();
  if (!Menu) return null;
  return (
    <Menu.Portal>
      <Menu.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-32 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-hidden transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

const itemClass =
  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

function DropdownMenuItem({ className, ...props }: MenuParts.Item.Props) {
  const Menu = useLoadedMenu();
  return (
    <Menu.Item data-slot="dropdown-menu-item" className={cn(itemClass, className)} {...props} />
  );
}

function DropdownMenuLinkItem({ className, ...props }: MenuParts.LinkItem.Props) {
  const Menu = useLoadedMenu();
  return (
    <Menu.LinkItem data-slot="dropdown-menu-item" className={cn(itemClass, className)} {...props} />
  );
}

function DropdownMenuCheckboxItem({ className, children, ...props }: MenuParts.CheckboxItem.Props) {
  const Menu = useLoadedMenu();
  return (
    <Menu.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(itemClass, "cursor-pointer pl-8", className)}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center rounded border border-input bg-white in-data-checked:border-primary in-data-checked:bg-primary in-data-checked:text-primary-foreground">
        <Menu.CheckboxItemIndicator>
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  );
}

function DropdownMenuLabel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: MenuParts.Separator.Props) {
  const Menu = useLoadedMenu();
  return (
    <Menu.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useHoldMenuOpen,
};
