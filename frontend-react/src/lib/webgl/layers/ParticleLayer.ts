import { Layer } from '../engine/Layer';
import { WebGLRenderer } from '../WebGLRenderer';
import { PRECIP_VS, PRECIP_FS } from '../shaders/cityShaders';

export class ParticleLayer extends Layer {
  private program: WebGLProgram | null = null;
  private vbo: WebGLBuffer | null = null;
  private count: number = 0;
  private type: 'RAIN' | 'SNOW' | 'NONE' = 'NONE';

  constructor(renderer: WebGLRenderer) {
    super(renderer);
    this.program = renderer.createProgram(PRECIP_VS, PRECIP_FS);
  }

  public update(seeds: Float32Array, type: 'RAIN' | 'SNOW' | 'NONE') {
    this.vbo = this.renderer.createBuffer(seeds);
    this.count = seeds.length / 3;
    this.type = type;
  }

  public render(projectionMatrix: Float32Array, viewMatrix: Float32Array) {
    if (!this.visible || !this.program || !this.vbo || this.type === 'NONE') return;

    const gl = this.renderer.getContext();
    this.renderer.useProgram(this.program);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_projectionMatrix'), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_viewMatrix'), false, viewMatrix);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_time'), performance.now() / 1000);
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_type'), this.type === 'RAIN' ? 0 : 1);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_reveal'), 1.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_windSpeed'), 5.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_windDirection'), 45.0);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_pressure'), 1013.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const locPos = gl.getAttribLocation(this.program, 'a_position');
    if (locPos !== -1) {
      gl.enableVertexAttribArray(locPos);
      gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 0, 0);
    }

    gl.drawArrays(gl.POINTS, 0, this.count);
  }

  public dispose() {
    const gl = this.renderer.getContext();
    if (this.vbo) gl.deleteBuffer(this.vbo);
  }
}
