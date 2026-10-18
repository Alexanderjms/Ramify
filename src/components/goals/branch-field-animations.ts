export function animateField(element: HTMLElement, exit = false, move = true) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return element.animate(
    [
      { opacity: 0, transform: reduced || !move ? "none" : "translateY(6px)" },
      { opacity: 1, transform: reduced || !move ? "none" : "translateY(0)" },
    ],
    {
      duration: reduced || exit ? 150 : 200,
      direction: exit ? "reverse" : "normal",
      easing:
        getComputedStyle(element).getPropertyValue("--ease-out").trim() ||
        "ease-out",
    },
  );
}
