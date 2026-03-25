import { WebGLRenderer } from '../WebGLRenderer';
import { SHADERS } from '../shaders/cityShaders';

/**
 * ResourceFactory manages the creation and caching of WebGL programs, textures, and buffers.
 * This ensures that identical shaders aren't re-compiled and resources are reused.
 */
export class ResourceFactory {
  private renderer: WebGLRenderer;
  private gl: WebGL2RenderingContext;
  private programs: Map<string, WebGLProgram> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.gl = renderer.getContext();
  }

  /**
   * Get or create a shader program from the SHADERS library.
   */
  public getProgram(name: keyof typeof SHADERS): WebGLProgram {
    if (this.programs.has(name)) {
      return this.programs.get(name)!;
    }

    const shaderDef = SHADERS[name];
    const program = this.renderer.createProgram(shaderDef.VS, shaderDef.FS);
    this.programs.set(name, program);
    return program;
  }

  /**
   * Create a texture from a canvas or image with caching.
   */
  public getTextureFromSource(id: string, source: HTMLImageElement | HTMLCanvasElement): WebGLTexture {
    if (this.textures.has(id)) {
      return this.textures.get(id)!;
    }

    const texture = this.renderer.createTexture(source);
    this.textures.set(id, texture);
    return texture;
  }

  /**
   * Manual buffer creation helper.
   */
  public createBuffer(data: Float32Array | Uint16Array | Uint32Array, target?: number, usage?: number): WebGLBuffer {
    return this.renderer.createBuffer(data, target, usage);
  }

  public dispose() {
    this.programs.forEach(p => this.gl.deleteProgram(p));
    this.textures.forEach(t => this.gl.deleteTexture(t));
    this.programs.clear();
    this.textures.clear();
  }
}
