"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import * as React from "react";

import { cn, getInitials } from "#/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };

function UserAvatar({
  className,
  src,
  fallback,
  fallbackClasses,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  src: string;
  fallback: string;
  fallbackClasses?: string;
}) {
  return (
    <Avatar
      data-slot="user-avatar"
      className={cn("h-11 w-11 rounded-full bg-foreground/5 dark:bg-foreground/10", className)}
      {...props}
    >
      <AvatarImage src={src} />
      <AvatarFallback className={cn("rounded-xl", fallbackClasses)}>
        {getInitials(fallback)}
      </AvatarFallback>
    </Avatar>
  );
}

function ImplementerAvatar({
  className,
  src,
  fallback,
  fallbackClasses,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  src: string;
  fallback: string;
  fallbackClasses?: string;
}) {
  return (
    <Avatar
      data-slot="implementer-avatar"
      className={cn("h-11 w-11 rounded-lg bg-foreground/5 dark:bg-foreground/10", className)}
      {...props}
    >
      <AvatarImage src={src} />
      <AvatarFallback className={cn("rounded-lg", fallbackClasses)}>
        {getInitials(fallback)}
      </AvatarFallback>
    </Avatar>
  );
}

export { ImplementerAvatar as OrganizationAvatar, UserAvatar };
