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
  const rendererRef = useRef(null)

  //track current center of the view as lat/lon
  const [viewCenter, setViewCenter] = useState({ lat: 39.5, lon: -98.35 })

  //Pull live flight data into zustard store
  //default view is centered over the continental US
  useFlights(viewCenter.lat, viewCenter.lon, 2500)

  // subscribe to the flights array from Zustand
  const flights = useGlobeStore((state) => state.flights)
  const selectedFlight = useGlobeStore((state) => state.selectedFlight)
  const isFlightSelected = useGlobeStore((state) => state.isFlightSelected)
  const setSelectedFlight = useGlobeStore((state) => state.setSelectedFlight)

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
    rendererRef.current = renderer

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
    controls.minDistance = 10 //prevent zooming inside the globe
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

  // Update flight points whenever flights or selection state changes
useEffect(() => {
  if (!globeInstanceRef.current) return

  const validFlights = flights.filter((f) => f.lat != null && f.lon != null)

  // If a flight is selected, only show that one — hide all others
  const displayFlights = isFlightSelected && selectedFlight
    ? validFlights.filter((f) => f.hex === selectedFlight.hex)
    : validFlights

  globeInstanceRef.current
    .pointsData(displayFlights)
    .pointLat((f) => f.lat)
    .pointLng((f) => f.lon)
    .pointAltitude(0)
    .pointRadius(isFlightSelected ? 0.4 : 0.15)
    .pointColor(() => '#00ff88')
}, [flights, selectedFlight, isFlightSelected])

// Handle click events on the globe canvas
// Raycasts from the mouse position to find which aircraft was clicked
useEffect(() => {
  if (!mountRef.current || !globeInstanceRef.current) return

  const handleClick = (event) => {
    const camera = cameraRef.current
    const renderer = rendererRef.current
    if (!camera || !renderer) return

    // Convert mouse position to normalized device coordinates (-1 to +1)
    const rect = renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    raycaster.params.Points.threshold = 1.5

    // Check intersections against the globe's point objects
    const intersects = raycaster.intersectObjects(
      globeInstanceRef.current.children,
      true
    )

    if (intersects.length > 0) {
      // Find the closest valid flight to the click point
      const point = intersects[0].point
      const GLOBE_RADIUS = 100
      const clickLat = Math.asin(point.y / GLOBE_RADIUS) * (180 / Math.PI)
      const clickLon = Math.atan2(point.x, point.z) * (180 / Math.PI)

      // Find the nearest flight to where the user clicked
      const nearest = flights
        .filter((f) => f.lat != null && f.lon != null)
        .reduce((closest, flight) => {
          const dist = Math.hypot(flight.lat - clickLat, flight.lon - clickLon)
          return dist < closest.dist ? { flight, dist } : closest
        }, { flight: null, dist: Infinity })

      if (nearest.flight && nearest.dist < 5) {
        setSelectedFlight(nearest.flight)
      }
    }
  }

  const canvas = rendererRef.current?.domElement
  canvas?.addEventListener('click', handleClick)

  return () => {
    canvas?.removeEventListener('click', handleClick)
  }
}, [flights, setSelectedFlight])
  return (
    <div
      ref={mountRef}
      className="w-screen h-screen bg-black"
    />
  )
}

export default GlobeComponent