const POINTER_OPACITY_ACTIVE = "true";
const LIGHT_GLOW_CLASS = "phpinfo-modern--light-glow";

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector<HTMLDivElement>("[data-phpinfo-root]");
  if (!root) {
    return;
  }

  const pointerMedia = window.matchMedia?.("(pointer: fine)") ?? null;
  const reducedMotionMedia = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ) ?? null;

  const hasWebGLSupport = (() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      );
    } catch (_error) {
      return false;
    }
  })();

  const shouldUseLightGlow = () => {
    const prefersReducedMotion = reducedMotionMedia?.matches ?? false;
    const hasFinePointer = pointerMedia?.matches ?? true;
    return prefersReducedMotion || !hasFinePointer || !hasWebGLSupport;
  };

  let lastPointerPosition: { x: number; y: number } | null = null;

  const activatePointer = () => {
    if (root.dataset.pointerActive !== POINTER_OPACITY_ACTIVE) {
      root.dataset.pointerActive = POINTER_OPACITY_ACTIVE;
    }
  };

  const deactivatePointer = () => {
    root.style.removeProperty("--pointer-x");
    root.style.removeProperty("--pointer-y");
    delete root.dataset.pointerActive;
  };

  const updatePointer = () => {
    if (lastPointerPosition === null) {
      return;
    }

    const bounds = root.getBoundingClientRect();
    const { x, y } = lastPointerPosition;
    const isPointerInside =
      x >= bounds.left &&
      x <= bounds.right &&
      y >= bounds.top &&
      y <= bounds.bottom;

    if (!isPointerInside) {
      if (root.dataset.pointerActive === POINTER_OPACITY_ACTIVE) {
        deactivatePointer();
      }
      return;
    }

    root.style.setProperty("--pointer-x", `${x - bounds.left}px`);
    root.style.setProperty("--pointer-y", `${y - bounds.top}px`);
    activatePointer();
  };

  const queuePointerUpdate = (() => {
    let frame = 0;
    return () => {
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        updatePointer();
      });
    };
  })();

  const applyGlowPreference = () => {
    root.classList.toggle(LIGHT_GLOW_CLASS, shouldUseLightGlow());
  };

  const observeMediaQuery = (media: MediaQueryList | null) => {
    if (!media) {
      return;
    }

    const handler = () => {
      applyGlowPreference();
      queuePointerUpdate();
    };

    if ("addEventListener" in media) {
      media.addEventListener("change", handler);
    } else if ("addListener" in media) {
      media.addListener(handler);
    }
  };

  const shouldHandlePointer = (event: PointerEvent) =>
    event.isPrimary && event.pointerType !== "touch";

  const handlePointerMove = (event: PointerEvent) => {
    if (!shouldHandlePointer(event)) {
      return;
    }

    lastPointerPosition = { x: event.clientX, y: event.clientY };
    queuePointerUpdate();
  };

  const handlePointerCancel = () => {
    lastPointerPosition = null;
    deactivatePointer();
  };

  const syncPointerToViewport = () => {
    if (lastPointerPosition === null) {
      return;
    }
    queuePointerUpdate();
  };

  window.addEventListener("pointermove", handlePointerMove);
  root.addEventListener("pointerover", handlePointerMove);
  applyGlowPreference();
  observeMediaQuery(pointerMedia);
  observeMediaQuery(reducedMotionMedia);
  const pointerLeftViewport = (event: PointerEvent) => {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;

    return (
      clientX <= 0 ||
      clientX >= innerWidth ||
      clientY <= 0 ||
      clientY >= innerHeight
    );
  };

  window.addEventListener("pointercancel", handlePointerCancel);
  window.addEventListener("pointerout", (event) => {
    if (!event.relatedTarget && pointerLeftViewport(event)) {
      handlePointerCancel();
    }
  });
  window.addEventListener("blur", handlePointerCancel);

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
