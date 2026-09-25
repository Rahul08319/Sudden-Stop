import { useEffect, useRef } from "react";

interface WebGLBackdropProps {
  energy: number;
  paused: boolean;
  reducedMotion: boolean;
}

const vertexShader = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_energy;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 aspectUv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    float time = u_time * 0.13;

    vec3 color = vec3(0.018, 0.028, 0.07);
    vec2 cyanCenter = vec2(-0.34 + sin(time) * 0.04, 0.18 + cos(time * 0.7) * 0.03);
    vec2 violetCenter = vec2(0.32 + cos(time * 0.8) * 0.06, -0.22 + sin(time * 0.5) * 0.04);
    float cyan = 0.02 / max(length(aspectUv - cyanCenter), 0.025);
    float violet = 0.017 / max(length(aspectUv - violetCenter), 0.03);
    color += vec3(0.0, 0.42, 0.58) * cyan * (0.5 + u_energy * 0.5);
    color += vec3(0.22, 0.06, 0.55) * violet;

    float rings = sin(length(aspectUv + vec2(0.05, -0.06)) * 38.0 - time * 6.0);
    float ringMask = smoothstep(0.88, 0.99, rings) * smoothstep(0.82, 0.2, length(aspectUv));
    color += vec3(0.02, 0.32, 0.38) * ringMask * (0.1 + u_energy * 0.16);

    vec2 cell = floor(uv * vec2(65.0, 115.0));
    float star = step(0.994, hash(cell));
    float twinkle = 0.55 + 0.45 * sin(time * 9.0 + hash(cell) * 20.0);
    color += vec3(0.15, 0.72, 0.92) * star * twinkle * 0.42;

    float vignette = smoothstep(1.1, 0.2, length(aspectUv));
    color *= 0.55 + vignette * 0.55;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export default function WebGLBackdrop({ energy, paused, reducedMotion }: WebGLBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) return;

    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    const sceneEnergy = gl.getUniformLocation(program, "u_energy");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    let frame = 0;
    let start = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(window.innerWidth * dpr));
      const height = Math.max(1, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };
    const render = (now: number) => {
      resize();
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reducedMotion ? 0 : (now - start) / 1000);
      gl.uniform1f(sceneEnergy, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!paused && !reducedMotion) frame = requestAnimationFrame(render);
    };

    render(start);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, [energy, paused, reducedMotion]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
