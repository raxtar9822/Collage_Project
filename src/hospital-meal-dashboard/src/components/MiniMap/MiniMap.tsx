import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './MiniMap.module.css';

const MiniMap = () => {
    const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);

    useEffect(() => {
        // Fetch delivery personnel locations from the API or WebSocket
        const fetchDeliveryPersonnel = async () => {
            // Replace with actual API call or WebSocket subscription
            const response = await fetch('/api/delivery-personnel');
            const data = await response.json();
            setDeliveryPersonnel(data);
        };

        fetchDeliveryPersonnel();

        // Optionally set up a WebSocket connection for real-time updates
        const socket = new WebSocket('ws://your-websocket-url');
        socket.onmessage = (event) => {
            const updatedPersonnel = JSON.parse(event.data);
            setDeliveryPersonnel(updatedPersonnel);
        };

        return () => {
            socket.close();
        };
    }, []);

    return (
        <div className="mini-map">
            <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '400px', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {deliveryPersonnel.map(person => (
                    <Marker key={person.id} position={[person.latitude, person.longitude]}>
                        <Popup>
                            {person.name} - {person.status}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MiniMap;