/**
 * WebGLRenderer Core Utility
 * Inspired by WebGLFundamentals.org for the SOS LOCATION Guardian Project.
 */

export class WebGLRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) {
      throw new Error('WebGL 2.0 not supported on this platform.');
    }
    this.gl = gl;
  }

  public getContext(): WebGL2RenderingContext {
    return this.gl;
  }

  public createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Could not create shader.');

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error('Shader compilation failed: ' + info);
    }

    return shader;
  }

  public createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

    const program = this.gl.createProgram();
    if (!program) throw new Error('Could not create program.');

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error('Program linking failed: ' + info);
    }

    this.program = program;
    return program;
  }

  public useProgram(program: WebGLProgram) {
    this.gl.useProgram(program);
    this.program = program;
  }

  public setSize(width: number, height: number) {
    this.gl.viewport(0, 0, width, height);
  }

  public setViewport(width: number, height: number) {
    this.setSize(width, height);
  }

  public clear(r = 0, g = 0, b = 0, a = 0) {
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  public createBuffer(data: Float32Array | Uint16Array | Uint32Array, target: number = this.gl.ARRAY_BUFFER, usage: number = this.gl.STATIC_DRAW): WebGLBuffer {
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Could not create buffer.');

    this.gl.bindBuffer(target, buffer);
    this.gl.bufferData(target, data, usage);
    return buffer;
  }

  public setAttribute(name: string, size: number, type: number = this.gl.FLOAT, normalized = false, stride = 0, offset = 0) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getAttribLocation(this.program, name);
    if (location === -1) return; // Silent skip for unused attributes

    this.gl.enableVertexAttribArray(location);
    this.gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
  }

  public getAttribLocation(name: string): number {
    if (!this.program) return -1;
    return this.gl.getAttribLocation(this.program, name);
  }

  public createTexture(image: HTMLImageElement | HTMLCanvasElement): WebGLTexture {
    const texture = this.gl.createTexture();
    if (!texture) throw new Error('Could not create texture.');

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
    
    // Default to point sampling for precise GIS intensity reading
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

    return texture;
  }

  public bindTexture(texture: WebGLTexture, unit: number = 0) {
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
  }

  public setUniformMatrix4(name: string, matrix: Float32Array) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getUniformLocation(this.program, name);
    this.gl.uniformMatrix4fv(location, false, matrix);
  }

  public setUniform1i(name: string, val: number) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getUniformLocation(this.program, name);
    this.gl.uniform1i(location, val);
  }

  public setUniform1f(name: string, val: number) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getUniformLocation(this.program, name);
    this.gl.uniform1f(location, val);
  }

  public setUniform2f(name: string, x: number, y: number) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getUniformLocation(this.program, name);
    this.gl.uniform2f(location, x, y);
  }

  public setUniform3f(name: string, x: number, y: number, z: number) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getUniformLocation(this.program, name);
    this.gl.uniform3f(location, x, y, z);
  }

  public setUniform4f(name: string, x: number, y: number, z: number, w: number) {
    if (!this.program) throw new Error('No program in use.');
    const location = this.gl.getUniformLocation(this.program, name);
    this.gl.uniform4f(location, x, y, z, w);
  }
}
