//global state for the globe - tracks flight data, selected aircraft, and selected airport
//All components that need flight or airport data pull from here rather than fetching independently

import { create } from 'zustand'

const useGlobeStore = create((set) => ({
    //array of aircraft objects from adsb.lol
    flights: [],

    //the currently selected/tracked aircraft (null if none selected)
    selectedFlight: null,

    //whether the user has selected a flight - drives filtering on the globe
    isFlightSelected: false,

    //route data for the selected flight (origin, destination, airline)
    routeData: null,

    //the currently selected airport (null if none selected)
    selectedAirport: null,

    //update flights array
    setFlights: (flights) => set({ flights }),

    //set the selected flight when a user clicks on an aircraft
    setSelectedFlight: (flight) => set({ 
        selectedFlight: flight,
        isFlightSelected: true
    }),

    //clear the selected flight and its route data
    clearSelectedFlight: () => set({ 
        selectedFlight: null,
        isFlightSelected: false,
        routeData: null
    }),

    //set route data (origin, destination, airline) for the selected flight
    setRouteData: (data) => set({ routeData: data }),

    //set the selected airport when a user clicks on an airport marker
    setSelectedAirport: (airport) => set({ selectedAirport: airport }),

    //clear the selected airport
    clearSelectedAirport: () => set({ selectedAirport: null }),
}))

export default useGlobeStore