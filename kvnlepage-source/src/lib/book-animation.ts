import * as THREE from 'three';
import gsap from 'gsap';

interface PageSpread {
  front: string;
  back: string;
}

interface BookAnimationOptions {
  container: HTMLElement;
  leftCover: string;
  pages: PageSpread[];
  onPageChange?: (currentPage: number, totalPages: number) => void;
}

export class BookAnimation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private bookGroup: THREE.Group;
  private pageGroups: THREE.Group[] = [];
  private currentPage: number = 0;
  private isAnimating: boolean = false;
  private totalPages: number;
  private onPageChange?: (currentPage: number, totalPages: number) => void;
  private container: HTMLElement;
  private animationFrameId: number | null = null;
  private readonly pageWidth = 2.5;
  private readonly pageHeight = 3.3;
  private pages: PageSpread[];
  private loadedPages: Set<number> = new Set();
  private textureLoader: THREE.TextureLoader;
  private needsRender: boolean = true;
  private isActive: boolean = true;

  constructor(options: BookAnimationOptions) {
    this.container = options.container;
    this.totalPages = options.pages.length;
    this.onPageChange = options.onPageChange;
    this.pages = options.pages;
    this.textureLoader = new THREE.TextureLoader();

    // Initialize Three.js scene
    this.scene = new THREE.Scene();

    // Create a group to hold all pages
    this.bookGroup = new THREE.Group();
    this.bookGroup.scale.set(1, 1, 1);
    this.scene.add(this.bookGroup);

    // Camera setup
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
    this.camera.position.set(0, 0.45, 4);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup with transparent background
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Limit pixel ratio for performance
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(0, 3, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-3, 1, 2);
    this.scene.add(fillLight);

    // Create placeholder groups for all pages
    this.createPagePlaceholders();

    // Load left cover first
    this.loadLeftCover(options.leftCover);

    // Load first few pages immediately, rest lazily
    this.loadPagesProgressively();
        
    // Center the book in view based on placeholder geometry
    this.centerBookInView();

    // Handle resize
    window.addEventListener('resize', this.handleResize);

    // Pre-compile shaders to avoid stutter on first animation
    this.renderer.compile(this.scene, this.camera);

    // Start render loop
    this.animate();
  }

  // Compute bounding box of the bookGroup and center the camera horizontally
  private centerBookInView(): void {
    // Ensure scene has at least the placeholder geometry
    try {
      const box = new THREE.Box3().setFromObject(this.bookGroup);
      const center = box.getCenter(new THREE.Vector3());
      // Shift the book group so its center sits slightly to the right of origin
      // This moves the pages visually to the right (opposite direction)
      const horizontalOffset = 1.5; // increase to shift further right
      this.bookGroup.position.x = -center.x + horizontalOffset;
      // Ensure camera looks at scene origin
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      this.requestRender();
    } catch (e) {
      // If something goes wrong, just ignore — centering is best-effort
      // console.warn('Centering book failed', e);
    }
  }

  private warmUp(): void {
    // Re-compile shaders now that textures are loaded
    this.renderer.compile(this.scene, this.camera);

    // Pre-warm the curve function for the first page to avoid allocation stutter
    const firstPage = this.pageGroups[0];
    if (firstPage && firstPage.children.length > 0) {
      // Do a tiny deformation and reset to trigger Float32Array allocation
      this.applyCurve(firstPage, 0.001);
      this.resetCurve(firstPage);

      // Force a render to upload everything to GPU
      this.renderer.render(this.scene, this.camera);
    }
  }

  private createPagePlaceholders(): void {
    const { pageWidth, pageHeight } = this;

    for (let index = 0; index < this.totalPages; index++) {
      const pageGroup = new THREE.Group();
      pageGroup.userData.pageIndex = index;
      pageGroup.userData.loaded = false;

      // Create placeholder geometry (will be replaced when textures load)
      const geometry = new THREE.PlaneGeometry(pageWidth, pageHeight, 20, 1);
      geometry.translate(pageWidth / 2, 0, 0);

      // Simple placeholder material (dark gray)
      const placeholderMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.0,
      });

      const placeholderMesh = new THREE.Mesh(geometry, placeholderMaterial);
      pageGroup.add(placeholderMesh);

      // Position the page group
      pageGroup.position.set(0, 0, -index * 0.005);
      pageGroup.renderOrder = -index;

      this.pageGroups[index] = pageGroup;
      this.bookGroup.add(pageGroup);
    }

    // Notify initial page
    this.onPageChange?.(1, this.totalPages);

    // Initial render
    this.requestRender();
  }

  private loadPagesProgressively(): void {
    // Load first 3 pages immediately
    for (let i = 0; i < Math.min(3, this.totalPages); i++) {
      this.loadPage(i);
    }

    // Load remaining pages with delay to not block the main thread
    let loadIndex = 3;
    const loadNext = () => {
      if (loadIndex < this.totalPages) {
        this.loadPage(loadIndex);
        loadIndex++;
        setTimeout(loadNext, 100); // Stagger loading
      }
    };
    setTimeout(loadNext, 500); // Start after initial pages
  }

  private loadPage(index: number): void {
    if (this.loadedPages.has(index)) return;
    this.loadedPages.add(index);

    const pageSpread = this.pages[index];
    const pageGroup = this.pageGroups[index];
    const { pageWidth, pageHeight } = this;

    // Remove placeholder
    while (pageGroup.children.length > 0) {
      const child = pageGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
      pageGroup.remove(child);
    }

    // Create geometry
    const geometry = new THREE.PlaneGeometry(pageWidth, pageHeight, 20, 1);
    geometry.translate(pageWidth / 2, 0, 0);

    // Load front texture
    this.textureLoader.load(
      pageSpread.front,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        // Pre-upload texture to GPU for first pages to avoid stutter
        if (index < 3) {
          this.renderer.initTexture(texture);
        }
        const frontMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.FrontSide,
          roughness: 0.8,
          metalness: 0.0,
        });
        const frontMesh = new THREE.Mesh(geometry.clone(), frontMaterial);
        frontMesh.position.z = 0.002;
        pageGroup.add(frontMesh);
        pageGroup.userData.loaded = true;
        this.requestRender();

        // Warm up first page after it loads
        if (index === 0) {
          setTimeout(() => this.warmUp(), 50);
        }
      },
      undefined,
      (error) => {
        console.warn(`Failed to load front texture: ${pageSpread.front}`, error);
      }
    );

    // Load back texture
    this.textureLoader.load(
      pageSpread.back,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;
        texture.offset.x = 1;
        // Pre-upload texture to GPU for first pages
        if (index < 3) {
          this.renderer.initTexture(texture);
        }

        const backMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.BackSide,
          roughness: 0.8,
          metalness: 0.0,
        });
        const backMesh = new THREE.Mesh(geometry.clone(), backMaterial);
        backMesh.position.z = -0.002;
        pageGroup.add(backMesh);
        this.requestRender();
      },
      undefined,
      (error) => {
        console.warn(`Failed to load back texture: ${pageSpread.back}`, error);
      }
    );
  }

  private loadLeftCover(coverImage: string): void {
    const { pageWidth, pageHeight } = this;

    const geometry = new THREE.PlaneGeometry(pageWidth, pageHeight, 1, 1);
    geometry.translate(-pageWidth / 2, 0, 0);

    this.textureLoader.load(
      coverImage,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.FrontSide,
          roughness: 0.8,
          metalness: 0.0,
        });
        const coverMesh = new THREE.Mesh(geometry, material);
        coverMesh.position.z = 0;
        coverMesh.renderOrder = -1000;
        this.bookGroup.add(coverMesh);
        this.requestRender();
      },
      undefined,
      (error) => {
        console.warn(`Failed to load left cover: ${coverImage}`, error);
      }
    );
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.requestRender();
  };

  private animate = (): void => {
    if (!this.isActive) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Only render when needed (during animations or after texture loads)
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      // Don't reset needsRender here - animations will set it each frame
    }
  };

  private requestRender(): void {
    this.needsRender = true;
  }

  private applyCurve(pageGroup: THREE.Group, curlAmount: number): void {
    const { pageWidth } = this;

    pageGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        const positions = geometry.attributes.position;

        if (!child.userData.originalPositions) {
          child.userData.originalPositions = Float32Array.from(positions.array);
        }

        const originalPositions = child.userData.originalPositions;

        for (let i = 0; i < positions.count; i++) {
          const origX = originalPositions[i * 3];
          const origY = originalPositions[i * 3 + 1];
          const origZ = originalPositions[i * 3 + 2];

          const t = origX / pageWidth;
          const curve = Math.sin(t * Math.PI) * curlAmount;

          positions.setXYZ(i, origX, origY + curve * 0.4, origZ + curve);
        }

        positions.needsUpdate = true;
        geometry.computeVertexNormals();
      }
    });
  }

  private resetCurve(pageGroup: THREE.Group): void {
    pageGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        const positions = geometry.attributes.position;
        const originalPositions = child.userData.originalPositions;

        if (originalPositions) {
          for (let i = 0; i < positions.count; i++) {
            positions.setXYZ(
              i,
              originalPositions[i * 3],
              originalPositions[i * 3 + 1],
              originalPositions[i * 3 + 2]
            );
          }
          positions.needsUpdate = true;
          geometry.computeVertexNormals();
        }
      }
    });
  }

  public nextPage(): void {
    if (this.isAnimating || this.currentPage >= this.totalPages - 1) return;

    // Preload upcoming pages
    for (let i = this.currentPage + 1; i < Math.min(this.currentPage + 4, this.totalPages); i++) {
      this.loadPage(i);
    }

    this.isAnimating = true;
    const pageGroup = this.pageGroups[this.currentPage];

    if (!pageGroup) {
      this.isAnimating = false;
      return;
    }

    const flippedIndex = this.currentPage;
    const startZ = pageGroup.position.z;
    const endZ = 0.05 + Math.log(flippedIndex + 1) * 0.02;

    pageGroup.renderOrder = this.totalPages + 100;

    const anim = { rotation: 0, z: startZ, curl: 0 };
    gsap.to(anim, {
      rotation: -Math.PI,
      z: endZ,
      curl: 1,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        pageGroup.rotation.y = anim.rotation;
        const progress = Math.abs(anim.rotation) / Math.PI;
        const arc = Math.sin(progress * Math.PI) * 0.2;
        pageGroup.position.z = anim.z + arc;

        const curlIntensity = Math.sin(progress * Math.PI) * Math.sin(progress * Math.PI) * 0.25;
        this.applyCurve(pageGroup, curlIntensity);
        this.requestRender();
      },
      onComplete: () => {
        this.resetCurve(pageGroup);
        pageGroup.position.z = endZ;
        pageGroup.renderOrder = this.totalPages + flippedIndex;
        this.currentPage++;
        this.isAnimating = false;
        this.onPageChange?.(this.currentPage + 1, this.totalPages);
        this.requestRender();
      }
    });
  }

  public prevPage(): void {
    if (this.isAnimating || this.currentPage <= 0) return;

    this.isAnimating = true;
    const pageIndex = this.currentPage - 1;
    const pageGroup = this.pageGroups[pageIndex];

    if (!pageGroup) {
      this.isAnimating = false;
      return;
    }

    const startZ = pageGroup.position.z;
    const endZ = -pageIndex * 0.005;

    pageGroup.renderOrder = this.totalPages + 100;

    const anim = { rotation: -Math.PI, z: startZ, curl: 0 };
    gsap.to(anim, {
      rotation: 0,
      z: endZ,
      curl: 1,
      duration: 0.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        pageGroup.rotation.y = anim.rotation;
        const progress = 1 - Math.abs(anim.rotation) / Math.PI;
        const arc = Math.sin(progress * Math.PI) * 0.2;
        pageGroup.position.z = anim.z + arc;

        const curlIntensity = Math.sin(progress * Math.PI) * Math.sin(progress * Math.PI) * 0.25;
        this.applyCurve(pageGroup, curlIntensity);
        this.requestRender();
      },
      onComplete: () => {
        this.resetCurve(pageGroup);
        pageGroup.position.z = endZ;
        pageGroup.renderOrder = -pageIndex;
        this.currentPage--;
        this.isAnimating = false;
        this.onPageChange?.(this.currentPage + 1, this.totalPages);
        this.requestRender();
      }
    });
  }

  public getCurrentPage(): number {
    return this.currentPage + 1;
  }

  public getTotalPages(): number {
    return this.totalPages;
  }

  public destroy(): void {
    this.isActive = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    window.removeEventListener('resize', this.handleResize);

    this.pageGroups.forEach((pageGroup) => {
      if (pageGroup) {
        pageGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const material = child.material as THREE.MeshStandardMaterial;
            if (material.map) material.map.dispose();
            material.dispose();
          }
        });
        this.bookGroup.remove(pageGroup);
      }
    });

    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
