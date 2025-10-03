"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Location } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface EarthGlobeProps {
  onLocationSelect: (location: Location) => void;
  markerCoordinates: Location | null;
}

const EarthGlobe: React.FC<EarthGlobeProps> = ({ onLocationSelect, markerCoordinates }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const markerRef = useRef<THREE.Mesh | null>(null);

  const handleLocationSelectCallback = useCallback((lat: number, lng: number) => {
    onLocationSelect({ lat, lng, name: `Lat: ${lat.toFixed(2)}, Lon: ${lng.toFixed(2)}` });
  }, [onLocationSelect]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Earth sphere
    const earthTextureUrl = PlaceHolderImages.find(img => img.id === 'earth-texture')?.imageUrl || '';
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(earthTextureUrl);
    const sphereGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({ map: earthTexture, metalness: 0.3, roughness: 0.7 });
    const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(earth);

    // Marker
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.visible = false;
    scene.add(marker);
    markerRef.current = marker;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 2;
    controls.maxDistance = 5;
    controls.enablePan = false;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (mountRef.current) {
        camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    // Handle click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handleClick = (event: MouseEvent) => {
        if (!mountRef.current) return;
        const rect = mountRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObject(earth);

        if (intersects.length > 0) {
            const { point } = intersects[0];
            const phi = Math.acos(point.y / 1.5);
            const theta = Math.atan2(point.x, point.z);
            
            const lat = 90 - (phi * 180) / Math.PI;
            const lng = (theta * 180) / Math.PI;
            
            handleLocationSelectCallback(lat, lng);
        }
    };
    mountRef.current.addEventListener('click', handleClick);

    // Cleanup
    const currentMount = mountRef.current;
    return () => {
      window.removeEventListener('resize', handleResize);
      currentMount?.removeEventListener('click', handleClick);
      currentMount?.removeChild(renderer.domElement);
    };
  }, [handleLocationSelectCallback]);
  
  useEffect(() => {
    if (markerCoordinates && markerRef.current && sceneRef.current) {
      const { lat, lng } = markerCoordinates;
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);

      const x = -(1.52 * Math.sin(phi) * Math.cos(theta));
      const y = 1.52 * Math.cos(phi);
      const z = 1.52 * Math.sin(phi) * Math.sin(theta);

      markerRef.current.position.set(x, y, z);
      markerRef.current.visible = true;
    } else if (markerRef.current) {
      markerRef.current.visible = false;
    }
  }, [markerCoordinates]);


  return <div ref={mountRef} className="w-full h-full" data-ai-hint="earth globe"></div>;
};

export default EarthGlobe;
