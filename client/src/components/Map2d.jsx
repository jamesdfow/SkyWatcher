import { MapContainer, TileLayer, Marker, Tooltip, Polyline, CircleMarker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useGlobeStore from '../store/globeStore'
import useFlights from '../hooks/useFlights'
import { useState } from 'react'

const commercialCategories = ['A2', 'A3', 'A4', 'A5']

function createPlaneIcon(heading) {
  return L.divIcon({
    className: '',
    html: `<svg width="16" height="16" viewBox="0 0 16 16" style="transform: rotate(${heading || 0}deg)">
      <path d="M8 1 L10 6 L14 7 L10 8 L10 13 L8 12 L6 13 L6 8 L2 7 L6 6 Z" fill="#34d399" stroke="#064e3b" stroke-width="0.5"/>
    </svg>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function MapController({ onMove, onZoom }) {
  useMapEvents({
    moveend: (e) => {
      const center = e.target.getCenter()
      onMove({ lat: center.lat, lon: center.lng })
    },
    zoomend: (e) => {
      onZoom(e.target.getZoom())
    },
  })
  return null
}

function FlightMarkers({ zoom }) {
  const flights = useGlobeStore((state) => state.flights)
  const setSelectedFlight = useGlobeStore((state) => state.setSelectedFlight)
  const selectedFlight = useGlobeStore((state) => state.selectedFlight)
  const isFlightSelected = useGlobeStore((state) => state.isFlightSelected)

  const validFlights = flights.filter(
    (f) => f.lat != null && f.lon != null && commercialCategories.includes(f.category)
  )

  let displayFlights

  if (isFlightSelected && selectedFlight) {
    displayFlights = validFlights.filter((f) => f.hex === selectedFlight.hex)
  } else if (zoom >= 6) {
    displayFlights = validFlights
  } else {
    let cellSize
    if (zoom <= 3) cellSize = 10
    else if (zoom <= 4) cellSize = 5
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

  return displayFlights.map((flight) => (
    <Marker
      key={flight.hex}
      position={[flight.lat, flight.lon]}
      icon={createPlaneIcon(flight.track)}
      eventHandlers={{
        click: () => setSelectedFlight(flight),
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

    const positions = [
        [routeData.origin.latitude, routeData.origin.longitude],
        [routeData.destination.latitude, routeData.destination.longitude]
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
            pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 1}}
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
            pathOptions={{ color: '#ff4444', fillColor: '#ff4444', fillOpacity: 1}}
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

export default function Map2D() {
  const [viewCenter, setViewCenter] = useState({ lat: 39.8283, lon: -98.5795 })
  const [zoom, setZoom] = useState(4)

  useFlights(viewCenter.lat, viewCenter.lon, 2500)

  return (
    <MapContainer
      center={[viewCenter.lat, viewCenter.lon]}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      />
      <MapController
        onMove={({ lat, lon }) => setViewCenter({ lat, lon })}
        onZoom={(z) => setZoom(z)}
      />
      <FlightMarkers zoom={zoom} />
      <RoutePolyLine />
    </MapContainer>
  )
}