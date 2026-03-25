import { Layer } from '../engine/Layer';
import { WebGLRenderer } from '../WebGLRenderer';
import { WATER_VS, WATER_FS } from '../shaders/cityShaders';

export class WaterLayer extends Layer {
  private program: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private count: number = 0;
  private waterLevel: number = 0.0;
  private waveProgress: number = 0.0;

  constructor(renderer: WebGLRenderer) {
    super(renderer);
    this.program = renderer.createProgram(WATER_VS, WATER_FS);
  }

  public update(vertices: Float32Array) {
    this.vbo = this.renderer.createBuffer(vertices);
    this.count = vertices.length / 8; // pos(3) + normal(3) + uv(2)
  }

  public setWaterLevel(level: number) {
    this.waterLevel = level;
  }

  public setTsunamiState(waterLevel: number, waveProgress: number) {
    this.waterLevel = waterLevel;
    this.waveProgress = waveProgress;
  }

  public render(projectionMatrix: Float32Array, viewMatrix: Float32Array) {
    if (!this.visible || !this.program || !this.vbo) return;

    const gl = this.renderer.getContext();
    this.renderer.useProgram(this.program);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_projectionMatrix'), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_viewMatrix'), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_modelMatrix'), false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]));
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), performance.now() / 1000);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_waterLevel'), this.waterLevel);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_reveal'), 1.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_waveHeight'), 1.5 + this.waveProgress * 5.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_waveSpeed'), 1.2 + this.waveProgress * 2.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_waveFrequency'), 0.05);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_waveDirectionX'), 1.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_waveDirectionZ'), 0.5);

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

    gl.drawArrays(gl.TRIANGLES, 0, this.count);
  }

  public dispose() {
    const gl = this.renderer.getContext();
    if (this.vbo) gl.deleteBuffer(this.vbo);
  }
}
