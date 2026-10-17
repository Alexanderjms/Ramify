import type { SVGProps } from "react";

const paths = {
  branch: (
    <>
      <path d="M6 3v12M18 6a6 6 0 0 1-6 6H6" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="3" r="3" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18m7-13-4 4 4 4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="10" rx="1" />
      <rect x="14" y="3" width="7" height="6" rx="1" />
      <rect x="14" y="13" width="7" height="8" rx="1" />
      <rect x="3" y="17" width="7" height="4" rx="1" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="10" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  github: (
    <path
      fill="currentColor"
      stroke="none"
      d="M12 .75a11.25 11.25 0 0 0-3.558 21.923c.563.104.768-.244.768-.543 0-.267-.01-.975-.015-1.914-3.13.68-3.79-1.51-3.79-1.51-.512-1.3-1.25-1.646-1.25-1.646-1.023-.7.078-.686.078-.686 1.13.08 1.725 1.16 1.725 1.16 1.006 1.724 2.64 1.226 3.283.938.102-.73.394-1.226.716-1.508-2.499-.284-5.126-1.25-5.126-5.565 0-1.23.44-2.233 1.16-3.02-.116-.285-.503-1.429.11-2.978 0 0 .945-.302 3.095 1.154A10.8 10.8 0 0 1 12 6.176c.956.004 1.919.13 2.819.379 2.149-1.456 3.092-1.154 3.092-1.154.615 1.55.228 2.693.112 2.978.722.787 1.158 1.79 1.158 3.02 0 4.327-2.631 5.278-5.138 5.557.404.35.766 1.04.766 2.096 0 1.514-.014 2.736-.014 3.108 0 .302.203.653.774.542A11.252 11.252 0 0 0 12 .75Z"
    />
  ),
};

export default function Icon({
  name,
  className = "size-[17px]",
  ...props
}: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
