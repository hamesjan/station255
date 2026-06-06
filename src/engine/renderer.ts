import * as THREE from 'three';

// Renders the scene into a small offscreen buffer, then upscales that buffer to
// the screen with nearest-neighbor sampling. That two-step is the core of the
// Doom look: real 3D, but resolved at ~224p with hard, unfiltered pixels.
export class PixelRenderer {
  readonly renderer: THREE.WebGLRenderer;
  aspect = 1;

  private rt: THREE.WebGLRenderTarget;
  private readonly lowHeight: number;
  private readonly postScene: THREE.Scene;
  private readonly postCamera: THREE.OrthographicCamera;
  private readonly quad: THREE.Mesh;
  private readonly quadMat: THREE.MeshBasicMaterial;

  constructor(canvas: HTMLCanvasElement, lowHeight = 224) {
    this.lowHeight = lowHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(1);

    this.rt = new THREE.WebGLRenderTarget(2, this.lowHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      stencilBuffer: false,
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
