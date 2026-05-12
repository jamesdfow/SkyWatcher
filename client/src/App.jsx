// Root application component
// Provides page layout with header, globe viewport, and info section

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GlobeComponent from './components/Globe'
import FlightCard from './components/FlightCard'
import useGlobeStore from './store/globeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
})

function LiveFlightCount() {
  const flights = useGlobeStore((state) => state.flights)
  const commercialCategories = ['A2', 'A3', 'A4', 'A5']
  const count = flights.filter((f) =>
    f.lat != null && f.lon != null && commercialCategories.includes(f.category)
  ).length

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="text-zinc-400 text-sm font-mono">
        <span className="text-emerald-400 font-semibold">{count.toLocaleString()}</span> flights tracked
      </span>
    </div>
  )
}

function AppContent() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Header */}
      {!isFullscreen && (
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
          <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg tracking-tight font-semibold">
                <span className="text-emerald-400">Sky</span>
                <span className="text-white">Watcher</span>
              </h1>
              <span className="text-zinc-700 text-sm hidden sm:inline">|</span>
              <LiveFlightCount />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFullscreen(true)}
                className="text-zinc-500 hover:text-white text-sm font-mono px-3 py-1.5 border border-zinc-800 rounded hover:border-zinc-600 transition-colors"
                title="Fullscreen"
              >
                ⛶ Expand
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Globe viewport */}
      <div
        className={
          isFullscreen
            ? 'fixed inset-0 z-40'
            : 'relative w-full mt-14'
        }
        style={!isFullscreen ? { height: 'calc(100vh - 3.5rem)' } : undefined}
      >
        <GlobeComponent />
        <FlightCard />

        {/* Fullscreen exit button */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="fixed top-4 left-4 z-50 text-zinc-500 hover:text-white text-sm font-mono px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded hover:border-zinc-600 transition-colors backdrop-blur-sm"
          >
            ✕ Exit
          </button>
        )}

        {/* Scroll indicator -- only when not fullscreen */}
        {!isFullscreen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 animate-bounce">
            <div className="flex flex-col items-center gap-1 text-zinc-600">
              <span className="text-xs font-mono">Scroll to learn more</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-zinc-600">
                <path d="M10 4L10 16M10 16L5 11M10 16L15 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info section */}
      {!isFullscreen && (
        <section className="relative z-10 bg-zinc-950 border-t border-zinc-800/60">

          {/* How it works */}
          <div className="max-w-screen-xl mx-auto px-6 py-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-12 text-center">
              <span className="text-emerald-400">How</span> it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-6">
                <div className="text-emerald-400 text-2xl mb-4">01</div>
                <h3 className="text-white font-medium mb-2">Live ADS-B Data</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Aircraft broadcast their position, altitude, speed, and heading via ADS-B transponders. SkyWatcher pulls this data in real time and plots each flight on a 3D globe.
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-6">
                <div className="text-emerald-400 text-2xl mb-4">02</div>
                <h3 className="text-white font-medium mb-2">Select Any Flight</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Click on any aircraft icon to pull up its details -- callsign, route, altitude, ground speed, and an actual photo of the aircraft. The globe centers on the flight path automatically.
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-6">
                <div className="text-emerald-400 text-2xl mb-4">03</div>
                <h3 className="text-white font-medium mb-2">Explore the Globe</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Drag to rotate, scroll to zoom. SkyWatcher fetches new flight data as you move around the globe, so you can explore air traffic anywhere in the world.
                </p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="max-w-screen-xl mx-auto px-6 pb-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-12 text-center">
              <span className="text-emerald-400">Reading</span> the map
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="text-emerald-400 text-xl mt-0.5">▲</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Aircraft Icons</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Green icons represent commercial flights. Each icon points in the direction the aircraft is heading.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-white/70 text-xl mt-0.5">●</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Airport Labels</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    White labels show the world's top 100 airports by IATA code. These are always visible as reference points.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-red-400 text-xl mt-0.5">⌒</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Flight Path</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    When a flight is selected, a red arc shows the route between origin and destination airports.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-red-400 text-xl mt-0.5">◆</div>
                <div>
                  <h3 className="text-white font-medium mb-1">Route Airports</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Origin and destination airports appear in red with full names when a flight is selected.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tech stack */}
          <div className="max-w-screen-xl mx-auto px-6 pb-20">
            <h2 className="text-2xl font-semibold tracking-tight mb-12 text-center">
              <span className="text-emerald-400">Built</span> with
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                'React', 'Three.js', 'three-globe', 'Zustand',
                'React Query', 'Express', 'Tailwind CSS',
                'adsb.lol API', 'adsbdb API', 'Planespotters.net API'
              ].map((tech) => (
                <span
                  key={tech}
                  className="px-3 py-1.5 text-sm font-mono text-zinc-400 border border-zinc-800 rounded bg-zinc-900/30"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="border-t border-zinc-800/60 py-8">
            <div className="max-w-screen-xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-zinc-600 text-sm font-mono">
                <span className="text-emerald-400">Sky</span>Watcher
              </div>
              <div className="text-zinc-700 text-xs font-mono">
                Flight data provided by adsb.lol &middot; Route data by adsbdb &middot; Photos by Planespotters.net
              </div>
            </div>
          </footer>
        </section>
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App