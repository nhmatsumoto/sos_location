import { Layer } from '../engine/Layer';
import { WebGLRenderer } from '../WebGLRenderer';
import { CITY_TERRAIN_VS, CITY_TERRAIN_FS } from '../shaders/cityShaders';

export class TerrainLayer extends Layer {
  private program: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private ibo: WebGLBuffer | null = null;
  private count: number = 0;
  private satelliteTexture: WebGLTexture | null = null;
  private satBlend: number = 0.0;

  constructor(renderer: WebGLRenderer) {
    super(renderer);
    this.program = renderer.createProgram(CITY_TERRAIN_VS, CITY_TERRAIN_FS);
  }

  public updateGeometry(vertices: Float32Array, indices: Uint32Array) {
    const gl = this.renderer.getContext();
    this.vbo = this.renderer.createBuffer(vertices);
    this.ibo = this.renderer.createBuffer(indices, gl.ELEMENT_ARRAY_BUFFER);
    this.count = indices.length;
  }

  public setSatellite(texture: WebGLTexture, blend: number = 1.0) {
    this.satelliteTexture = texture;
    this.satBlend = blend;
  }

  public render(projectionMatrix: Float32Array, viewMatrix: Float32Array) {
    if (!this.visible || !this.program || !this.vbo || !this.ibo) return;

    const gl = this.renderer.getContext();
    this.renderer.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const locPos = gl.getAttribLocation(this.program, 'a_position');
    const locNormal = gl.getAttribLocation(this.program, 'a_normal');
    const locUV = gl.getAttribLocation(this.program, 'a_uv');

    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 32, 0); 
    gl.enableVertexAttribArray(locNormal);
    gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(locUV);
    gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 32, 24);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_projectionMatrix'), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_viewMatrix'), false, viewMatrix);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_satBlend'), this.satBlend);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_reveal'), 1.0);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_modelMatrix'), false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]));
    
    if (this.satelliteTexture) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.satelliteTexture);
      gl.uniform1i(gl.getUniformLocation(this.program, 'u_satTex'), 0);
      gl.uniform1i(gl.getUniformLocation(this.program, 'u_satMode'), 1);
    } else {
      gl.uniform1i(gl.getUniformLocation(this.program, 'u_satMode'), 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_INT, 0);
  }

  public dispose() {
    const gl = this.renderer.getContext();
    if (this.vbo) gl.deleteBuffer(this.vbo);
    if (this.ibo) gl.deleteBuffer(this.ibo);
  }
}
