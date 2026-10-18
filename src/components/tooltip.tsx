"use client";

import Link from "next/link";
import type { ComponentProps, ReactElement } from "react";
import WarmTooltip from "@/components/WarmTooltip";

export default function Tooltip({
  content,
  children,
}: {
  content?: string;
  children: ReactElement<Record<string, unknown>>;
}) {
  return content ? (
    <WarmTooltip asChild content={content} size="sm" popBlur={0}>
      {children}
    </WarmTooltip>
  ) : (
    children
  );
}

export function TooltipButton({ title, ...props }: ComponentProps<"button">) {
  return (
    <Tooltip content={title ?? props["aria-label"]}>
      <button {...props} />
    </Tooltip>
  );
}

export function TooltipLink({ title, ...props }: ComponentProps<typeof Link>) {
  return (
    <Tooltip content={title}>
      <Link aria-label={props["aria-label"] ?? title} {...props} />
    </Tooltip>
  );
}
