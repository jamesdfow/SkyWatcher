// Globe.jsx
// Core 3D globe component built directly on three-globe and Three.js
// This approach gives us more control and avoids Globe.gl's React compatibility issues

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import ThreeGlobe from 'three-globe'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function GlobeComponent() {
  const mountRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current) return

    // Capture the ref value at effect run time to avoid stale ref in cleanup
    const container = mountRef.current

    // Scene setup
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Initialize the globe
    const globe = new ThreeGlobe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')

    scene.add(globe)

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0)
    scene.add(ambientLight)
    
    //directional light - simulates sunlight from one direction
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
    directionalLight.position.set(5, 3, 5)
    scene.add(directionalLight)

    //secondary fill light - softens the dark side of the glass
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5)
    fillLight.position.set(-5, -3, 5)
    scene.add(fillLight)

    //pull the camera back far enough to see the full globe
    camera.position.z = 250

    //OrbitControls - enables far enough to see the full globe
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true //Smoooth inertia on drag
    controls.dampingFactor = 0.05 
    controls.minDistance = 150 //prevent zooming inside the globe
    controls.maxDistance = 500 //prevents zooming too far out



    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update() //required for damping to work
      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup — use captured container variable, not mountRef.current
    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className="w-screen h-screen bg-black"
    />
  )
}

export default GlobeComponent