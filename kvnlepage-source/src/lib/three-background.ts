// Background with eyes photo, flower overlay, and dots grid

export function initBackground() {
  const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  if (!canvas) return;

  // Hide canvas, we'll use DOM elements instead
  canvas.style.display = 'none';

  // Check if already initialized
  if (document.getElementById('eyes-bg')) return;

  // Create eyes background container (z-index: 0)
  const eyesContainer = document.createElement('div');
  eyesContainer.id = 'eyes-bg';
  eyesContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  `;

  // Create a frame for the eyes image that will contain both eyes and flower
  const eyesFrame = document.createElement('div');
  eyesFrame.id = 'eyes-frame';
  eyesFrame.style.cssText = `
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 70vh;
    transform: translateY(-50%);
    overflow: hidden;
  `;

  // Eyes background image
  const eyesImg = document.createElement('img');
  eyesImg.id = 'eyes-img';
  eyesImg.src = '/assets/eyes-bg.webp';
  eyesImg.alt = '';
  eyesImg.style.cssText = `
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: auto;
    transform: translateY(-50%);
    filter: blur(0.5px);
  `;
  eyesFrame.appendChild(eyesImg);

  // Flower overlay - inside the eyes frame, 1:1 aspect ratio
  const flowerImg = document.createElement('img');
  flowerImg.id = 'flower-overlay';
  flowerImg.src = '/assets/flower-overlay.svg';
  flowerImg.alt = '';
  flowerImg.style.cssText = `
    position: absolute;
    top: 50%;
    right: -12%;
    height: 170%;
    aspect-ratio: 1 / 1;
    transform: translateY(-40%);
    object-fit: contain;
    z-index: 10;
    opacity: 0.6;
  `;
  eyesFrame.appendChild(flowerImg);

  eyesContainer.appendChild(eyesFrame);
  document.body.insertBefore(eyesContainer, document.body.firstChild);

  // Create dots grid - z-index: 5
  const dotsContainer = document.createElement('div');
  dotsContainer.id = 'dots-grid';
  dotsContainer.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 11px;
    width: calc(100% - 22px);
    height: 120px;
    z-index: 5;
    pointer-events: none;
    background-image: radial-gradient(circle, rgba(255,255,255,0.6) 2px, transparent 2px);
    background-size: 24px 24px;
    background-position: 0 0;
  `;
  document.body.appendChild(dotsContainer);
}

export function setBackgroundState(page: string) {
  console.log('Background state:', page);
}
