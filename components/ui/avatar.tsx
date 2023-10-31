"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { cn, getInitials } from "#/lib/utils";

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarFallback, AvatarImage };

const UserAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    src: string;
    fallback: string;
    fallbackClasses?: string;
  }
>(({ className, src, fallback, fallbackClasses, ...props }, ref) => (
  <Avatar
    ref={ref}
    className={cn(
      "h-11 w-11 rounded-full bg-foreground/5 dark:bg-foreground/10",
      className,
    )}
    {...props}
  >
    <AvatarImage src={src} />
    <AvatarFallback className={cn("rounded-xl", fallbackClasses)}>
      {getInitials(fallback)}
    </AvatarFallback>
  </Avatar>
));
UserAvatar.displayName = "UserAvatar";

const ImplementerAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    src: string;
    fallback: string;
    fallbackClasses?: string;
  }
>(({ className, src, fallback, fallbackClasses, ...props }, ref) => (
  <Avatar
    ref={ref}
    className={cn(
      "h-11 w-11 rounded-lg bg-foreground/5 dark:bg-foreground/10",
      className,
    )}
    {...props}
  >
    <AvatarImage src={src} />
    <AvatarFallback className={cn("rounded-lg", fallbackClasses)}>
      {getInitials(fallback)}
    </AvatarFallback>
  </Avatar>
));
ImplementerAvatar.displayName = "OrganizationAvatar";

export { ImplementerAvatar as OrganizationAvatar, UserAvatar };
