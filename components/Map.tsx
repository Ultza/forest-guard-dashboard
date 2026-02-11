"use client"
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fungsi buat icon tetap sama seperti sebelumnya
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

export default function Map({ reports, isSatellite = true, showHeatmap = false, heatmapScale = 3000 }: { reports: any[]; isSatellite?: boolean; showHeatmap?: boolean; heatmapScale?: number }) {
  const position: [number, number] = [4.1755, 96.1249];
  
  // Tentukan URL tile layer berdasarkan mode
  const tileLayerUrl = isSatellite 
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="map-root w-full h-full rounded-2xl overflow-hidden relative border-2 border-slate-800">
      
      {/* Label Tactical (Z-Index disesuaikan) */}
      <div className="absolute top-4 left-12 z-[1000] bg-slate-900/80 border border-emerald-500/50 px-3 py-1 rounded-md">
        <span className="text-[10px] font-black text-emerald-500 tracking-tighter uppercase italic">
          Tactical Monitoring
        </span>
      </div>

      {/* Legenda tetap di kiri bawah */}
      <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 border border-emerald-500/50 p-3 rounded-xl backdrop-blur-sm">
        <p className="text-[9px] font-bold text-emerald-400 mb-2 uppercase">Peta Wilayah</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-500" /> Ilegal Logging
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-300">
            <div className="w-2 h-2 rounded-full bg-red-500" /> Kebakaran Hutan
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-300">
            <div className="w-2 h-2 rounded-full bg-orange-500" /> Perburuan Satwa
          </div>
        </div>
      </div>

      <MapContainer 
        center={position} 
        zoom={8} 
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer 
          url={tileLayerUrl}
          attribution={isSatellite ? '&copy; Esri' : '&copy; OpenStreetMap contributors'}
        />
        
        {/* Tempatkan tombol zoom di kanan atas dan pastikan berada di atas label */}
        <ZoomControl position="topright" />
        
        {/* Render heatmap circles jika aktif dan ada data */}
        {showHeatmap && reports.length > 0 && reports
          .filter(r => r.lat && r.lng)
          .map((r, idx) => {
            const intensity = r.status === 'SELESAI' ? 0.25 : r.status === 'DIKUNJUNGI' ? 0.6 : 1;
            const radius = Math.max(150, (heatmapScale || 3000) * intensity);
            const color = (r.category || '').toLowerCase().includes('ilegal') ? '#10b981' : (r.category || '').toLowerCase().includes('kebakaran') ? '#ef4444' : '#f97316';

            return (
              <Circle
                key={`heat-${r.id}-${idx}`}
                center={[r.lat as number, r.lng as number]}
                radius={radius}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.18, weight: 0 }}
              />
            );
          })}
        
        {/* Render markers */}
        {reports.map((report) => {
          console.log("Kategori Report:", report.category); 
          
          return (
            <Marker 
              key={report.id} 
              position={[report.lat, report.lng]} 
              icon={icons[report.category?.toUpperCase()] || icons['DEFAULT']}
            >
              <Popup>
                <div className="text-xs font-bold">{report.category}</div>
                <div className="text-[10px]">{report.reporter}</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}