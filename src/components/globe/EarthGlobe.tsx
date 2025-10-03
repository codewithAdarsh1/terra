"use client";

import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as satellite from 'satellite.js';
import type { Location, SatelliteData } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

interface EarthGlobeProps {
  onLocationSelect: (location: Location) => void;
  markerCoordinates: Location | null;
  onSatelliteUpdate: (data: SatelliteData) => void;
}

const TERRA_TLE = [
  "1 25994U 99068A   24190.50000000  .00000580  00000-0  31139-4 0  9996",
  "2 25994  98.2100 310.0000 0001300  95.0000 265.0000 14.57109000    00",
];

const EarthGlobe: React.FC<EarthGlobeProps> = ({ onLocationSelect, markerCoordinates, onSatelliteUpdate }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const markerRef = useRef<THREE.Mesh | null>(null);
  const terraRef = useRef<THREE.Group | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);

  const handleLocationSelectCallback = useCallback((lat: number, lng: number) => {
    onLocationSelect({ lat, lng, name: `Lat: ${lat.toFixed(2)}, Lon: ${lng.toFixed(2)}` });
  }, [onLocationSelect]);

  const updateTerraPosition = useCallback(() => {
    if (!terraRef.current) return;

    const satrec = satellite.twoline2satrec(TERRA_TLE[0], TERRA_TLE[1]);
    const now = new Date();
    const positionAndVelocity = satellite.propagate(satrec, now);
    if (typeof positionAndVelocity.position === 'boolean') return;
    
    const gmst = satellite.gstime(now);
    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
    
    const lat = satellite.degreesLat(positionGd.latitude);
    const lng = satellite.degreesLong(positionGd.longitude);
    const alt = positionGd.height;

    const earthRadius = 1.5;
    const altitudeScale = 0.2;
    const radius = earthRadius + alt * altitudeScale / 6371;

    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    
    terraRef.current.position.set(x, y, z);
    
    const velocity = Math.sqrt(
      Math.pow(positionAndVelocity.velocity.x, 2) +
      Math.pow(positionAndVelocity.velocity.y, 2) +
      Math.pow(positionAndVelocity.velocity.z, 2)
    );

    onSatelliteUpdate({ lat, lng, alt, speed: velocity });

  }, [onSatelliteUpdate]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 2000);
    cameraRef.current = camera;
    camera.position.z = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    
    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Earth sphere
    const earthTextureUrl = PlaceHolderImages.find(img => img.id === 'earth-texture')?.imageUrl || '';
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(earthTextureUrl);
    const sphereGeometry = new THREE.SphereGeometry(1.5, 64, 64);
    const sphereMaterial = new THREE.MeshStandardMaterial({ map: earthTexture, metalness: 0.3, roughness: 0.7 });
    const earth = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(earth);

    // Clouds
    const cloudTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png');
    const cloudGeometry = new THREE.SphereGeometry(1.52, 64, 64);
    const cloudMaterial = new THREE.MeshLambertMaterial({ map: cloudTexture, transparent: true, opacity: 0.3 });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);
    cloudsRef.current = clouds;

    // Marker
    const markerGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.visible = false;
    scene.add(marker);
    markerRef.current = marker;
    
    // Satellite
    const terraGroup = new THREE.Group();
    const satGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.1);
    const satMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 1, roughness: 0.5 });
    const satMesh = new THREE.Mesh(satGeometry, satMaterial);
    terraGroup.add(satMesh);
    scene.add(terraGroup);
    terraRef.current = terraGroup;
    updateTerraPosition();
    const terraInterval = setInterval(updateTerraPosition, 2000);


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
      if (cloudsRef.current) {
        cloudsRef.current.rotation.y += 0.0001;
      }
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
      clearInterval(terraInterval);
      window.removeEventListener('resize', handleResize);
      currentMount?.removeEventListener('click', handleClick);
      currentMount?.removeChild(renderer.domElement);
    };
  }, [handleLocationSelectCallback, updateTerraPosition]);
  
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


  return <div ref={mountRef} className="w-full h-full bg-black" data-ai-hint="earth globe"></div>;
};

export default EarthGlobe;
