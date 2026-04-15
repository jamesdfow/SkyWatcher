// Globe.jsx
// Core 3D globe component built directly on three-globe and Three.js
// This approach gives us more control and avoids Globe.gl's React compatibility issues

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import ThreeGlobe from 'three-globe'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useFlights from '../hooks/useFlights'
import useGlobeStore from '../store/globeStore'

function GlobeComponent() {
  const mountRef = useRef(null)
  const globeInstanceRef = useRef(null)
  const cameraRef = useRef(null)

  //track current center of the view as lat/lon
  const [viewCenter, setViewCenter] = useState({ lat: 39.5, lon: -98.35 })

  //Pull live flight data into zustard store
  //default view is centered over the continental US
  useFlights(viewCenter.lat, viewCenter.lon, 2500)

  // subscribe to the flights array from Zustand
  const flights = useGlobeStore((state) => state.flights)

  //initialize the globe once on mount
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

    //store glove instance so we can update data layers separately
    globeInstanceRef.current = globe

    cameraRef.current = camera

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
    
    //when the user stops draggins, calculate the new center lat/lon
    //and update the view center to trigger a fresh data fetch
controls.addEventListener('end', () => {
  // Cast a ray from the camera through the center of the screen
  // and find where it intersects the globe surface
  const raycaster = new THREE.Raycaster()
  const center = new THREE.Vector2(0, 0)
  raycaster.setFromCamera(center, camera)

  const globeMesh = globe.children?.[0]
  if (!globeMesh) return

  const intersects = raycaster.intersectObjects(globe.children, true)

  if (intersects.length > 0) {
    const point = intersects[0].point

    // Convert the 3D intersection point to lat/lon
    const GLOBE_RADIUS = 100
    const lat = Math.asin(point.y / GLOBE_RADIUS) * (180 / Math.PI)
    const lon = Math.atan2(point.x, point.z) * (180 / Math.PI)

    setViewCenter({ lat, lon })
  }
})


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

  //Update flight points on the globe whenever the flights array changes
  useEffect(() => {
    if (!globeInstanceRef.current || flights.length === 0) return

    // filter out aircraft with no position data
    const validFlights = flights.filter(
      (f) => f.lat != null && f.lon != null
    )

    //render aircraft as points on the globe surface
    globeInstanceRef.current
      .pointsData(validFlights)
      .pointLat((f) => f.lat)
      .pointLng((f) => f.lon)
      .pointAltitude(0)
      .pointRadius(0.11)
      .pointColor(() => '#c1f441')
  }, [flights])

  return (
    <div
      ref={mountRef}
      className="w-screen h-screen bg-black"
    />
  )
}

export default GlobeComponent