import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useGlobeStore from '../store/globeStore'
import useFlights from '../hooks/useFlights'
import { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const commercialCategories = ['A2', 'A3', 'A4', 'A5']

function createPlaneIcon(heading) {
  return L.divIcon({
    className: '',
    html: `<div style="transform: rotate(${heading || 0}deg); color: #34d399; font-size: 16px; line-height: 1; text-align: center;">▲</div>`,
    iconSize: [10, 10],
    iconAnchor: [8, 8],
  })
}

const airportIconColors = {
  large_airport: '#f59e0b',
  medium_airport: '#3b82f6',
  small_airport: '#a855f7',
}

function createAirportIcon(type) {
  const color = airportIconColors[type] || '#ffffff'
  return L.divIcon({
    className: '',
    html: `<svg width="10" height="10" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="4" fill="${color}" stroke="#1e1e1e" stroke-width="1"/>
    </svg>`,
    iconSize: [8, 8],
    iconAnchor: [5, 5],
  })
}

function MapController({ onMove, onZoom, onBoundsChange }) {
  const map = useMap()

  useMapEvents({
    moveend: () => {
      const center = map.getCenter()
      onMove({ lat: center.lat, lon: center.lng })
      const bounds = map.getBounds()
      onBoundsChange({
        south: bounds.getSouth(),
        north: bounds.getNorth(),
        west: bounds.getWest(),
        east: bounds.getEast(),
      })
    },
    zoomend: () => {
      onZoom(map.getZoom())
      const bounds = map.getBounds()
      onBoundsChange({
        south: bounds.getSouth(),
        north: bounds.getNorth(),
        west: bounds.getWest(),
        east: bounds.getEast(),
      })
    },
  })

  // Get initial bounds on mount
  useEffect(() => {
    const bounds = map.getBounds()
    onBoundsChange({
      south: bounds.getSouth(),
      north: bounds.getNorth(),
      west: bounds.getWest(),
      east: bounds.getEast(),
    })
  }, [map])

  return null
}

function FlightMarkers({ zoom, bounds }) {
  const flights = useGlobeStore((state) => state.flights)
  const selectedFlight = useGlobeStore((state) => state.selectedFlight)
  const isFlightSelected = useGlobeStore((state) => state.isFlightSelected)
  const setSelectedFlight = useGlobeStore((state) => state.setSelectedFlight)
  const validFlights = flights.filter(
    (f) => f.lat != null && f.lon != null && commercialCategories.includes(f.category)
  )

  // Filter to only flights within the visible viewport
  const visibleFlights = bounds
    ? validFlights.filter(
        (f) =>
          f.lat >= bounds.south &&
          f.lat <= bounds.north &&
          f.lon >= bounds.west &&
          f.lon <= bounds.east
      )
    : validFlights

  let displayFlights

  if (isFlightSelected && selectedFlight) {
    displayFlights = validFlights.filter((f) => f.hex === selectedFlight.hex)
  } else if (zoom >= 6) {
    displayFlights = visibleFlights
  } else {
    let cellSize
    if (zoom <= 3) cellSize = 10
    else if (zoom <= 4) cellSize = 5
    else cellSize = 2

    const grid = {}
    for (const flight of visibleFlights) {
      const cellKey = `${Math.floor(flight.lat / cellSize)},${Math.floor(flight.lon / cellSize)}`
      if (!grid[cellKey]) {
        grid[cellKey] = flight
      }
    }
    displayFlights = Object.values(grid)
  }

  return displayFlights.map((flight) => (
<Marker
  key={flight.hex}
  position={[flight.lat, flight.lon]}
  icon={createPlaneIcon(flight.track)}
  eventHandlers={{
    click: () => {
      console.log('Marker position:', flight.lat, flight.lon)
      console.log('Flight callsign:', flight.flight?.trim())
      console.log('Flight hex:', flight.hex)      
      setSelectedFlight(flight)
    },
  }}
>
      <Tooltip direction="top" offset={[0, -10]}>
        <div className="text-xs font-mono">
          <div>{flight.flight?.trim() || 'Unknown'}</div>
          <div>{flight.desc || flight.t || ''}</div>
          <div>{flight.track != null ? `${Math.round(flight.track)}°` : ''}</div>
        </div>
      </Tooltip>
    </Marker>
  ))
}

function RoutePolyLine() {
  const routeData = useGlobeStore((state) => state.routeData)

  if (
    !routeData?.origin?.latitude ||
    !routeData?.origin?.longitude ||
    !routeData?.destination?.latitude ||
    !routeData?.destination?.longitude
  ) return null

  let originLng = routeData.origin.longitude
  let destLng = routeData.destination.longitude

  // if the route is shorter crossing the antimeridian, adjust
  if (Math.abs(originLng - destLng) > 180) {
    if (destLng < originLng) {
      destLng += 360
    }else{
      originLng += 360
    }
  }

  const positions = [
    [routeData.origin.latitude, routeData.origin.longitude],
    [routeData.destination.latitude, routeData.destination.longitude],
  ]

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#ff4444',
          weight: 2,
          dashArray: '8, 6',
        }}
      />
      <CircleMarker
        center={[routeData.origin.latitude, routeData.origin.longitude]}
        radius={5}
        pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 1 }}
      >
        <Tooltip direction="top" permanent>
          <span className="font-mono text-xs font-bold" style={{ color: '#ff4444' }}>
            {routeData.origin.iata_code || routeData.origin.icao_code}
          </span>
        </Tooltip>
      </CircleMarker>
      <CircleMarker
        center={[routeData.destination.latitude, routeData.destination.longitude]}
        radius={5}
        pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 1 }}
      >
        <Tooltip direction="top" permanent>
          <span className="font-mono text-xs font-bold" style={{ color: '#ff4444' }}>
            {routeData.destination.iata_code || routeData.destination.icao_code}
          </span>
        </Tooltip>
      </CircleMarker>
    </>
  )
}

function MapClickHandler({ bounds }) {
  const flights = useGlobeStore((state) => state.flights)
  const setSelectedFlight = useGlobeStore((state) => state.setSelectedFlight)
  const isFlightSelected = useGlobeStore((state) => state.isFlightSelected)
  const clearSelectedFlight = useGlobeStore((state) => state.clearSelectedFlight)

  const visibleFlights = flights.filter(
    (f) =>
      f.lat != null &&
      f.lon != null &&
      commercialCategories.includes(f.category) &&
      (!bounds ||
        (f.lat >= bounds.south &&
          f.lat <= bounds.north &&
          f.lon >= bounds.west &&
          f.lon <= bounds.east))
  )

  useMapEvents({
    click: (e) => {
      if (isFlightSelected) {
        clearSelectedFlight()
        return
      }

      const clickLat = e.latlng.lat
      const clickLon = e.latlng.lng

      const nearest = visibleFlights.reduce(
        (closest, flight) => {
          const dist = Math.hypot(flight.lat - clickLat, flight.lon - clickLon)
          return dist < closest.dist ? { flight, dist } : closest
        },
        { flight: null, dist: Infinity }
      )

      if (nearest.flight && nearest.dist < 3) {
        setSelectedFlight(nearest.flight)
      }
    },
  })

  return null
}

function AirportMarkers({ airports }) {
  const setSelectedAirport = useGlobeStore((state) => state.setSelectedAirport)

  // Click fetches full airport detail (runways, frequencies) then stores it
  const handleAirportClick = async (airport) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/airports/detail/${airport.ident}`
      )
      console.log('Airport detail response:', res.data)
      setSelectedAirport(res.data)
    } catch (error) {
      console.error('Error fetching airport detail:', error.message)
    }
  }

  return airports.map((airport) => (
    <Marker
      key={airport.id}
      position={[airport.latitude_deg, airport.longitude_deg]}
      icon={createAirportIcon(airport.type)}
      eventHandlers={{
        click: () => handleAirportClick(airport),
      }}
    >
      <Tooltip direction="top" offset={[0, -8]}>
        <div className="text-xs font-mono">
          <div className="font-bold">{airport.iata_code || airport.ident}</div>
          <div>{airport.name}</div>
          {airport.municipality && <div className="text-gray-500">{airport.municipality}</div>}
        </div>
      </Tooltip>
    </Marker>
  ))
}

function AirportFilterPanel({ filters, setFilters }) {
  const options = [
    { key: 'large_airport', label: 'Large', color: '#f59e0b' },
    { key: 'medium_airport', label: 'Medium', color: '#3b82f6' },
    { key: 'small_airport', label: 'Small', color: '#a855f7' },
  ]

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-black/60 backdrop-blur-sm border border-zinc-700 rounded-lg p-3">
      <p className="text-white text-xs font-mono font-semibold mb-2">Airports</p>
      {options.map(({ key, label, color }) => (
        <label key={key} className="flex items-center gap-2 cursor-pointer mb-1 last:mb-0">
          <input
            type="checkbox"
            checked={filters.includes(key)}
            onChange={() => {
              setFilters((prev) =>
                prev.includes(key)
                  ? prev.filter((f) => f !== key)
                  : [...prev, key]
              )
            }}
            className="accent-emerald-400 w-3 h-3"
          />
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: color }}
          />
          <span className="text-zinc-300 text-xs font-mono">{label}</span>
        </label>
      ))}
    </div>
  )
}

export default function Map2D() {
  const [viewCenter, setViewCenter] = useState({ lat: 39.8283, lon: -98.5795 })
  const [zoom, setZoom] = useState(4)
  const [bounds, setBounds] = useState(null)
  const [airportFilters, setAirportFilters] = useState(['large_airport'])
  const [airports, setAirports] = useState([])

  // Calculate radius in nautical miles from viewport bounds
const radiusNm = bounds
  ? Math.min(
      Math.sqrt(
        Math.pow((bounds.north - bounds.south) / 2, 2) +
        Math.pow((bounds.east - bounds.west) / 2, 2)
      ) * 60,
      2500
    )
  : 250

useFlights(viewCenter.lat, viewCenter.lon, Math.round(radiusNm))

  // Fetch airports when bounds or filters change
useEffect(() => {
    let cancelled = false

    if (!bounds || airportFilters.length === 0) {
      return () => { cancelled = true }
    }

    const fetchAirports = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/airports/bounds`, {
          params: {
            south: bounds.south,
            north: bounds.north,
            west: bounds.west,
            east: bounds.east,
            types: airportFilters.join(','),
          },
        })
        if (!cancelled) setAirports(res.data)
      } catch (error) {
        console.error('Error fetching airports:', error.message)
      }
    }

    fetchAirports()

    return () => { cancelled = true }
  }, [bounds, airportFilters])

  return (
    <div className="relative w-full h-full">
      <AirportFilterPanel filters={airportFilters} setFilters={setAirportFilters} />
      <MapContainer
        center={[viewCenter.lat, viewCenter.lon]}
        zoom={zoom}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapController
          onMove={({ lat, lon }) => setViewCenter({ lat, lon })}
          onZoom={(z) => setZoom(z)}
          onBoundsChange={setBounds}
        />
        <ZoomControl position="bottomleft" />
        <FlightMarkers zoom={zoom} bounds={bounds}/>
        <MapClickHandler bounds={bounds} />
        <RoutePolyLine />
        <AirportMarkers airports={airports} />
      </MapContainer>
    </div>
  )
}