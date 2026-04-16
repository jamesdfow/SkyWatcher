//Fetches detailed infor for a specific aircraft by its ICAO Hex Code
//Used to get route info (origin/destination) when a user selects a flight

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

//fetch details for a specific aircraft by ICAO hex code
export const fetchFlightDetail = async (icaoHex) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/api/flights.detail/${icaoHex}`)
        return response.data
    } catch (error) {
        console.error('Error fetching flight detail:', error.message)
        return null
    }
}