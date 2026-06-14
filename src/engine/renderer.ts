import * as THREE from 'three';

// Renders the scene into an offscreen buffer, then upscales that buffer to the
// screen. The buffer is resolved at a reduced height (for a soft retro feel)
// but high enough to stay clean and legible, with MSAA smoothing the many
// polygon edges. Nearest-neighbor upscaling keeps the pixels crisp rather than
// blurry.
export class PixelRenderer {
  readonly renderer: THREE.WebGLRenderer;
  aspect = 1;

  private rt: THREE.WebGLRenderTarget;
  private readonly lowHeight: number;
  private readonly postScene: THREE.Scene;
  private readonly postCamera: THREE.OrthographicCamera;
  private readonly quad: THREE.Mesh;
  private readonly quadMat: THREE.MeshBasicMaterial;

  constructor(canvas: HTMLCanvasElement, lowHeight = 540) {
    this.lowHeight = lowHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    // Present the (cheap) upscale pass at native device resolution so the image
    // is sharp on hi-DPI screens; the expensive scene pass stays at lowHeight.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    this.rt = new THREE.WebGLRenderTarget(2, this.lowHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
      samples: 4, // MSAA: anti-aliases the polygon edges so it reads cleanly
    });

    this.quadMat = new THREE.MeshBasicMaterial({ map: this.rt.texture, depthTest: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.quadMat);
    this.postScene = new THREE.Scene();
    this.postScene.add(this.quad);
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.postCamera.position.z = 1;
  }

  setClearColor(color: THREE.ColorRepresentation): void {
    this.renderer.setClearColor(color, 1);
  }

  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.aspect = width / height;
    const lowW = Math.max(2, Math.round(this.lowHeight * this.aspect));
    this.rt.setSize(lowW, this.lowHeight);
    this.quadMat.map = this.rt.texture;
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }
}
