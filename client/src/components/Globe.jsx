// Globe.jsx
// Core 3D globe component built directly on three-globe and Three.js
// This approach gives us more control and avoids Globe.gl's React compatibility issues

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import ThreeGlobe from 'three-globe'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import useFlights from '../hooks/useFlights'
import useGlobeStore from '../store/globeStore'
import majorAirports from '../data/majorAirports'

function GlobeComponent() {
  const mountRef = useRef(null)
  const globeInstanceRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const zoomLevelRef = useRef(250)
  const controlsRef = useRef(null)

  // Track current center of the view as lat/lon
  const [viewCenter, setViewCenter] = useState({ lat: 39.5, lon: -98.35 })

  // Pull live flight data into zustand store
  // Default view is centered over the continental US
  useFlights(viewCenter.lat, viewCenter.lon, 2500)

  // Subscribe to the flights array from Zustand
  const flights = useGlobeStore((state) => state.flights)
  const selectedFlight = useGlobeStore((state) => state.selectedFlight)
  const isFlightSelected = useGlobeStore((state) => state.isFlightSelected)
  const setSelectedFlight = useGlobeStore((state) => state.setSelectedFlight)
  const clearSelectedFlight = useGlobeStore((state) => state.clearSelectedFlight)
  const routeData = useGlobeStore((state) => state.routeData)

  // Initialize the globe once on mount
  useEffect(() => {
    if (!mountRef.current) return

    const container = mountRef.current

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
    const renderer = new THREE.WebGLRenderer({ antialias: true })

    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    const globe = new ThreeGlobe()
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')

    scene.add(globe)

    // Store globe instance so we can update data layers separately
    globeInstanceRef.current = globe
    cameraRef.current = camera
    rendererRef.current = renderer

    // Ambient lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0)
    scene.add(ambientLight)

    // Directional light — simulates sunlight from one direction
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0)
    directionalLight.position.set(5, 3, 5)
    scene.add(directionalLight)

    // Secondary fill light — softens the dark side of the globe
    const fillLight = new THREE.DirectionalLight(0x4488ff, 0.5)
    fillLight.position.set(-5, -3, 5)
    scene.add(fillLight)

    // Pull the camera back far enough to see the full globe
    camera.position.z = 250

    // OrbitControls — enables mouse drag to rotate and scroll to zoom
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 1.5
    controls.minDistance = 100
    controls.maxDistance = 500

    controlsRef.current = controls

    controls.addEventListener('change', () => {
      zoomLevelRef.current = camera.position.length()
    })

    // When the user stops dragging, calculate the new center lat/lon
    // and update the view center to trigger a fresh data fetch
    controls.addEventListener('end', () => {
      const raycaster = new THREE.Raycaster()
      const center = new THREE.Vector2(0, 0)
      raycaster.setFromCamera(center, camera)

      const intersects = raycaster.intersectObjects(globe.children, true)

      if (intersects.length > 0) {
        const point = intersects[0].point
        const GLOBE_RADIUS = 100
        const lat = Math.asin(point.y / GLOBE_RADIUS) * (180 / Math.PI)
        const lon = Math.atan2(point.x, point.z) * (180 / Math.PI)
        setViewCenter({ lat, lon })
      }
    })

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      controls.update()
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

    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

  // Update flight points whenever flights or selection state changes
  useEffect(() => {
    if (!globeInstanceRef.current) return

  const commercialCategories = ['A2', 'A3', 'A4', 'A5']
  const validFlights = flights.filter((f) => 
    f.lat != null && f.lon != null && commercialCategories.includes(f.category)
  )

    // If a flight is selected, only show that one — hide all others
    const displayFlights = isFlightSelected && selectedFlight
      ? validFlights.filter((f) => f.hex === selectedFlight.hex)
      : validFlights

    const getPointRadius = () => {
      const zoom = zoomLevelRef.current
      if (isFlightSelected) return 0.4
      if (zoom < 130) return 0.05
      if (zoom < 180) return 0.08
      if (zoom < 250) return 0.12
      return 0.15
    }    


    globeInstanceRef.current
      .pointsData(displayFlights)
      .pointLat((f) => f.lat)
      .pointLng((f) => f.lon)
      .pointAltitude(0)
      .pointRadius(getPointRadius())
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

      // If a flight is already selected, any click deselects and restores all traffic
      if (isFlightSelected) {
          return
      }

      // Convert mouse position to normalized device coordinates (-1 to +1)
      const rect = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)
      raycaster.params.Points.threshold = 1.5

      const intersects = raycaster.intersectObjects(
        globeInstanceRef.current.children,
        true
      )

      if (intersects.length > 0) {
        const point = intersects[0].point
        const GLOBE_RADIUS = 100
        const clickLat = Math.asin(point.y / GLOBE_RADIUS) * (180 / Math.PI)
        const clickLon = Math.atan2(point.x, point.z) * (180 / Math.PI)

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
  }, [flights, isFlightSelected, setSelectedFlight, clearSelectedFlight])

  useEffect(() => {
    if (!globeInstanceRef.current) return

    if (routeData?.origin && routeData?.destination) {
      const arcData = [{
        startLat: routeData.origin.latitude,
        startLng: routeData.origin.longitude,
        endLat: routeData.destination.latitude,
        endLng: routeData.destination.longitude,
      }]

      globeInstanceRef.current
        .arcsData(arcData)
        .arcColor(() => '#ff4444')
        .arcDashLength(0.5)
        .arcDashGap(0.2)
        .arcDashAnimateTime(2000)
        .arcStroke(0.15)
        .arcAltitude(0.02)
    } else {
      globeInstanceRef.current.arcsData([])
    }
  }, [routeData])

  // Auto-rotate globe to frame the route when a flight is selected
useEffect(() => {
  console.log('Camera effect - routeData:', routeData)

  if (!routeData?.origin || !routeData?.destination) return
  if (!globeInstanceRef.current || !cameraRef.current || !controlsRef.current) return

  const midLat = (routeData.origin.latitude + routeData.destination.latitude) / 2
  const midLng = (routeData.origin.longitude + routeData.destination.longitude) / 2

  const dist = Math.hypot(
  routeData.destination.latitude - routeData.origin.latitude,
  routeData.destination.longitude - routeData.origin.longitude
  )
  const cameraDistance = Math.min(Math.max(dist * 2, 150), 300)

  const { x, y, z } = globeInstanceRef.current.getCoords(midLat, midLng, 0)
  const direction = new THREE.Vector3(x, y, z).normalize()
  const cameraTarget = direction.multiplyScalar(cameraDistance)

  const camera = cameraRef.current
  const controls = controlsRef.current

  camera.position.set(cameraTarget.x, cameraTarget.y, cameraTarget.z)
  controls.target.set(0, 0, 0)
  controls.update()
  }, [routeData])

  // Display major airport labels on the globe
useEffect(() => {
  if (!globeInstanceRef.current) return

  globeInstanceRef.current
    .labelsData(majorAirports)
    .labelLat((d) => d.lat)
    .labelLng((d) => d.lng)
    .labelText((d) => `${d.iata}`)
    .labelSize(0.3)
    .labelDotRadius(0.1)
    .labelColor(() => 'rgba(255, 255, 255, 0.7)')
    .labelResolution(2)
}, [])

  return (
    <div
      ref={mountRef}
      className="w-screen h-screen bg-black"
    />
  )
}

export default GlobeComponent