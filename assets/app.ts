const POINTER_OPACITY_ACTIVE = "true";
const LIGHT_GLOW_CLASS = "phpinfo-modern--light-glow";
const COPY_RESET_DELAY = 1800;

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
    } else {
      const legacyMedia = media as MediaQueryList & {
        addListener?: (listener: () => void) => void;
      };
      legacyMedia.addListener?.(handler);
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

  const copyStatus = document.createElement("p");
  copyStatus.className = "phpinfo-copy-status";
  copyStatus.setAttribute("aria-live", "polite");
  copyStatus.setAttribute("aria-atomic", "true");
  root.append(copyStatus);

  const copyText = async (value: string): Promise<boolean> => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_error) {
        // The selection-based fallback also works on local HTTP development servers.
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.cssText = "position:fixed; opacity:0; pointer-events:none;";
    document.body.append(textarea);
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch (_error) {
      return false;
    } finally {
      textarea.remove();
    }
  };

  const hasTextSelection = () => {
    const selection = window.getSelection();
    return selection !== null && !selection.isCollapsed && selection.toString().trim() !== "";
  };

  const copyCellValue = async (cell: HTMLTableCellElement) => {
    const value = cell.innerText.trim();
    if (value === "") {
      return;
    }

    const copied = await copyText(value);
    cell.dataset.copyState = copied ? "copied" : "failed";
    copyStatus.textContent = copied ? "Inhalt kopiert." : "Kopieren war nicht möglich.";

    window.setTimeout(() => {
      delete cell.dataset.copyState;
    }, COPY_RESET_DELAY);
  };

  const copyableCells = root.querySelectorAll<HTMLTableCellElement>("table td, table th");
  copyableCells.forEach((cell) => {
    if (cell.innerText.trim() === "") {
      return;
    }

    const containsInteractiveElement = cell.querySelector(
      "a, button, input, select, textarea"
    ) !== null;
    cell.classList.add("is-copyable");
    cell.title = "Klicken, um den Inhalt zu kopieren";

    if (!containsInteractiveElement) {
      cell.tabIndex = 0;
      cell.setAttribute("role", "button");
      cell.setAttribute("aria-label", "Inhalt kopieren");
    }

    cell.addEventListener("click", (event) => {
      const target = event.target;
      const clickedInteractiveElement =
        target instanceof Element && target.closest("a, button, input, select, textarea");

      if (!clickedInteractiveElement && !hasTextSelection()) {
        void copyCellValue(cell);
      }
    });

    cell.addEventListener("keydown", (event) => {
      if (containsInteractiveElement) {
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      void copyCellValue(cell);
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
