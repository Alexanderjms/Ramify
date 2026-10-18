import type { ReactNode } from "react";
import "./paint-hover.css";

export default function PaintHover({
  children,
  block = false,
}: {
  children: ReactNode;
  block?: boolean;
}) {
  const Tag = block ? "div" : "span";

  return (
    <>
      <Tag className="paint-hover-content">{children}</Tag>
      <Tag className="paint-hover-wash" aria-hidden="true" />
    </>
  );
}
