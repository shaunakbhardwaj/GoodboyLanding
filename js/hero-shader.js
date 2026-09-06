(() => {
  const canvas = document.querySelector('.hero-shader');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) { canvas.hidden = true; return; }
  const vertex = 'attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.,1.);}';
  // Layered metallic ribbons: bright edges surround a calm, dark logo area.
  const fragment = `precision mediump float;
    uniform vec2 u_resolution;
    uniform vec2 u_pointer;
    uniform float u_time;
    void main(){
      vec2 uv=gl_FragCoord.xy/u_resolution;
      vec2 p=(uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
      p += u_pointer*.025;
      float t=u_time*.16;
      vec3 col=vec3(.105,.100,.088);
      for(int i=0;i<7;i++){
        float f=float(i);
        float curve=sin(p.x*2.0+t+f*.31)*.13 + sin(p.x*3.4-t*.7+f*.17)*.045;
        float center=(f-3.)*.105+curve;
        float d=p.y-center;
        float ribbon=exp(-abs(d)*38.);
        float edge=exp(-abs(d-.018)*210.);
        float light=.45+.55*sin(p.x*2.3-t+f*.8);
        col += vec3(.25,.22,.16)*ribbon*light;
        col += vec3(.52,.46,.34)*edge*(.3+.7*light);
      }
      float calm=1.-.65*exp(-dot(p*vec2(1.7,3.),p*vec2(1.7,3.)));
      col=mix(vec3(.085,.081,.072),col,calm);
      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      col+=(grain-.5)*.016;
      gl_FragColor=vec4(col,1.);
    }`;
  const compile = (type, text) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, text); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
  if (!vs || !fs) { canvas.hidden = true; return; }
  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { canvas.hidden = true; return; }
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const resolution = gl.getUniformLocation(program,'u_resolution');
  const time = gl.getUniformLocation(program,'u_time');
  const pointer = gl.getUniformLocation(program,'u_pointer');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, frame = 0, last = 0, elapsed = 0, px = 0, py = 0;
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(rect.width*dpr)); canvas.height = Math.max(1, Math.round(rect.height*dpr));
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.uniform2f(resolution,canvas.width,canvas.height);
    render();
  };
  const render = () => { gl.uniform1f(time,elapsed); gl.uniform2f(pointer,px,py); gl.drawArrays(gl.TRIANGLES,0,6); };
  const loop = (now) => {
    frame = 0;
    if (!visible || document.hidden || reduced.matches) { last=0; return; }
    if (now-last >= 1000/30) { elapsed += last ? Math.min((now-last)/1000,.1) : 0; last=now; render(); }
    frame=requestAnimationFrame(loop);
  };
  const resume = () => { if (!frame && visible && !document.hidden && !reduced.matches) frame=requestAnimationFrame(loop); };
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => { visible=entry.isIntersecting; resume(); }).observe(canvas);
  document.addEventListener('visibilitychange',resume);
  reduced.addEventListener('change',() => { render(); resume(); });
  canvas.parentElement.addEventListener('pointermove',event => { const rect=canvas.getBoundingClientRect(); px=(event.clientX-rect.left)/rect.width-.5; py=.5-(event.clientY-rect.top)/rect.height; });
  canvas.addEventListener('webglcontextlost',event => { event.preventDefault(); cancelAnimationFrame(frame); canvas.style.visibility='hidden'; });
  canvas.addEventListener('webglcontextrestored',() => { /* The static gradient remains a readable fallback. */ });
  resize(); resume();
})();
