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
  const hoveredFlightRef = useRef(null)
  const tooltipRef = useRef(null)

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
    controls.zoomSpeed = 0.5
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY }

    controlsRef.current = controls

    controls.addEventListener('change', () => {
      zoomLevelRef.current = camera.position.length()

      const zoom = camera.position.length()
      controls.rotateSpeed = Math.max(zoom / 500, 0.1)
      controls.zoomSpeed = Math.max(zoom / 800, 0.3)
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

    controls.addEventListener('change', () => {
      zoomLevelRef.current = camera.position.length()

      //slow down rotation when zoomed in
      const zoom = camera.position.length()
      controls.rotateSpeed = Math.max(zoom / 500, 0.1)
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
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      container.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [])

// Update flight objects whenever flights or selection state changes
useEffect(() => {
  if (!globeInstanceRef.current) return
  globeInstanceRef.current.pointsData([])

  const commercialCategories = ['A2', 'A3', 'A4', 'A5']
  const validFlights = flights.filter((f) => 
    f.lat != null && f.lon != null && commercialCategories.includes(f.category)
  )

let displayFlights

if (isFlightSelected && selectedFlight) {
  displayFlights = validFlights.filter((f) => f.hex === selectedFlight.hex)
} else {
  const zoom = zoomLevelRef.current

  if (zoom < 200) {
    displayFlights = validFlights
  } else {
    let cellSize
    if (zoom > 400) cellSize = 10
    else if (zoom > 300) cellSize = 5
    else cellSize = 2

    const grid = {}
    for (const flight of validFlights) {
      const cellKey = `${Math.floor(flight.lat / cellSize)},${Math.floor(flight.lon / cellSize)}`
      if (!grid[cellKey]) {
        grid[cellKey] = flight
      }
    }
    displayFlights = Object.values(grid)
  }
}

  const getSize = () => {
    const zoom = zoomLevelRef.current
    if (isFlightSelected) return 0.6
    if (zoom < 130) return 0.15
    if (zoom < 180) return 0.2
    if (zoom < 250) return 0.3
    return 0.35
  }

  const size = getSize()

  globeInstanceRef.current
    .objectsData(displayFlights)
    .objectLat((f) => f.lat)
    .objectLng((f) => f.lon)
    .objectAltitude(0)
    .objectRotation((f) => {
      const heading = f.track || 0
      return { x: 0, y: 0, z: -heading }
    })
    .objectThreeObject(() => {
      // Create a plane shape
      const shape = new THREE.Shape()
      // Nose
      shape.moveTo(0, 1)
      // Right wing
      shape.lineTo(0.6, -0.2)
      shape.lineTo(0.15, -0.1)
      // Tail right
      shape.lineTo(0.15, -0.7)
      shape.lineTo(0.35, -1)
      // Tail bottom
      shape.lineTo(0, -0.8)
      // Tail left (mirror)
      shape.lineTo(-0.35, -1)
      shape.lineTo(-0.15, -0.7)
      shape.lineTo(-0.15, -0.1)
      // Left wing
      shape.lineTo(-0.6, -0.2)
      shape.closePath()

      const geometry = new THREE.ShapeGeometry(shape)
      geometry.scale(size, size, size)

      const material = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide,
      })

      const mesh = new THREE.Mesh(geometry, material)
      return mesh
    })
}, [flights, selectedFlight, isFlightSelected])

  // Handle click events on the globe canvas
  // Raycasts from the mouse position to find which aircraft was clicked
  useEffect(() => {
    if (!mountRef.current || !globeInstanceRef.current) return
    
    let mouseDownPos = null

    const handleMouseDown = (event) => {
      mouseDownPos = { x: event.clientX, y: event.clientY }
    }

    const handleClick = (event) => {
      if (mouseDownPos) {
        const dist = Math.hypot(event.clientX - mouseDownPos.x, event.clientY - mouseDownPos.y)
        if (dist > 5) return
      }

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
    canvas?.addEventListener('mousedown', handleMouseDown)
    canvas?.addEventListener('click', handleClick)

    return () => {
      canvas?.removeEventListener('mousedown', handleMouseDown)
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
        .arcDashLength(0.35)
        .arcDashGap(0.1)
        .arcDashAnimateTime(2000)
        .arcStroke(0.15)
        .arcAltitude(0.1)

        // Add origin/dest labels alongside major airports
      const routeAirports = [
        {
          lat: routeData.origin.latitude,
          lng: routeData.origin.longitude,
          iata: routeData.origin.iata_code,
          isRoute: true,
        },
        {
          lat: routeData.destination.latitude,
          lng: routeData.destination.longitude,
          iata: routeData.destination.iata_code,
          isRoute: true,
        },
      ]
      globeInstanceRef.current
        .labelsData([...majorAirports, ...routeAirports])
        .labelLat((d) => d.lat)
        .labelLng((d) => d.lng)
        .labelText((d) => d.isRoute ? `${d.iata}` : d.iata)
        .labelSize((d) => d.isRoute ? 0.6 : 0.3)
        .labelDotRadius((d) => d.isRoute ? 0.2 : 0.1)
        .labelColor((d) => d.isRoute ? '#ff4444' : 'rgba(255, 255, 255, 0.7)')
        .labelResolution(2)
    } else {
      globeInstanceRef.current.arcsData([])
      //Reset labels back to just major airports
      globeInstanceRef.current
        .labelsData(majorAirports)
        .labelText((d) => d.iata)
        .labelSize(0.3)
        .labelDotRadius(0.1)
        .labelColor(() => 'rgba(255, 255, 255, 0.7)')
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

  //Handle hover events on the globe canvas

  useEffect(() => {
    if (!mountRef.current || !globeInstanceRef.current) return

    const handleMouseMove = (event) => {
      if (isFlightSelected) {
        if(tooltipRef.current) tooltipRef.current.style.display = 'none'
        hoveredFlightRef.current = null
        return
      }

      const camera = cameraRef.current
      const renderer = rendererRef.current
      if (!camera || !renderer) return

      const rect = renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(mouse, camera)

      const intersects = raycaster.intersectObjects(
        globeInstanceRef.current.children,
        true
      )

      if (intersects.length > 0) {
        const point = intersects[0].point
        const GLOBE_RADIUS = 100
        const hoverLat = Math.asin(point.y / GLOBE_RADIUS) * (180 / Math.PI)
        const hoverLon = Math.atan2(point.x, point.z) * (180 / Math.PI)

        const nearest = flights
          .filter((f) => f.lat != null && f.lon != null)
          .reduce((closest, flight) => {
            const dist = Math.hypot(flight.lat - hoverLat, flight.lon - hoverLon)
            return dist < closest.dist ? { flight, dist } : closest
          }, { flight: null, dist: Infinity })
        
        if (nearest.flight && nearest.dist < 3) {
          hoveredFlightRef.current = nearest.flight

        if (tooltipRef.current) {
          const f = nearest.flight
          const callsign = f.flight?.trim() || 'Unknown'
          const type = f.desc || f.t || 'Unknown'
          const heading = f.track != null ? `${Math.round(f.track)}°` : 'N/A'

          tooltipRef.current.innerHTML = `
            <div style="font-weight:600;color:#00ff88;margin-bottom:2px;">${callsign}</div>
            <div>${type}</div>
            <div>HDG ${heading}</div>
          `

          tooltipRef.current.style.display = 'block'
          tooltipRef.current.style.left = `${event.clientX + 15}px`
          tooltipRef.current.style.top = `${event.clientY + 15}px`
        }
        }else{
          hoveredFlightRef.current = null
          if (tooltipRef.current) tooltipRef.current.style.display = 'none'
        }
      }else {
        hoveredFlightRef.current = null
        if (tooltipRef.current) tooltipRef.current.style.display = 'none'
      }
    }

    const canvas = rendererRef.current?.domElement
    canvas?.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas?.removeEventListener('mousemove', handleMouseMove)
    }
  }, [flights, isFlightSelected])

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
    className="w-full h-full bg-black relative"
    style={{ touchAction: 'none' }}
  >
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none hidden bg-zinc-900/90 border border-zinc-700 rounded px-3 py-2 text-xs font-mono text-zinc-300 backdrop-blur-sm"
      style={{ display: 'none' }}
    />
    <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2">
      <button
        onClick={() => {
          if (!cameraRef.current || !controlsRef.current) return
          const camera = cameraRef.current
          const direction = camera.position.clone().normalize()
          const newDistance = Math.max(camera.position.length() - 30, 100)
          camera.position.copy(direction.multiplyScalar(newDistance))
          controlsRef.current.update()
        }}
        className="w-10 h-10 bg-zinc-900/80 border border-zinc-700 rounded text-white text-lg font-mono hover:bg-zinc-800 transition-colors backdrop-blur-sm"
      >
        +
      </button>
      <button
        onClick={() => {
          if (!cameraRef.current || !controlsRef.current) return
          const camera = cameraRef.current
          const direction = camera.position.clone().normalize()
          const newDistance = Math.min(camera.position.length() + 30, 500)
          camera.position.copy(direction.multiplyScalar(newDistance))
          controlsRef.current.update()
        }}
        className="w-10 h-10 bg-zinc-900/80 border border-zinc-700 rounded text-white text-lg font-mono hover:bg-zinc-800 transition-colors backdrop-blur-sm"
      >
        −
      </button>
    </div>
  </div>
)
}

export default GlobeComponent