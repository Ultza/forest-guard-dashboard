"use client"
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Konfigurasi Custom Icons berdasarkan warna
const createIcon = (color: string) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const icons: { [key: string]: L.Icon } = {
  'ILEGAL LOGGING': createIcon('green'),
  'KEBAKARAN HUTAN': createIcon('red'),
  'PERBURUAN SATWA': createIcon('orange'),
  'DEFAULT': createIcon('blue')
};

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
    <div className="w-full h-full rounded-2xl overflow-hidden shadow-inner z-0 border-2 border-slate-800 relative">
      
      {/* --- UI LEGENDA --- */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 border border-emerald-500/50 p-3 rounded-xl backdrop-blur-sm shadow-xl">
        <p className="text-[10px] font-bold text-emerald-400 mb-2 tracking-widest uppercase">Peta Wilayah</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span className="text-[11px] text-slate-200">Ilegal Logging</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
            <span className="text-[11px] text-slate-200">Kebakaran Hutan</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
            <span className="text-[11px] text-slate-200">Perburuan Satwa</span>
          </div>
        </div>
      </div>

      <MapContainer center={position} zoom={8} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {reports.map((report) => (
          <Marker 
            key={report.id} 
            position={[report.lat, report.lng]} 
            // Memilih icon berdasarkan kategori, jika tidak cocok pakai DEFAULT
            icon={icons[report.category] || icons['DEFAULT']}
          >
            <Popup minWidth={200}>
              <div className="font-sans p-1">
                {report.image && (
                  <img src={report.image} alt="Bukti" className="w-full h-24 object-cover rounded-lg mb-2" />
                )}
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                  report.category === 'KEBAKARAN HUTAN' ? 'text-red-600 bg-red-50' : 
                  report.category === 'ILEGAL LOGGING' ? 'text-green-600 bg-green-50' : 'text-orange-600 bg-orange-50'
                }`}>
                  {report.category}
                </span>
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