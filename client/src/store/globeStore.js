//global state for the globe - tracks flight data and the currently selected aircraft
//ALl components that need flight data pull from here rather than fetching independently

import { create } from 'zustand'

const useGlobeStore = create((set) => ({
    //array of aircraft objects from adsb.lol
    flights: [],

    //the currently selected/tracked aircraft (null if none selected)
    selectedFlight: null,

    //update flights array
    setFlights: (flights) => set({ flights }),

    //set the selected flight when a user clicks on an aircraft
    setSelectedFlight: (flight) => set({ selectedFlight: flight }),

    //clear the selected flight
    clearSelectedFlight: () => set({ selectedFlight: null }),
}))

export default useGlobeStore