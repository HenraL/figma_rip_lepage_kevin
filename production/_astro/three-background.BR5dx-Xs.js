function d(){const e=document.getElementById("bg-canvas");if(!e||(e.style.display="none",document.getElementById("eyes-bg")))return;const i=document.createElement("div");i.id="eyes-bg",i.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
    background: #000;
  `;const t=document.createElement("div");t.id="eyes-frame",t.style.cssText=`
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 70vh;
    transform: translateY(-50%);
    overflow: hidden;
  `;const n=document.createElement("img");n.id="eyes-img",n.src="/assets/eyes-bg.webp",n.alt="",n.style.cssText=`
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: auto;
    transform: translateY(-50%);
    filter: blur(0.5px);
  `,t.appendChild(n);const o=document.createElement("img");o.id="flower-overlay",o.src="/assets/flower-overlay.svg",o.alt="",o.style.cssText=`
    position: absolute;
    top: 50%;
    right: -12%;
    height: 170%;
    aspect-ratio: 1 / 1;
    transform: translateY(-40%);
    object-fit: contain;
    z-index: 10;
    opacity: 0.6;
  `,t.appendChild(o),i.appendChild(t),document.body.insertBefore(i,document.body.firstChild);const s=document.createElement("div");s.id="dots-grid",s.style.cssText=`
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
  `,document.body.appendChild(s)}function a(){const e=document.getElementById("eyes-bg");e&&(e.style.display="none")}export{a as h,d as i};
