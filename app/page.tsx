"use client"
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const Map = dynamic(() => import('../components/Map'), { 
  ssr: false, 
  loading: () => <div className="h-full bg-slate-900 animate-pulse rounded-[2.5rem] flex items-center justify-center text-emerald-500 font-black tracking-widest uppercase text-[10px]">Syncing Satellite Data...</div>
});

export default function Dashboard() {
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [currentTime, setCurrentTime] = useState("");
  const [randomStats, setRandomStats] = useState<number[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({ reporter: "", category: "Ilegal Logging", lat: "", lng: "", description: "" });

  useEffect(() => {
    setIsMounted(true);
    fetchReports();
    
    setRandomStats([
      Math.floor(Math.random() * 90) + 10,
      Math.floor(Math.random() * 90) + 10,
      Math.floor(Math.random() * 90) + 10
    ]);

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    // FIX: LOGIKA REAL-TIME BARU
    const channel = supabase
      .channel('forest-updates')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'reports' }, 
        (payload) => {
          // Tambahkan data baru ke list secara instant
          setReports((current) => [payload.new, ...current]);
          
          // Bunyikan Alarm (Mixkit Alert)
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
          audio.play().catch(() => console.log("Klik layar sekali untuk aktifkan suara!"));
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let result = reports;
    if (selectedCat !== "All") result = result.filter(r => r.category === selectedCat);
    if (searchTerm) result = result.filter(r => 
      r.reporter.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredReports(result);
  }, [searchTerm, selectedCat, reports]);

  async function fetchReports() {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (data) {
      setReports(data);
    }
  }

  const exportToCSV = () => {
    const headers = ["Reporter,Category,Lat,Lng,Date,Description\n"];
    const rows = reports.map(r => `"${r.reporter}","${r.category}",${r.lat},${r.lng},"${new Date(r.created_at).toLocaleDateString()}","${r.description}"\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FOREST_GUARD_LOG.csv`;
    a.click();
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData({ ...formData, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
      });
    }
  };

  const handleDelete = async (id: any) => {
    if (confirm("🚨 DELETE PERMANENTLY?")) {
      await supabase.from('reports').delete().eq('id', id);
      setReports(reports.filter(r => r.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    let imageUrl = "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=500";
    if (file) {
      const fileName = `${Date.now()}-${file.name}`;
      const { data } = await supabase.storage.from('report-images').upload(fileName, file);
      if (data) {
        const { data: url } = supabase.storage.from('report-images').getPublicUrl(fileName);
        imageUrl = url.publicUrl;
      }
    }
    await supabase.from('reports').insert([{ ...formData, lat: parseFloat(formData.lat), lng: parseFloat(formData.lng), image_url: imageUrl }]);
    setIsModalOpen(false);
    setUploading(false);
    // Data akan terupdate otomatis via Channel Real-time di atas
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-6 font-sans flex flex-col selection:bg-emerald-500">
      
      {/* STATUS BAR */}
      <div className="flex justify-between items-center bg-slate-900/80 border border-white/5 px-6 py-2 rounded-2xl mb-4 backdrop-blur-xl shadow-2xl">
        <div className="flex gap-6 text-[9px] font-black tracking-widest text-emerald-500 uppercase italic">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Satellite Feed
          </span>
        </div>
        <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          Aceh Local Time: <span className="text-white bg-emerald-500/10 px-2 py-1 rounded ml-2 font-black">
            {isMounted ? currentTime : "Syncing..."}
          </span>
        </div>
      </div>

      {/* TICKER BAR */}
      <div className="max-w-[1800px] mx-auto w-full mt-2 mb-6">
        <div className="ticker bg-slate-900/60 border border-white/5 rounded-2xl px-4 py-2 text-emerald-400 uppercase text-[10px] font-black">
          <div className="ticker-track">
            <span className="mx-8">🔭 SATELLITE: ONLINE</span>
            <span className="mx-8">🔒 ENCRYPTED STORAGE</span>
            <span className="mx-8">↻ SYNC TIME: {isMounted ? currentTime : '---'}</span>
            <span className="mx-8">⚡ UPLINK: STABLE</span>
            <span className="mx-8">🛰️ TELEMETRY: ACTIVE</span>
            <span className="mx-8">—</span>
            {/* Duplicate items to create continuous loop */}
            <span className="mx-8">🔭 SATELLITE: ONLINE</span>
            <span className="mx-8">🔒 ENCRYPTED STORAGE</span>
            <span className="mx-8">↻ SYNC TIME: {isMounted ? currentTime : '---'}</span>
            <span className="mx-8">⚡ UPLINK: STABLE</span>
            <span className="mx-8">🛰️ TELEMETRY: ACTIVE</span>
          </div>
        </div>
      </div>

      <header className="max-w-[1800px] mx-auto w-full flex flex-col xl:flex-row justify-between items-center gap-6 mb-8 mt-2">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl shadow-inner group">
            <Image src="/Logo Apel.png" alt="Logo" width={55} height={55} className="group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
              Forest <span className="text-emerald-500 italic">Guard</span>
            </h1>
            <p className="text-[10px] font-black text-slate-600 tracking-[0.4em] uppercase mt-1">Yayasan Apel Green Aceh</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 p-3 rounded-3xl border border-white/5 w-full xl:w-auto shadow-2xl">
          <input 
            placeholder="Search Agent/Intel..." 
            className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500 w-full md:w-56 font-bold text-white uppercase" 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
          
          <select 
            className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-emerald-400 uppercase cursor-pointer" 
            onChange={(e) => setSelectedCat(e.target.value)}
          >
            <option value="All">All Sectors</option>
            <option>Ilegal Logging</option>
            <option>Kebakaran Hutan</option>
            <option>Perburuan Satwa</option>
          </select>

          <div className="flex gap-2 ml-auto md:ml-0">
            <Link href="/gallery" className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black border border-blue-600/20 uppercase tracking-widest transition-all">
              Gallery
            </Link>
            <button onClick={exportToCSV} className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black border border-white/10 uppercase tracking-widest transition-all">
              Export
            </button>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-500/20 uppercase tracking-widest transition-all hover:-translate-y-0.5"
            >
              + LAPOR BARU
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        
        {/* STATS */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="h-1 w-3 bg-emerald-500 rounded-full"></span> Distribution Analysis
            </h3>
            <div className="space-y-6">
              <div className="bg-black/40 p-5 rounded-3xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                <p className="text-4xl font-black text-white group-hover:text-emerald-400 transition-colors">{filteredReports.length}</p>
                <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">Total Laporan</p>
              </div>
              <div className="space-y-4 px-2">
                {['Logging', 'Fire', 'Hunting'].map((cat, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-tighter">
                      <span>{cat} Zone</span>
                      <span className="text-emerald-500 font-mono">{isMounted ? randomStats[i] : '0'}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500/40 rounded-full transition-all duration-1000" style={{width: isMounted ? `${randomStats[i]}%` : '0%'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MAP */}
        <div className="lg:col-span-6 h-[60vh] relative">
          <div className="absolute inset-0 bg-slate-900 rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl group">
             <div className="absolute top-6 left-6 z-10 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-emerald-400 tracking-[0.2em] uppercase">Tactical Monitoring</div>
             <Map reports={filteredReports} />
          </div>
        </div>

        {/* FEED */}
        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
           <div className="flex justify-between items-center mb-4 px-3">
              <h2 className="text-[10px] font-black text-white uppercase tracking-widest italic">Live Intelligence</h2>
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
           </div>
          
           <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow pb-10">
            {filteredReports.map((r) => (
              <div key={r.id} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] hover:bg-white/10 hover:border-emerald-500/20 transition-all duration-300 group relative">
                <button onClick={() => handleDelete(r.id)} className="absolute top-4 right-4 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold z-10">✕</button>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black bg-emerald-500 text-slate-900 px-3 py-1 rounded-full uppercase tracking-tighter">{r.category}</span>
                    <span className="text-[9px] font-mono text-slate-500 font-bold">{isMounted ? new Date(r.created_at).toLocaleTimeString() : '--:--'}</span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <img src={r.image_url} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/5 group-hover:ring-emerald-500/30 transition-all" />
                    <div className="min-w-0">
                      <h4 className="font-black text-white text-[12px] truncate uppercase tracking-tighter">{r.reporter}</h4>
                      <p className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">{r.lat}, {r.lng}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 italic leading-relaxed bg-black/40 p-3 rounded-2xl border border-white/5">"{r.description}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[9999] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[3.5rem] w-full max-w-xl relative overflow-hidden shadow-2xl">
             <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase italic border-l-4 border-emerald-500 pl-4">Deploy New Intelligence</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="AGENT NAME" value={formData.reporter} onChange={(e) => setFormData({...formData, reporter: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none text-xs font-bold text-white uppercase placeholder:text-slate-700" />
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="LAT" value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 font-bold" />
                  <input required placeholder="LNG" value={formData.lng} onChange={(e) => setFormData({...formData, lng: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 font-bold" />
                </div>
                <button type="button" onClick={getLocation} className="w-full py-3 bg-emerald-500/5 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-500/20 transition-all uppercase tracking-widest">Get Current Location</button>
                <select className="w-full p-4 rounded-2xl bg-slate-800 border border-white/10 text-xs font-black text-white uppercase" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option>Ilegal Logging</option>
                  <option>Pembukaan Lahan</option>
                  <option>Kebakaran Hutan</option>
                  <option>Perburuan Satwa</option>
                </select>
                <div className="p-4 border border-dashed border-white/10 rounded-2xl text-center">
                   <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="text-[10px] text-slate-500 font-black uppercase" />
                </div>
                <textarea placeholder="OBSERVATION DETAILS..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 h-24 text-xs font-medium text-white uppercase placeholder:text-slate-700" />
                <button type="submit" disabled={uploading} className="w-full py-5 bg-emerald-600 text-slate-900 font-black rounded-2xl tracking-[0.3em] uppercase hover:bg-emerald-500 shadow-2xl transition-all">
                  {uploading ? "TRANSMITTING..." : "COMMIT TO DATABASE"}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-600 font-black text-[10px] uppercase tracking-widest mt-2">Abort Action</button>
             </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
      `}</style>
    </div>
  );
}