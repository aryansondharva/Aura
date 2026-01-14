import React, { useEffect, useRef } from "react";
import * as THREE from "three";

const RecalloVisual3D = () => {
  const containerRef = useRef();
  const meshRef = useRef();
  const uniformsRef = useRef({ u_time: { value: 0 } });

  useEffect(() => {
    const container = containerRef.current;
    const width = 120;
    const height = 120;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.backgroundColor = "transparent";
    renderer.domElement.style.display = "block";

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    const uniforms = uniformsRef.current;

    const material = new THREE.ShaderMaterial({
      wireframe: true,
      transparent: true,
      depthWrite: false,
      uniforms,
      vertexShader,
      fragmentShader,
    });

    // Less dense wireframe with subdivision 1
    const geometry = new THREE.IcosahedronGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    meshRef.current = mesh;
    scene.add(mesh);

    // Rotation targets controlled by mouse
    let targetRotationX = 0;
    let targetRotationY = 0;

    function onMouseMove(event) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Normalize cursor position to range [-1, 1]
      const x = (event.clientX / vw) * 2 - 1;
      const y = -((event.clientY / vh) * 2 - 1);

      // Map normalized coords to rotation angles
      targetRotationY = x * Math.PI * 0.3;
      targetRotationX = y * Math.PI * 0.3;
    }

    window.addEventListener("mousemove", onMouseMove);

    function animate() {
      uniforms.u_time.value += 0.01;

      if (meshRef.current) {
        // Smooth mouse-controlled rotation
        meshRef.current.rotation.x +=
          (targetRotationX - meshRef.current.rotation.x) * 0.05;
        meshRef.current.rotation.y +=
          (targetRotationY - meshRef.current.rotation.y) * 0.05;

        // Very subtle jitter (small amplitude and slower oscillation)
        const jitterAmount = 0.005; // tiny jitter
        meshRef.current.rotation.x +=
          Math.sin(uniforms.u_time.value * 8) * jitterAmount;
        meshRef.current.rotation.y +=
          Math.cos(uniforms.u_time.value * 10) * jitterAmount;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ width: "120px", height: "120px", background: "none" }}
    />
  );
};

const vertexShader = `
  uniform float u_time;

  void main() {
    // Wave distortion on vertices
    float wave = sin(position.x * 5.0 + u_time * 5.0) * 0.15;
    vec3 displacedPosition = position + normal * wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float u_time;

  const vec3 white = vec3(1.0, 1.0, 1.0);
  const vec3 yellow = vec3(0.929, 0.706, 0.216);

  void main() {
    // Less dense horizontal flickering lines
    float line = fract(gl_FragCoord.y / 10.0 + u_time * 30.0);
    vec3 color = mix(white, yellow, step(0.5, line));
    gl_FragColor = vec4(color, 0.5);
  }
`;

export default RecalloVisual3D;
