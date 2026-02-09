"use client"
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface ReportPoint {
  id: number;
  reporter: string;
  category: string;
  lat: number;
  lng: number;
  image?: string;
  description: string;
}

export default function Map({ reports }: { reports: ReportPoint[] }) {
  const position: [number, number] = [4.1755, 96.1249];

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner z-0 border-2 border-slate-100">
      <MapContainer center={position} zoom={8} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {reports.map((report) => (
          <Marker key={report.id} position={[report.lat, report.lng]} icon={DefaultIcon}>
            <Popup minWidth={200}>
              <div className="font-sans p-1">
                {report.image && (
                  <img src={report.image} alt="Bukti" className="w-full h-24 object-cover rounded-lg mb-2" />
                )}
                <span className="text-[10px] font-bold uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded">{report.category}</span>
                <h4 className="font-bold text-slate-800 mt-1">{report.reporter}</h4>
                <p className="text-xs text-slate-600 leading-tight">{report.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}