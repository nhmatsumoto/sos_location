export interface WebGLResourceSet {
  buffers?: Array<WebGLBuffer | null | undefined>;
  textures?: Array<WebGLTexture | null | undefined>;
  programs?: Array<WebGLProgram | null | undefined>;
  framebuffers?: Array<WebGLFramebuffer | null | undefined>;
  renderbuffers?: Array<WebGLRenderbuffer | null | undefined>;
}

export interface DisposableResource {
  dispose(): void;
}

export function disposeWebGLResources(
  gl: WebGL2RenderingContext,
  resources: WebGLResourceSet,
): void {
  resources.buffers?.forEach((buffer) => {
    if (buffer) gl.deleteBuffer(buffer);
  });
  resources.textures?.forEach((texture) => {
    if (texture) gl.deleteTexture(texture);
  });
  resources.programs?.forEach((program) => {
    if (program) gl.deleteProgram(program);
  });
  resources.framebuffers?.forEach((framebuffer) => {
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
  });
  resources.renderbuffers?.forEach((renderbuffer) => {
    if (renderbuffer) gl.deleteRenderbuffer(renderbuffer);
  });
}

export function disposeAll(resources: Array<DisposableResource | null | undefined>): void {
  resources.forEach((resource) => resource?.dispose());
}
