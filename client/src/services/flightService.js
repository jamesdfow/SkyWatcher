//Handles all flight-related API calls to the express server
//The server acts as a proxy to adsb.lol so API URLs never reach the client

import axios from 'axios'

//base URL for the Express server
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

//fetch all aircraft within a given radius of a lat/lon point
//defaults to a wide view of the continental US
export const fetchFlights = async (lat = 39.5, lon = -98.35, dist = 2500) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/flights`, {
            params: { lat, lon, dist }
        })
        return response.data.ac || []
    } catch (error) {
        console.error('Error fetching flights:', error.message)
        return []
    }
}