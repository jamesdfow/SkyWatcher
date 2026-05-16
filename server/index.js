/*
Entry point for the SkyWatch Express Server
This server acts as a proxy between the React frontend and third-party APIs
API keys are stored in .env and never exposed to the client
*/

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

//Load environment variables from .env file in process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
)

// CORS config - restrcts which origins can make requests to this server
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        process.env.CLIENT_URL  
    ].filter(Boolean)
}));

// app.use(cors());

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
app.get('/api/route/:callsign', async (req, res) => {
    try {
        const { callsign } = req.params
        const response = await axios.get(
            `https://api.adsbdb.com/v0/callsign/${callsign.trim()}`
        )
        res.json(response.data)
        } catch (error) {
            console.error('Error fetching route:', error.message)
            res.status(500).json({ error: 'Failed to fetch route data' })
        }
    })

    //plaespotters photo proxy route
    //fetches aircraft photos by registration number
    //photos cannot be cacheed
    app.get('/api/photos/:reg', async (req, res) => {
        try {
            const { reg } = req.params
            const response = await axios.get(
                `https://api.planespotters.net/pub/photos/reg/${reg}`
            )
            res.json(response.data)
        } catch (error) {
            console.error('Error fetching photo:', error.message)
            const status = error.response?.status || 500
            res.status(status).json({ error: 'Failed to fetch photo', photos: []})
        }
    })

    app.get('/api/airports/bounds', async(req, res) => {
        try {
            const { south, north, west, east, types } = req.query

            if (!south || !north || !west || !east || !types) {
                return res.status(400).json({ error: 'Missing required parameters '})
            }

            const typeArray = types.split(',')

            const { data, error} = await supabase
                .from('Airports')
                .select('id, ident, type, name, latitude_deg, longitude_deg, iata_code, icao_code, municipality')
                .in('type', typeArray)
                .gte('latitude_deg', parseFloat(south))
                .lte('latitude_deg', parseFloat(north))
                .gte('longitude_deg', parseFloat(west))
                .lte('longitude_deg', parseFloat(east))
                .limit(2000)

            if (error) throw error
            res.json(data)
        } catch (error) {
            console.error('Error fetching airports by bounds:', error.message)
            res.status(500).json({ error: 'Failed to fetch airports' })
        }
    })

    //Search airports by ICAO code, IATA code, or name
    app.get('/api/airports/search', async (req, res) => {
        try {
            const { q } = req.query
            if (!q || q.length < 2) {
                return res.json({ airports: [] })
            }
            const { data, error } = await supabase
                .from('Airports')
                .select('*')
                .or(`icao_code.ilike.%${q}%,iata_code.ilike.%${q}%,name.ilike.%${q}%`)
                .limit(20)

            if (error) throw error
            res.json({ airports: data })
        } catch (error) {
            console.error('Error searching airports:', error.message)
            res.status(500).json({ error: 'Failed to search airports' })
        }
    })
// Get full airport details by ICAO code
app.get('/api/airports/detail/:icao', async (req, res) => {
    try {
        const { icao } = req.params

        const { data: airport, error: airportError } = await supabase
            .from('Airports')
            .select('*')
            .eq('icao_code', icao.toUpperCase())
            .single()

        if (airportError) throw airportError

        //Fetch runways for this airport
        const { data: runways } = await supabase
            .from('Runways')
            .select('*')
            .eq('airport_ident', icao.toUpperCase())

        //Fetch frequencies for this airport
        const { data: frequencies } = await supabase
            .from('airport_frequencies')
            // .select('frequency_mhz')
            // .select('type')
            // .select('description')
            // .select('frequency_mhz, type, description')
            .select('*')
            .eq('airport_ident', icao.toUpperCase())
        
        res.json({
            airport,
            runways: runways || [],
            frequencies: frequencies || []
        })
    } catch (error) {
        console.error('Error fetching airport details:', error.message)
        res.status(500).json({ error: 'Failed to fetch airport details' })
    }
})

//Get regions
app.get('/api/regions', async (req, res) => {
    try {
        const { continent } = req.query

        let query = supabase.from('Regions').select('*')
        if (continent) {
            query = query.eq('continent', continent)
        }

        const { data, error } = await query.limit(500)
        if (error) throw error
        res.json({ regions: data })
    } catch (error) {
        console.error('Error fetching regions:', error.message)
        res.status(500).json({ error: 'Failed to fetch regions' })
    }
})

//start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});