import { Layer } from '../engine/Layer';
import { WebGLRenderer } from '../WebGLRenderer';
import { CITY_VS, CITY_FS } from '../shaders/cityShaders';

export class UrbanLayer extends Layer {
  private program: WebGLProgram | null = null;
  private buildingVBO: WebGLBuffer | null = null;
  private roadVBO: WebGLBuffer | null = null;
  private buildingCount: number = 0;
  private roadCount: number = 0;
  private vibration: number = 0.0;
  private reveal: number = 1.0;

  constructor(renderer: WebGLRenderer) {
    super(renderer);
    this.program = renderer.createProgram(CITY_VS, CITY_FS);
  }

  public updateBuildings(vertices: Float32Array) {
    this.buildingVBO = this.renderer.createBuffer(vertices);
    this.buildingCount = vertices.length / 12;
  }

  public updateRoads(vertices: Float32Array) {
    this.roadVBO = this.renderer.createBuffer(vertices);
    this.roadCount = vertices.length / 12;
  }

  public setDisasterState(vibration: number, reveal: number) {
    this.vibration = vibration;
    this.reveal = reveal;
  }

  public render(projectionMatrix: Float32Array, viewMatrix: Float32Array) {
    if (!this.visible || !this.program || (!this.buildingVBO && !this.roadVBO)) return;

    const gl = this.renderer.getContext();
    this.renderer.useProgram(this.program);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_projectionMatrix'), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_viewMatrix'), false, viewMatrix);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_vibration'), this.vibration);
    gl.uniform1f(gl.getUniformLocation(this.program, 'u_reveal'), this.reveal);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_lightDir'), [0.5, 0.8, 0.3]);
    gl.uniform3fv(gl.getUniformLocation(this.program, 'u_lightColor'), [1.0, 1.0, 1.0]);

    if (this.buildingVBO) this.drawBuffer(this.buildingVBO, this.buildingCount);
    if (this.roadVBO) this.drawBuffer(this.roadVBO, this.roadCount);
  }

  private drawBuffer(buffer: WebGLBuffer, count: number) {
    const gl = this.renderer.getContext();
    const program = this.program!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    const locPos = gl.getAttribLocation(program, 'a_position');
    const locNormal = gl.getAttribLocation(program, 'a_normal');
    const locColor = gl.getAttribLocation(program, 'a_color');
    const locUV = gl.getAttribLocation(program, 'a_uv');
    const locReveal = gl.getAttribLocation(program, 'a_reveal');

    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, 48, 0);
    gl.enableVertexAttribArray(locNormal);
    gl.vertexAttribPointer(locNormal, 3, gl.FLOAT, false, 48, 12);
    gl.enableVertexAttribArray(locColor);
    gl.vertexAttribPointer(locColor, 1, gl.FLOAT, false, 48, 24);
    gl.enableVertexAttribArray(locUV);
    gl.vertexAttribPointer(locUV, 2, gl.FLOAT, false, 48, 28);
    if (locReveal !== -1) {
      gl.enableVertexAttribArray(locReveal);
      gl.vertexAttribPointer(locReveal, 1, gl.FLOAT, false, 48, 36);
    }

    gl.drawArrays(gl.TRIANGLES, 0, count);
  }

  public dispose() {
    const gl = this.renderer.getContext();
    if (this.buildingVBO) gl.deleteBuffer(this.buildingVBO);
    if (this.roadVBO) gl.deleteBuffer(this.roadVBO);
  }
}
