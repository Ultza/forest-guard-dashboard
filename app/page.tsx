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
  const [isSatellite, setIsSatellite] = useState(true);
  
  const [currentTime, setCurrentTime] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState({ reporter: "", category: "Ilegal Logging", lat: "", lng: "", description: "" });
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fungsi Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setProfile(null);
      } else {
        fetchProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchReports();

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    const channel = supabase
      .channel('forest-updates')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'reports' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReports((current) => [payload.new, ...current]);
            if (profile?.role === 'ADMIN' || profile?.role === 'PEMANTAU') {
               const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
               audio.play().catch(() => console.log("Audio play blocked"));
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            fetchReports();
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [profile]);

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
    if (data) setReports(data);
  }

  const updateReportStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ 
        status: newStatus,
        handler_id: profile?.id,
        admin_note: newStatus === 'DIKUNJUNGI' ? `Diproses oleh ${profile?.full_name}` : null
      })
      .eq('id', id);

    if (error) alert("Gagal memperbarui status");
    else fetchReports();
  };

  const handleAdminReject = async (id: string) => {
    const note = prompt("Alasan penolakan laporan:");
    if (note) {
      await supabase
        .from('reports')
        .update({ status: 'DIKUNJUNGI', admin_note: note })
        .eq('id', id);
      fetchReports();
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData({ ...formData, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
      });
    }
  };

  const handleDelete = async (id: any) => {
    if (profile?.role !== 'ADMIN') return alert("Hanya Admin yang bisa menghapus");
    if (confirm("🚨 DELETE PERMANENTLY?")) {
      await supabase.from('reports').delete().eq('id', id);
      fetchReports();
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
    await supabase.from('reports').insert([{ 
      ...formData, 
      lat: parseFloat(formData.lat), 
      lng: parseFloat(formData.lng), 
      image_url: imageUrl,
      status: 'PENDING',
      reporter_id: profile?.id
    }]);
    setIsModalOpen(false);
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-6 font-sans flex flex-col selection:bg-emerald-500">
      
      {/* STATUS BAR */}
      <div className="flex justify-between items-center bg-slate-900/80 border border-white/5 px-6 py-2 rounded-2xl mb-4 backdrop-blur-xl shadow-2xl">
        <div className="flex gap-6 text-[9px] font-black tracking-widest text-emerald-500 uppercase italic">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> Live Satellite Feed
          </span>
          <span className="text-slate-500">Access: <span className={`text-white ${
            loading ? '' : (profile?.role === 'ADMIN' || profile?.role === 'PEMANTAU' ? 'text-emerald-400' : 'text-blue-400')
          }`}>{loading ? "VERIFYING..." : (profile?.role || 'GUEST')}</span></span>
          {profile && (
            <button onClick={handleLogout} className="text-red-500 hover:text-red-400 border-l border-white/10 pl-6">LOGOUT</button>
          )}
        </div>
        <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
          Aceh Local Time: <span className="text-white bg-emerald-500/10 px-2 py-1 rounded ml-2 font-black">
            {isMounted ? currentTime : "Syncing..."}
          </span>
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
          <input placeholder="Search Agent/Intel..." className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-emerald-500 w-full md:w-56 font-bold text-white uppercase" onChange={(e) => setSearchTerm(e.target.value)} />
          <select className="bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-emerald-400 uppercase cursor-pointer" onChange={(e) => setSelectedCat(e.target.value)}>
            <option value="All">All Sectors</option>
            <option>Ilegal Logging</option>
            <option>Kebakaran Hutan</option>
            <option>Perburuan Satwa</option>
          </select>
          <div className="flex gap-2 ml-auto md:ml-0">
            {!profile && <Link href="/login" className="bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Login</Link>}
            <Link href="/gallery" className="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black border border-blue-600/20 uppercase tracking-widest transition-all">Gallery</Link>
            <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-slate-900 px-6 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-500/20 uppercase tracking-widest transition-all hover:-translate-y-0.5">+ LAPOR BARU</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><span className="h-1 w-3 bg-emerald-500 rounded-full"></span> Analysis</h3>
            <div className="bg-black/40 p-5 rounded-3xl border border-white/5 mb-4">
              <p className="text-4xl font-black text-white">{filteredReports.length}</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">Total Intelligence</p>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-5 rounded-3xl border border-emerald-500/30 backdrop-blur-sm">
              <h4 className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="text-base">🌡️</span> Environmental Status</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-emerald-500/20">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Temperature</span>
                  <span className="text-xl font-black text-emerald-400">32°C</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-emerald-500/20">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Fire Risk Index</span>
                  <span className="px-3 py-1 bg-emerald-500/30 text-emerald-300 rounded-full text-[9px] font-black uppercase border border-emerald-500/50">MODERATE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 h-[60vh] flex flex-col relative">
          {/* Satellite Toggle */}
          <div className="flex items-center justify-center gap-3 px-4 py-3 z-10 relative">
            <button
              onClick={() => setIsSatellite(true)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                isSatellite
                  ? 'bg-emerald-600 text-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              🛰️ Satellite View
            </button>
            <button
              onClick={() => setIsSatellite(false)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                !isSatellite
                  ? 'bg-blue-600 text-slate-900 border-blue-500 shadow-lg shadow-blue-500/30'
                  : 'bg-slate-800/50 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              🗺️ Map View
            </button>
          </div>
          
          <div className="flex-grow relative bg-slate-900 rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl group scanlines-overlay">
             <div className="absolute top-6 left-6 z-30 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-emerald-400 tracking-[0.2em] uppercase italic pointer-events-none">Tactical Monitoring {isSatellite ? '(SAT)' : '(MAP)'}</div>
             <Map reports={filteredReports} isSatellite={isSatellite} />
          </div>
        </div>

        {/* FEED: RESTRICTED TO PERSONNEL */}
        {loading ? (
            <div className="lg:col-span-3 flex items-center justify-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-600">Syncing Intelligence...</div>
        ) : (profile?.role === 'ADMIN' || profile?.role === 'PEMANTAU') ? (
          <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
             <div className="flex justify-between items-center mb-4 px-3">
                <h2 className="text-[10px] font-black text-white uppercase tracking-widest italic">Live Intelligence <span className={`text-[9px] ml-2 ${
                  profile?.role === 'ADMIN' || profile?.role === 'PEMANTAU'
                    ? 'text-emerald-400'
                    : 'text-blue-400'
                }`}>({profile?.role})</span></h2>
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
             </div>
            
             <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow pb-10">
              {filteredReports.map((r) => (
                <div key={r.id} className={`bg-white/5 border border-white/5 p-5 rounded-[2rem] transition-all duration-300 group relative ${r.status === 'MENUNGGU_APPROVAL' ? 'border-orange-500/50 bg-orange-500/5' : ''}`}>
                  {profile?.role === 'ADMIN' && (
                    <button onClick={() => handleDelete(r.id)} className="absolute top-4 right-4 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-bold z-10">✕</button>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                        r.status === 'SELESAI' ? 'bg-emerald-500 text-black' : 
                        r.status === 'DIKUNJUNGI' ? 'bg-blue-500 text-white' : 
                        r.status === 'MENUNGGU_APPROVAL' ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {r.status || 'PENDING'}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 font-bold">{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>

                    <div className="flex gap-4 items-center">
                      <img src={r.image_url} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-white/5" />
                      <div className="min-w-0">
                        <h4 className="font-black text-white text-[12px] truncate uppercase tracking-tighter">{r.reporter}</h4>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-0.5">{r.category}</p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      {profile?.role === 'PEMANTAU' && r.status === 'PENDING' && (
                        <button onClick={() => updateReportStatus(r.id, 'DIKUNJUNGI')} className="w-full py-2 bg-blue-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">Kunjungi Lokasi</button>
                      )}
                      {profile?.role === 'PEMANTAU' && r.status === 'DIKUNJUNGI' && (
                        <button onClick={() => updateReportStatus(r.id, 'MENUNGGU_APPROVAL')} className="w-full py-2 bg-orange-600 text-white text-[9px] font-black rounded-xl uppercase tracking-widest">Selesaikan Laporan</button>
                      )}

                      {profile?.role === 'ADMIN' && r.status === 'MENUNGGU_APPROVAL' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => updateReportStatus(r.id, 'SELESAI')} className="py-2 bg-emerald-500 text-black text-[9px] font-black rounded-xl uppercase">Setujui</button>
                          <button onClick={() => handleAdminReject(r.id)} className="py-2 bg-red-600 text-white text-[9px] font-black rounded-xl uppercase">Tolak</button>
                        </div>
                      )}
                    </div>

                    {r.admin_note && <p className="text-[8px] text-orange-400 font-bold italic">Note: {r.admin_note}</p>}
                    <p className="text-[10px] text-slate-400 italic line-clamp-2 leading-relaxed bg-black/40 p-3 rounded-2xl border border-white/5">"{r.description}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 bg-gradient-to-br from-blue-900/20 to-cyan-900/10 p-8 rounded-3xl border-2 border-blue-500/30 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-2xl shadow-blue-500/10">
            <div className="mb-6 text-5xl animate-pulse">🔐</div>
            <h3 className="text-[11px] font-black text-blue-300 uppercase tracking-widest mb-3 italic border-l-2 border-blue-400 pl-3">Secure Access Panel</h3>
            <p className="text-[9px] text-blue-400 uppercase tracking-widest mb-1 font-bold">User Status: <span className="text-blue-400">GUEST</span></p>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-6 leading-relaxed">This feed is restricted to authorized personnel only.<br/>Contact administrator for access.</p>
            <Link href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-blue-400/50 shadow-lg shadow-blue-500/20 transition-all hover:shadow-lg hover:shadow-blue-500/40 hover:-translate-y-0.5">
              🔓 Request Access
            </Link>
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[9999] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[3.5rem] w-full max-w-xl relative shadow-2xl">
             <h3 className="text-2xl font-black text-white mb-8 tracking-tighter uppercase italic border-l-4 border-emerald-500 pl-4">Deploy Intelligence</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="AGENT NAME" value={formData.reporter} onChange={(e) => setFormData({...formData, reporter: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none text-xs font-bold text-white uppercase" />
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="LAT" value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 font-bold" />
                  <input required placeholder="LNG" value={formData.lng} onChange={(e) => setFormData({...formData, lng: e.target.value})} className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-xs font-mono text-emerald-400 font-bold" />
                </div>
                <button type="button" onClick={getLocation} className="w-full py-3 bg-emerald-500/5 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 uppercase tracking-widest">Get Coordinates</button>
                <select className="w-full p-4 rounded-2xl bg-slate-800 border border-white/10 text-xs font-black text-white uppercase" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                  <option>Ilegal Logging</option>
                  <option>Kebakaran Hutan</option>
                  <option>Perburuan Satwa</option>
                </select>
                <div className="p-4 border border-dashed border-white/10 rounded-2xl text-center">
                   <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} className="text-[10px] text-slate-500 font-black uppercase" />
                </div>
                <button type="submit" disabled={uploading} className="w-full py-5 bg-emerald-600 text-slate-900 font-black rounded-2xl tracking-[0.3em] uppercase hover:bg-emerald-500 shadow-2xl transition-all">
                  {uploading ? "TRANSMITTING..." : "COMMIT TO DATABASE"}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-slate-600 font-black text-[10px] uppercase mt-2">Abort Action</button>
             </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.2); border-radius: 10px; }
        
        .scanlines-overlay {
          position: relative;
        }
        
        .scanlines-overlay::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: repeating-linear-gradient(
            0deg,
            rgba(16, 185, 129, 0.08),
            rgba(16, 185, 129, 0.08) 2px,
            transparent 2px,
            transparent 4px
          );
          pointer-events: none;
          z-index: 20;
          border-radius: 3.5rem;
        }
        
        .scanlines-overlay > div:first-child {
          z-index: 21;
        }
      `}</style>
    </div>
  );
}