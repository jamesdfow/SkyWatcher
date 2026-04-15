/*
Entry point for the SkyWatch Express Server
This server acts as a proxy between the React frontend and third-party APIs
API keys are stored in .env and never exposed to the client
*/

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

//Load environment variables from .env file in process.env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

//CORS config - restrcts which origins can make requests to this server
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

// Parse incoming JSON request bodies
app.use(express.json());

//Health check endpoint - useful for Railway and general debugging
//hit /health to confirm server is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

//start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});