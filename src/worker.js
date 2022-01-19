const canvas = new OffscreenCanvas(256, 256);
const gl = canvas.getContext('webgl2');
gl.viewport(0, 0, canvas.width, canvas.height);

const vertexShaderSource =
`#version 300 es

precision mediump float;

in vec4 i_Position;

void main() {
  gl_Position = i_Position;
}`;

const fragmentShaderSource =
`#version 300 es

precision mediump float;

uniform vec2 u_Viewport;
uniform vec2 u_LeftBot;
uniform vec2 u_RightTop;
uniform uint u_Iterations;

out vec4 o_FragColor;

void main() {
  vec2 c = mix(u_LeftBot.xy, u_RightTop.xy, gl_FragCoord.xy / u_Viewport.xy);
  vec2 z = vec2(0.0);
  uint iteration;
  for (iteration = 0u; iteration < u_Iterations; iteration++) {
    z = mat2(z, -z.y, z.x) * z + c;
    if (length(z) > 2.0) {
      break;
    }
  }
  float n = float(iteration);
  float a = 0.1;
  o_FragColor = vec4(0.5 * sin(a * n) + 0.5, 0.5 * sin(a * n + 2.094) + 0.5,  0.5 * sin(a * n + 4.188) + 0.5, 1.0);
}`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw gl.getShaderInfoLog(shader);
  return shader;
}

const program = gl.createProgram();
const vertexShader = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);

gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS))
  throw gl.getProgramInfoLog(program);

gl.detachShader(program, vertexShader);
gl.detachShader(program, fragmentShader);
gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);

gl.useProgram(program);

const iPosition = gl.getAttribLocation(program, 'i_Position');
const uViewport = gl.getUniformLocation(program, 'u_Viewport');
const uLeftBot = gl.getUniformLocation(program, 'u_LeftBot');
const uRightTop = gl.getUniformLocation(program, 'u_RightTop');
const uIterations = gl.getUniformLocation(program, 'u_Iterations');

const vertices = Float32Array.of(-1.0, -1.0, 3.0, -1.0, -1.0, 3.0);
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(iPosition, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(iPosition);

self.onmessage = (event) => {
  const [left, bot, right, top] = event.data;
  const [port] = event.ports;
  gl.uniform2f(uViewport, canvas.width, canvas.height);
  gl.uniform2f(uLeftBot, left, bot);
  gl.uniform2f(uRightTop, right, top);
  gl.uniform1ui(uIterations, 256);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  const bitmap = canvas.transferToImageBitmap();
  port.postMessage(bitmap, [bitmap]);
}
