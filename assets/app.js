const POINTER_OPACITY_ACTIVE = "true";
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-phpinfo-root]");
  if (!root) {
    return;
  }
  const updatePointer = (event) => {
    const bounds = root.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    root.style.setProperty("--pointer-x", `${x}px`);
    root.style.setProperty("--pointer-y", `${y}px`);
  };
  const pointerEnter = (event) => {
    root.dataset.pointerActive = POINTER_OPACITY_ACTIVE;
    updatePointer(event);
  };
  const pointerLeave = () => {
    root.style.removeProperty("--pointer-x");
    root.style.removeProperty("--pointer-y");
    delete root.dataset.pointerActive;
  };
  const throttledPointerMove = (() => {
    let frame = 0;
    return (event) => {
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        updatePointer(event);
        frame = 0;
      });
    };
  })();
  root.addEventListener("pointerenter", pointerEnter);
  root.addEventListener("pointerleave", pointerLeave);
  root.addEventListener("pointermove", throttledPointerMove);
  const rows = root.querySelectorAll("table tbody tr");
  rows.forEach((row) => {
    row.addEventListener("mouseenter", () => {
      row.classList.add("is-hovered");
    });
    row.addEventListener("mouseleave", () => {
      row.classList.remove("is-hovered");
    });
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, {
    rootMargin: "-20% 0px -60%",
    threshold: [0, 1]
  });
  const stickyHeaders = root.querySelectorAll(".section-title");
  stickyHeaders.forEach((header) => observer.observe(header));
});
