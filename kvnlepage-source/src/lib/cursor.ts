export function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  // Hide on touch devices
  if ('ontouchstart' in window) {
    cursor.style.display = 'none';
    return;
  }

  let cursorX = 0;
  let cursorY = 0;
  let targetX = 0;
  let targetY = 0;
  let currentState = 'default';

  document.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  // Smooth cursor movement
  function updateCursor() {
    cursorX += (targetX - cursorX) * 0.15;
    cursorY += (targetY - cursorY) * 0.15;

    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    requestAnimationFrame(updateCursor);
  }
  updateCursor();

  // State management
  function setCursorState(state: string) {
    if (currentState === state) return;

    // Remove all state classes
    cursor.classList.remove('hover', 'arrow-left', 'arrow-right', 'clicking');

    // Add new state class
    if (state !== 'default') {
      cursor.classList.add(state);
    }

    currentState = state;
  }

  // Click effect
  document.addEventListener('mousedown', () => {
    cursor.classList.add('clicking');
  });

  document.addEventListener('mouseup', () => {
    cursor.classList.remove('clicking');
  });

  // Hover effect on interactive elements
  const setupInteractiveElements = () => {
    const interactiveElements = document.querySelectorAll('a, button, [data-cursor-hover]');

    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        if (!cursor.classList.contains('arrow-left') && !cursor.classList.contains('arrow-right')) {
          setCursorState('hover');
        }
      });
      el.addEventListener('mouseleave', () => {
        if (!cursor.classList.contains('arrow-left') && !cursor.classList.contains('arrow-right')) {
          setCursorState('default');
        }
      });
    });

    // Book page navigation zones
    const prevZone = document.querySelector('.book-click-prev');
    const nextZone = document.querySelector('.book-click-next');

    if (prevZone) {
      prevZone.addEventListener('mouseenter', () => setCursorState('arrow-left'));
      prevZone.addEventListener('mouseleave', () => setCursorState('default'));
    }

    if (nextZone) {
      nextZone.addEventListener('mouseenter', () => setCursorState('arrow-right'));
      nextZone.addEventListener('mouseleave', () => setCursorState('default'));
    }
  };

  // Initial setup
  setupInteractiveElements();

  // Re-setup on page transitions (View Transitions)
  document.addEventListener('astro:page-load', setupInteractiveElements);

  // Hide default cursor globally
  document.body.style.cursor = 'none';

  // Also hide on all elements
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { cursor: none !important; }';
  document.head.appendChild(style);
}
