// AirportCard.jsx
// Displays detailed information about a selected airport
// Shows airport info, runways, and frequencies from Supabase

import useGlobeStore from '../store/globeStore'

function AirportCard() {
  const selectedAirport = useGlobeStore((state) => state.selectedAirport)
  const clearSelectedAirport = useGlobeStore((state) => state.clearSelectedAirport)

  console.log('AirportCard - selectedAirport:', selectedAirport)

  if (!selectedAirport) return null

  const { airport, runways, frequencies } = selectedAirport

  return (
    <div className="absolute top-[calc(50%+0.75rem)] right-6 bottom-6 w-100 max-sm:top-auto max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:w-full max-sm:max-h-[45vh] overflow-y-auto bg-black/80 border border-amber-500/30 rounded-lg text-white backdrop-blur-sm z-[1000]">
      <div className="p-5">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-amber-400 text-xl font-mono font-bold">
              {airport.name || 'Unknown Airport'}
            </h2>
            <p className="text-gray-400 text-sm">{airport.type?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={clearSelectedAirport}
            className="text-white-500 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Codes and location */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/5 rounded p-3">
            <p className="text-gray-400 text-xs mb-1">ICAO</p>
            <p className="text-white font-mono">{airport.icao_code || 'N/A'}</p>
          </div>
          <div className="bg-white/5 rounded p-3">
            <p className="text-gray-400 text-xs mb-1">IATA</p>
            <p className="text-white font-mono">{airport.iata_code || 'N/A'}</p>
          </div>
          <div className="bg-white/5 rounded p-3">
            <p className="text-gray-400 text-xs mb-1">Elevation</p>
            <p className="text-white font-mono">{airport.elevation_ft ? `${airport.elevation_ft} ft` : 'N/A'}</p>
          </div>
          {/* <div className="bg-white/5 rounded p-3">
            <p className="text-gray-400 text-xs mb-1">Continent</p>
            <p className="text-white font-mono">{airport.continent || 'N/A'}</p>
          </div> */}
          <div className="bg-white/5 rounded p-3">
            <p className="text-gray-400 text-xs mb-1">Country</p>
            <p className="text-white font-mono">{airport.iso_country || 'N/A'}</p>
          </div>
          <div className="bg-white/5 rounded p-3">
            <p className="text-gray-400 text-xs mb-1">Region</p>
            <p className="text-white font-mono">{airport.iso_region || 'N/A'}</p>
          </div>
          <div className="bg-white/5 rounded p-3 col-span-2">
            <p className="text-gray-400 text-xs mb-1">Municipality</p>
            <p className="text-white font-mono">{airport.municipality || 'N/A'}</p>
          </div>
        </div>

        {/* Runways */}
        {runways.length > 0 && (
          <div className="mb-4">
            <h3 className="text-amber-400 text-sm font-mono font-semibold mb-2">Runways</h3>
            {runways.map((runway, i) => (
              <div key={i} className="bg-white/5 rounded p-3 mb-2 last:mb-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Runway: </span>
                    <span className="text-white font-mono">{runway.le_ident ? `${runway.le_ident}` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Length: </span>
                    <span className="text-white font-mono">{runway.length_ft ? `${runway.length_ft} ft` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Width: </span>
                    <span className="text-white font-mono">{runway.width_ft ? `${runway.width_ft} ft` : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Surface: </span>
                    <span className="text-white font-mono">{runway.surface || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Lighted: </span>
                    <span className="text-white font-mono">{runway.lighted === 1 || runway.lighted === true ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Heading: </span>
                    <span className="text-white font-mono">
                      {runway.le_heading_degT ? `${runway.le_heading_degT}°` : 'N/A'}
                      {runway.he_heading_degT ? ` / ${runway.he_heading_degT}°` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Elevation: </span>
                    <span className="text-white font-mono">
                      {runway.le_elevation_ft ? `${runway.le_elevation_ft} ft` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Frequencies */}
        {frequencies.length > 0 && (
          <div className="mb-4">
            <h3 className="text-amber-400 text-sm font-mono font-semibold mb-2">Frequencies</h3>
            {frequencies.map((freq, i) => (
              <div key={i} className="bg-white/5 rounded p-2 mb-1 last:mb-0 text-xs">
                <span className="text-amber-400 font-mono">{freq.frequency_mhz} MHz</span>
                <span className="text-gray-400 ml-2">{freq.type}</span>
                {freq.description && (
                  <span className="text-gray-500 ml-1">- {freq.description}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Links */}
        
        <div className="flex gap-3 mb-3">
          <span className="text-amber-400">Links: </span>
          {airport.home_link && (
            
              <a href={airport.home_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 text-xs font-mono hover:underline"
            >
              Website
            </a>
          )}
          {airport.wikipedia_link && (
            
              <a href={airport.wikipedia_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 text-xs font-mono hover:underline"
            >
              Wikipedia
            </a>
          )}
        </div>

        {/* Keywords */}
        {airport.keywords && (
          <div className="text-black-800 text-xs font-mono">
            {airport.keywords}
          </div>
        )}
      </div>
    </div>
  )
}

export default AirportCard