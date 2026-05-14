import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function Map2d() {
    return (
        <MapContainer
            center={[39.657, -98.345]}
            zoom={4}
            style={{ width: '100%', height: '100%'}}
        >
            <TileLayer 
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
        </MapContainer>
    )
}