// FlightCard.jsx
// Displays detailed information about a selected aircraft
// Fetches route info separately since position data rarely includes origin/destination

import { useEffect, useState } from 'react'
import axios from 'axios'
import useGlobeStore from '../store/globeStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function FlightCard() {
  const selectedFlight = useGlobeStore((state) => state.selectedFlight)
  const clearSelectedFlight = useGlobeStore((state) => state.clearSelectedFlight)
  const [routeData, setRouteData] = useState(null)

  // When a flight is selected, fetch its route data by callsign
  useEffect(() => {
    if (!selectedFlight?.flight) return

    const callsign = selectedFlight.flight.trim()
    if (!callsign) return

    const fetchRoute = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/flights/route/${callsign}`)
        console.log('Route response:', res.data)
        const aircraft = res.data?.ac?.[0]
        setRouteData(aircraft || null)
      } catch {
        setRouteData(null)
      }
    }

    fetchRoute()
  }, [selectedFlight])

  if (!selectedFlight) return null

  const {
    flight,
    t,
    reg,
    alt_baro,
    gs,
    track,
    lat,
    lon,
    r,
    desc,
    ownOp,
  } = selectedFlight

  // Use route data for origin/destination if available
  const orig = routeData?.orig_iata || routeData?.orig_icao || '???'
  const dest = routeData?.dest_iata || routeData?.dest_icao || '???'

  return (
    <div className="absolute top-6 right-6 w-80 bg-black/80 border border-green-500/30 rounded-lg p-5 text-white backdrop-blur-sm z-10">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-green-400 text-xl font-mono font-bold">
            {flight?.trim() || 'Unknown'}
          </h2>
          <p className="text-gray-400 text-sm">{desc || t || 'Unknown aircraft'}</p>
        </div>
        <button
          onClick={clearSelectedFlight}
          className="text-gray-500 hover:text-white text-xl leading-none"
        >
          ✕
        </button>
      </div>

Route
<div className="flex items-center justify-between mb-4 bg-white/5 rounded p-3">
  <div className="text-center">
    <p className="text-green-400 text-lg font-mono font-bold">{orig}</p>
    <p className="text-gray-500 text-xs">Origin</p>
  </div>
  <div className="text-gray-500 text-sm">──✈──</div>
  <div className="text-center">
    <p className="text-green-400 text-lg font-mono font-bold">{dest}</p>
    <p className="text-gray-500 text-xs">Destination</p>
  </div>
</div>
{orig === '???' && dest === '???' && (
  <p className="text-gray-600 text-xs text-center -mt-2 mb-3">Route data unavailable</p>
)}

      {/* Flight stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded p-3">
          <p className="text-gray-400 text-xs mb-1">Altitude</p>
          <p className="text-white font-mono">
            {alt_baro != null ? `${alt_baro.toLocaleString()} ft` : 'N/A'}
          </p>
        </div>
        <div className="bg-white/5 rounded p-3">
          <p className="text-gray-400 text-xs mb-1">Ground speed</p>
          <p className="text-white font-mono">
            {gs != null ? `${Math.round(gs)} kts` : 'N/A'}
          </p>
        </div>
        <div className="bg-white/5 rounded p-3">
          <p className="text-gray-400 text-xs mb-1">Heading</p>
          <p className="text-white font-mono">
            {track != null ? `${Math.round(track)}°` : 'N/A'}
          </p>
        </div>
        <div className="bg-white/5 rounded p-3">
          <p className="text-gray-400 text-xs mb-1">Registration</p>
          <p className="text-white font-mono">{reg || r || 'N/A'}</p>
        </div>
        <div className="bg-white/5 rounded p-3 col-span-2">
          <p className="text-gray-400 text-xs mb-1">Operator</p>
          <p className="text-white font-mono">{ownOp || 'N/A'}</p>
        </div>
      </div>

      {/* Position */}
      <div className="mt-3 text-gray-500 text-xs text-center font-mono">
        {lat?.toFixed(4)}° / {lon?.toFixed(4)}°
      </div>
    </div>
  )
}

export default FlightCard