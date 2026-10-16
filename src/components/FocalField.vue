<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
const props = defineProps<{ intensity: number }>();
const canvas = ref<HTMLCanvasElement>();
const ready = ref(false);
let cleanup = () => {};
onMounted(() => {
  const el = canvas.value!;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gl = el.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  const shaders: WebGLShader[] = [];
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    shaders.push(s); return s;
  };
  const vs = shader(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
  const fs = shader(gl.FRAGMENT_SHADER, `precision mediump float;
    varying vec2 uv;uniform vec2 focus;uniform vec2 resolution;uniform float intensity;
    void main(){
      vec2 p=uv; float aspect=resolution.x/resolution.y;
      vec2 q=(p-focus)*vec2(aspect,1.);float d=length(q);
      float density=mix(17.,65.,1.-smoothstep(.07,.43,d));
      vec2 warped=p+vec2(sin(p.y*5.8)*.065,cos(p.x*5.)*.055)*intensity;
      vec2 cell=fract(warped*vec2(density*aspect,density))-.5;
      float dot=1.-smoothstep(.07,.15,length(cell));
      float fade=1.-smoothstep(.25,.85,length((p-.5)*vec2(aspect,.85)));
      vec3 bg=vec3(.036,.065,.115);
      vec3 color=mix(vec3(.23,.40,.61),vec3(.40,.88,.79),1.-smoothstep(.04,.26,d));
      float rings=(1.-smoothstep(.001,.003,abs(d-.14)))+(1.-smoothstep(.001,.003,abs(d-.29)))*.45;
      vec3 c=bg+color*dot*fade*.85+vec3(.28,.62,.70)*rings*.45;
      c+=vec3(.015,.03,.04)*(1.-smoothstep(.0,.4,d));
      gl_FragColor=vec4(c,1.);
    }`);
  if (!vs || !fs) { shaders.forEach(s=>gl.deleteShader(s)); return; }
  const program=gl.createProgram()!; gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));return; }
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const focus=gl.getUniformLocation(program,'focus'), resolution=gl.getUniformLocation(program,'resolution');
  gl.uniform1f(gl.getUniformLocation(program,'intensity'),props.intensity);
  let x=.55,y=.52,visible=true,frame=0;
  const draw=()=>{frame=0;if(!visible||document.hidden)return;gl.uniform2f(focus,x,y);gl.uniform2f(resolution,el.width,el.height);gl.viewport(0,0,el.width,el.height);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);};
  const request=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(()=>{const rect=el.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,innerWidth<700?1:1.5);el.width=Math.round(rect.width*dpr);el.height=Math.round(rect.height*dpr);request();});resize.observe(el);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)request();});observer.observe(el);
  const move=(event:PointerEvent)=>{const r=el.getBoundingClientRect();x=(event.clientX-r.left)/r.width;y=1-(event.clientY-r.top)/r.height;request();};
  const lost=(event:Event)=>{event.preventDefault();ready.value=false;};
  el.addEventListener('pointermove',move);el.addEventListener('webglcontextlost',lost);document.addEventListener('visibilitychange',request);
  ready.value=true;
  cleanup=()=>{cancelAnimationFrame(frame);resize.disconnect();observer.disconnect();el.removeEventListener('pointermove',move);el.removeEventListener('webglcontextlost',lost);document.removeEventListener('visibilitychange',request);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));};
});
onUnmounted(()=>cleanup());
</script>
<template><canvas ref="canvas" class="focal-canvas" :class="{ ready }" aria-hidden="true" /></template>
