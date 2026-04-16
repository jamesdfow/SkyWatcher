/*
Entry point for the SkyWatch Express Server
This server acts as a proxy between the React frontend and third-party APIs
API keys are stored in .env and never exposed to the client
*/

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

//Load environment variables from .env file in process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//CORS config - restrcts which origins can make requests to this server
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.CLIENT_URL  
    ].filter(Boolean)
}));

// Parse incoming JSON request bodies
app.use(express.json());

//Health check endpoint - useful for Railway and general debugging
//hit /health to confirm server is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

//flight data proxy route
//fetched live aircraft data from adsb.lol and returns it to the client
//keeping the thrid-party API URL server-side in case we need to add auth later
app.get('/api/flights', async (req, res) => {
    try {
        const { lat = 39.5, lon = -98.35, dist = 2500 } = req.query

        const response = await axios.get(
            `https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${dist}`
        )

        res.json(response.data)
    }catch (error) {
        console.error('Error fetching flight data:', error.message)
        res.status(500).json({ error: 'Failed to fetch flight data' })
    }
})

//flight detail proxy route
//fetches detailed infor for a specific aircraft by ICAO hex code
//adsb.lol returns route infor including origin/destination airports
app.get('/api/flights/detail/:icao', async (req, res) => {
    try {
        const { icao } = req.params
        res.json(response.data)
    } catch (error) {
        console.error('Error fetching flight detail:', error.message)
        res.status(500).json({ error: 'Failed to fetch flight detail' })
    }
})

//route lookup proxy
//uses the callsign to fetch origin/destination from adsb.lol
//not all flights will have route data
app.get('/api/flights/route/:callsign', async (req, res) => {
    try {
        const { callsign } = req.params
        const response = await axios.get(
            `https://api.adsb.lol/v2/callsign/${callsign.trim()}`
        )
        res.json(response.data)
        } catch (error) {
            console.error('Error fetching route:', error.message)
            res.status(500).json({ error: 'Failed to fetch route data' })
        }
    })

//start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});