const POINTER_OPACITY_ACTIVE = "true";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector<HTMLDivElement>("[data-phpinfo-root]");
  if (!root) {
    return;
  }

  const updatePointer = (clientX: number, clientY: number) => {
    const bounds = root.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;

    root.style.setProperty("--pointer-x", `${x}px`);
    root.style.setProperty("--pointer-y", `${y}px`);
  };

  const queuePointerUpdate = (() => {
    let frame = 0;
    return (clientX: number, clientY: number) => {
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        updatePointer(clientX, clientY);
        frame = 0;
      });
    };
  })();

  let lastPointerPosition: { x: number; y: number } | null = null;

  const pointerEnter = (event: PointerEvent) => {
    root.dataset.pointerActive = POINTER_OPACITY_ACTIVE;
    lastPointerPosition = { x: event.clientX, y: event.clientY };
    queuePointerUpdate(event.clientX, event.clientY);
  };

  const pointerLeave = () => {
    root.style.removeProperty("--pointer-x");
    root.style.removeProperty("--pointer-y");
    delete root.dataset.pointerActive;
    lastPointerPosition = null;
  };

  const pointerMove = (event: PointerEvent) => {
    lastPointerPosition = { x: event.clientX, y: event.clientY };
    queuePointerUpdate(event.clientX, event.clientY);
  };

  const syncPointerToViewport = () => {
    if (
      lastPointerPosition === null ||
      root.dataset.pointerActive !== POINTER_OPACITY_ACTIVE
    ) {
      return;
    }
    queuePointerUpdate(lastPointerPosition.x, lastPointerPosition.y);
  };

  root.addEventListener("pointerenter", pointerEnter);
  root.addEventListener("pointerleave", pointerLeave);
  root.addEventListener("pointermove", pointerMove);

  window.addEventListener("scroll", syncPointerToViewport, { passive: true });
  window.addEventListener("resize", syncPointerToViewport);

  const rows = root.querySelectorAll<HTMLTableRowElement>("table tbody tr");
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      row.classList.add("is-hovered");
    });
    row.addEventListener("mouseleave", () => {
      row.classList.remove("is-hovered");
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-visible", entry.isIntersecting);
      });
    },
    {
      rootMargin: "-20% 0px -60%",
      threshold: [0, 1],
    }
  );

  const stickyHeaders = root.querySelectorAll<HTMLElement>(".section-title");
  stickyHeaders.forEach((header) => observer.observe(header));
});
