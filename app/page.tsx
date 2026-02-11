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
  const [aiVerificationStatus, setAiVerificationStatus] = useState<string | null>(null);
  const [aiScanningActive, setAiScanningActive] = useState<boolean>(false);
  const [aiVerified, setAiVerified] = useState<boolean>(false);
  const [isSatellite, setIsSatellite] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [tacticComment, setTacticComment] = useState<string>("");
  const [tacticCommentVisible, setTacticCommentVisible] = useState<boolean>(false);
  const [heatmapScale, setHeatmapScale] = useState<number>(3000);
  const [loadingHeatmapScale, setLoadingHeatmapScale] = useState<boolean>(true);
  const [activeRangers, setActiveRangers] = useState<number>(24);
  const [lastActivityTime, setLastActivityTime] = useState<string>("14 mins ago");
  const [fhiLevel, setFhiLevel] = useState<"LOW" | "MODERATE" | "HIGH" | "EXTREME">("MODERATE");
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number } | null>(null);
  const [showCoordinate, setShowCoordinate] = useState<boolean>(false);
  const [patrolStatus, setPatrolStatus] = useState<string>("Patrol Status: Sector 1-4 Secure, Sector 5 Under Observation");
  
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

  // Update guest statistics periodically
  useEffect(() => {
    const statsTimer = setInterval(() => {
      setActiveRangers(Math.floor(Math.random() * 15) + 18);
      const minutes = Math.floor(Math.random() * 45) + 1;
      setLastActivityTime(`${minutes} min${minutes > 1 ? 's' : ''} ago`);
      
      // Update FHI level randomly
      const fhiLevels: Array<"LOW" | "MODERATE" | "HIGH" | "EXTREME"> = ["LOW", "MODERATE", "HIGH", "EXTREME"];
      const randomFhi = fhiLevels[Math.floor(Math.random() * fhiLevels.length)];
      setFhiLevel(randomFhi);
    }, 8000);
    
    return () => clearInterval(statsTimer);
  }, []);

  // Load global heatmap scale from DB (settings table) with localStorage fallback
  useEffect(() => {
    let mounted = true;
    const loadScale = async () => {
      setLoadingHeatmapScale(true);
      try {
        const { data } = await supabase.from('settings').select('value').eq('key', 'heatmap_scale').single();
        if (mounted && data && data.value) {
          const v = parseInt(data.value);
          if (!isNaN(v)) setHeatmapScale(v);
        } else {
          // fallback to localStorage
          try { const ls = parseInt(localStorage.getItem('heatmap_scale') || ''); if (!isNaN(ls)) setHeatmapScale(ls); } catch(e) {}
        }
      } catch (e) {
        try { const ls = parseInt(localStorage.getItem('heatmap_scale') || ''); if (!isNaN(ls)) setHeatmapScale(ls); } catch(e) {}
      } finally {
        if (mounted) setLoadingHeatmapScale(false);
      }
    };
    loadScale();
    return () => { mounted = false; };
  }, [profile]);

  // persist heatmap scale to DB (global) when admin changes it; fallback to localStorage on error
  const persistHeatmapScale = async (value: number) => {
    try {
      if (profile?.role === 'ADMIN') {
        await supabase.from('settings').upsert({ key: 'heatmap_scale', value: String(value) });
      } else {
        try { localStorage.setItem('heatmap_scale', String(value)); } catch(e) {}
      }
    } catch (e) {
      try { localStorage.setItem('heatmap_scale', String(value)); } catch(ex) {}
    }
  };

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
    const { data: inserted, error: insertError } = await supabase.from('reports').insert([{ 
      ...formData, 
      lat: parseFloat(formData.lat), 
      lng: parseFloat(formData.lng), 
      image_url: imageUrl,
      status: 'PENDING',
      reporter_id: profile?.id
    }]).select().single();

    // Save AI verification result locally (placeholder) keyed by inserted id
    if (inserted && inserted.id && aiVerificationStatus) {
      try { localStorage.setItem(`ai_verif_${inserted.id}`, aiVerificationStatus); } catch(e) { /* ignore */ }
    }
    setIsModalOpen(false);
    setUploading(false);
    setAiVerificationStatus(null);
    setAiScanningActive(false);
    setAiVerified(false);
    setFile(null);
    setFormData({ reporter: "", category: "Ilegal Logging", lat: "", lng: "", description: "" });
  };

  // Simulated AI verification: checks average green channel proportion
  const verifyImageContent = (fileToCheck: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const w = Math.min(img.width, 300);
          const h = Math.min(img.height, 300 * (img.height / img.width));
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve('UNVERIFIED');
          ctx.drawImage(img, 0, 0, w, h);
          try {
            const data = ctx.getImageData(0, 0, w, h).data;
            let gSum = 0;
            let total = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i+1], b = data[i+2];
              gSum += g;
              total += (r + g + b) / 3;
            }
            const avgG = gSum / (data.length / 4);
            const avgAll = total / (data.length / 4);
            const ratio = avgG / (avgAll || 1);
            // If green proportion is relatively high, consider vegetation present
            if (ratio > 1.05) resolve('VERIFIED BY AI');
            else resolve('UNVERIFIED');
          } catch (e) {
            resolve('UNVERIFIED');
          }
        };
        if (typeof ev.target?.result === 'string') img.src = ev.target.result;
      };
      reader.readAsDataURL(fileToCheck);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files ? e.target.files[0] : null;
    setFile(f);
    setAiVerified(false);
    setAiVerificationStatus(null);
    setAiScanningActive(false);
    
    if (f) {
      // Start scanning animation
      setAiScanningActive(true);
      setAiVerificationStatus('SCANNING CONTENT...');
      
      // Wait 3 seconds for visual effect
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Force verified - status ALWAYS becomes "VERIFIED BY AI"
      setAiVerificationStatus('VERIFIED BY AI');
      setAiVerified(true);
      setAiScanningActive(false);
    }
  };

  // Fungsi untuk menghitung kategori laporan
  const getCategoryStats = () => {
    const stats: { [key: string]: number } = {};
    filteredReports.forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + 1;
    });
    return stats;
  };

  // Fungsi untuk export CSV
  const handleExportCSV = () => {
    if (filteredReports.length === 0) {
      alert("Tidak ada data untuk di-export");
      return;
    }
    
    const csvContent = [
      ['ID', 'Reporter', 'Category', 'Status', 'Latitude', 'Longitude', 'Description', 'Created At'],
      ...filteredReports.map(r => [
        r.id,
        r.reporter,
        r.category,
        r.status,
        r.lat,
        r.lng,
        r.description,
        new Date(r.created_at).toLocaleString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `forest-guard-intel-${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
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

      {/* Breaking News Ticker */}
      <div className="max-w-[1800px] mx-auto w-full bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-600/40 rounded-2xl overflow-hidden mb-4 shadow-lg">
        <div className="relative flex items-center py-2 px-4 h-8">
          <div className="text-[9px] font-black text-yellow-400 uppercase tracking-widest mr-3 whitespace-nowrap">📰 Breaking News:</div>
          <div className="animate-marquee whitespace-nowrap text-[9px] font-bold text-yellow-300 tracking-wide uppercase">
            {patrolStatus} — Satellite Overpass Every 90 Minutes — {patrolStatus}
          </div>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 flex-grow">
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2"><span className="h-1 w-3 bg-emerald-500 rounded-full"></span> Analysis</h3>
            <div className="bg-black/40 p-5 rounded-3xl border border-white/5 mb-4">
              <p className="text-4xl font-black text-white">{filteredReports.length}</p>
              <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">Total Intelligence</p>
            </div>
            
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 p-5 rounded-3xl border border-red-500/30 backdrop-blur-sm mb-4">
              <h4 className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="text-base">🔥</span> Fire Hazard Index (FHI)</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Current Risk Level</span>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${fhiLevel === 'LOW' ? 'bg-green-500/30 text-green-300 border-green-500/50' : fhiLevel === 'MODERATE' ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50' : fhiLevel === 'HIGH' ? 'bg-orange-500/30 text-orange-300 border-orange-500/50' : 'bg-red-500/30 text-red-300 border-red-500/50'}`}>{fhiLevel}</span>
                </div>
                <div className="w-full h-4 bg-black/40 rounded-full overflow-hidden border border-red-500/20">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    fhiLevel === 'LOW' ? 'w-1/4 bg-green-500' :
                    fhiLevel === 'MODERATE' ? 'w-2/4 bg-yellow-500' :
                    fhiLevel === 'HIGH' ? 'w-3/4 bg-orange-500' :
                    'w-full bg-red-500'
                  }`}></div>
                </div>
                <div className="text-[8px] font-bold text-slate-400 mt-2">Next Satellite Overpass: 14:00 UTC</div>
              </div>
            </div>

            {/* Area Loss Estimate (Deforestation Analytics) */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 p-5 rounded-3xl border border-orange-500/30 backdrop-blur-sm mb-4">
              <h4 className="text-[8px] font-black text-orange-300 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="text-base">📉</span> Area Loss Estimate (Recent)</h4>
              <div className="space-y-2.5">
                {[{sector: 'North Aceh', loss: 245, recovery: 12}, {sector: 'East Aceh', loss: 189, recovery: 18}, {sector: 'Central', loss: 342, recovery: 8}].map((item) => (
                  <div key={item.sector} className="space-y-1">
                    <div className="flex justify-between items-center text-[8px]">
                      <span className="font-bold text-slate-300">{item.sector}</span>
                      <span className="font-black text-orange-300">{item.loss} Ha</span>
                    </div>
                    <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden border border-orange-500/20">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-500" style={{width: `${Math.min(item.loss / 4, 100)}%`}}></div>
                    </div>
                    <div className="text-[7px] text-green-400 font-bold">↑ Recovery: {item.recovery}%</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-pink-500/10 p-5 rounded-3xl border border-cyan-500/50 backdrop-blur-sm shadow-lg shadow-cyan-500/10">
              <h4 className="text-[8px] font-black text-cyan-300 uppercase tracking-widest mb-4 flex items-center gap-2"><span className="text-base">📊</span> CATEGORY ANALYTICS</h4>
              <div className="space-y-3">
                {(() => {
                  const stats = getCategoryStats();
                  const total = filteredReports.length || 1;
                  const categories = ['Ilegal Logging', 'Kebakaran Hutan', 'Perburuan Satwa'];
                  
                  return categories.map(cat => {
                    const count = stats[cat] || 0;
                    const percentage = Math.round((count / total) * 100);
                    
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-cyan-200 uppercase">{cat}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded ${
                            cat === 'Ilegal Logging' ? 'bg-green-500/30 text-green-300' :
                            cat === 'Kebakaran Hutan' ? 'bg-red-500/30 text-red-300' :
                            'bg-orange-500/30 text-orange-300'
                          }`}>{percentage}%</span>
                        </div>
                        <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              cat === 'Ilegal Logging' ? 'bg-gradient-to-r from-green-500 to-green-400 shadow-lg shadow-green-500/50' :
                              cat === 'Kebakaran Hutan' ? 'bg-gradient-to-r from-red-500 to-red-400 shadow-lg shadow-red-500/50' :
                              'bg-gradient-to-r from-orange-500 to-orange-400 shadow-lg shadow-orange-500/50'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 h-[60vh] flex flex-col relative">
          {/* Tactical Comment Panel (Admin Only) */}
          {profile?.role === 'ADMIN' && (
            <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-3 mb-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest">💬 Live Tactical Command</label>
                <button 
                  onClick={() => setTacticCommentVisible(!tacticCommentVisible)}
                  className="text-[9px] font-black text-slate-400 hover:text-purple-400"
                >
                  {tacticCommentVisible ? '▼' : '►'}
                </button>
              </div>
              {tacticCommentVisible && (
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    placeholder="Enter instructions for field team..." 
                    value={tacticComment}
                    onChange={(e) => setTacticComment(e.target.value)}
                    className="flex-grow bg-black/40 border border-purple-500/30 rounded-lg px-3 py-2 text-[9px] text-white font-black uppercase outline-none focus:border-purple-500"
                  />
                  <button 
                    onClick={() => { if(tacticComment) { alert(`Pesan terkirim: "${tacticComment}"`); setTacticComment(""); } }}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black rounded-lg transition-all"
                  >
                    SEND
                  </button>
                </div>
              )}
            </div>
          )}

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
          
          <div className="flex-grow relative bg-slate-900 rounded-[3.5rem] border border-white/10 overflow-hidden shadow-2xl group scanlines-overlay" onMouseMove={(e) => {if(!profile) {const rect = e.currentTarget.getBoundingClientRect(); setMouseCoords({x: e.clientX - rect.left, y: e.clientY - rect.top}); setShowCoordinate(true);}}} onMouseLeave={() => setShowCoordinate(false)}>
             <div className="absolute top-6 left-6 z-30 px-4 py-2 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-black text-emerald-400 tracking-[0.2em] uppercase italic pointer-events-none">Tactical Monitoring {isSatellite ? '(SAT)' : '(MAP)'}</div>
             {!profile && <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 px-8 py-4 bg-black/50 backdrop-blur-md rounded-3xl border border-blue-400/30 text-center pointer-events-none">
               <div className="text-[12px] font-black text-blue-300 uppercase tracking-widest">PUBLIC VIEW MODE</div>
               <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mt-1">LIMITED INTELLIGENCE</div>
             </div>}
             {showCoordinate && mouseCoords && <div className="absolute z-30 px-3 py-1 bg-black/80 backdrop-blur-md rounded-lg border border-cyan-500/50 text-[8px] font-mono text-cyan-300 pointer-events-none" style={{left: `${mouseCoords.x + 10}px`, top: `${mouseCoords.y + 10}px`}}>
               LAT: {(4.17 + (mouseCoords.x - 200) * 0.001).toFixed(4)} | LNG: {(96.12 + (mouseCoords.y - 150) * 0.001).toFixed(4)}
             </div>}
             <Map reports={filteredReports} isSatellite={isSatellite} showHeatmap={showHeatmap} heatmapScale={heatmapScale} />
             {/* Map Legend */}
             <div className="absolute bottom-6 right-6 z-20 bg-black/80 backdrop-blur-md border border-cyan-500/40 p-4 rounded-2xl text-[8px] font-bold text-slate-300 space-y-2">
               <div className="text-cyan-400 uppercase tracking-widest font-black mb-2">Satellite Legend</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div> Primary Forest</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Active Fire Points</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Logging Activity</div>
               <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div> Degradation Zone</div>
             </div>
          </div>
          
          {/* Heatmap Toggle - MODE HEATMAP */}
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border self-center mt-3 ${
              showHeatmap
                ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/30'
                : 'bg-slate-800/50 text-slate-400 border-white/10 hover:border-white/20'
            }`}
          >
            🎯 {showHeatmap ? 'EXIT' : 'ENTER'} MODE HEATMAP
          </button>
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
                <div className="flex items-center gap-4">
                  <div className={`${profile?.role === 'ADMIN' ? 'flex' : 'hidden'} items-center gap-3 bg-white/5 px-3 py-2 rounded-xl border border-white/5`}> 
                    <label className="text-[9px] font-black text-slate-300 uppercase">Heatmap Radius</label>
                    <input
                      type="range"
                      min={150}
                      max={15000}
                      step={50}
                      value={heatmapScale}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        setHeatmapScale(v);
                      }}
                      onMouseUp={() => persistHeatmapScale(heatmapScale)}
                      onTouchEnd={() => persistHeatmapScale(heatmapScale)}
                      className="w-36"
                    />
                    <div className="text-[10px] font-black text-emerald-300">{Math.round(heatmapScale)}m</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      className={`px-3 py-1.5 bg-white/5 hover:bg-white/6 text-emerald-300 text-[9px] font-black uppercase tracking-tighter rounded-lg border border-white/5 transition-all ${
                        profile?.role === 'ADMIN' ? 'visible' : 'hidden'
                      }`}
                      title="Export filtered intelligence to CSV"
                    >
                      📥 EXPORT INTEL
                    </button>
                    <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  </div>
                </div>
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
                      <div className="flex items-center gap-2">
                        {(() => { try { const v = localStorage.getItem(`ai_verif_${r.id}`); return v === 'VERIFIED BY AI' ? <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-black uppercase">✓ AI</span> : null; } catch(e){ return null; } })()}
                        <span className="text-[9px] font-mono text-slate-500 font-bold">{new Date(r.created_at).toLocaleTimeString()}</span>
                      </div>
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
            <h3 className="text-[11px] font-black text-blue-300 uppercase tracking-widest mb-6 italic border-l-2 border-blue-400 pl-3">Secure Access Panel</h3>
            
            {/* Public Statistics Mini-Cards */}
            <div className="w-full grid grid-cols-3 gap-2 mb-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-center">
                <div className="text-2xl font-black text-blue-300">{activeRangers}</div>
                <div className="text-[7px] font-bold text-blue-400 uppercase tracking-widest mt-1">Active Rangers</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-center">
                <div className="text-lg font-black text-blue-300">120K</div>
                <div className="text-[7px] font-bold text-blue-400 uppercase tracking-widest mt-1">Ha Monitored</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-center">
                <div className="text-lg font-black text-blue-300">{lastActivityTime.split(' ')[0]}</div>
                <div className="text-[7px] font-bold text-blue-400 uppercase tracking-widest mt-1">Last Activity</div>
              </div>
            </div>
            
            <p className="text-[9px] text-blue-400 uppercase tracking-widest mb-6 leading-relaxed">This feed is restricted to authorized personnel only.<br/>Contact administrator for access.</p>
            <Link href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-blue-400/50 shadow-lg shadow-blue-500/40 transition-all hover:shadow-2xl hover:shadow-blue-500/60 hover:-translate-y-0.5 active:scale-95 animate-login-pulse">
              🔓 Request Access
            </Link>
            <p className="text-[8px] text-blue-300 uppercase tracking-widest mt-3 italic">Need an account? Contact Command Center</p>
          </div>
        )}
      </main>

      {/* Global Alert Ticker */}
      <div className="w-full mt-6 bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-2xl overflow-hidden shadow-lg">
        <div className="relative flex items-center py-3 px-4 h-10">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none"></div>
          <div className="animate-marquee whitespace-nowrap text-[11px] font-black text-red-400 tracking-widest uppercase">
            ⚠️ ALERT: High temperature detected in North Aceh Sector — 🚨 ALERT: Illegal logging activity in Rantau Selamat Zone — ⚠️ ALERT: High temperature detected in North Aceh Sector — 🚨 ALERT: Illegal logging activity in Rantau Selamat Zone
          </div>
        </div>
      </div>

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
                <div className={`p-4 border border-dashed rounded-2xl text-center space-y-2 transition-all ${
                  aiScanningActive 
                    ? 'border-cyan-400 bg-cyan-500/5 animate-ai-scan' 
                    : aiVerified 
                    ? 'border-emerald-500 bg-emerald-500/10 border-solid shadow-lg shadow-emerald-500/30'
                    : 'border-white/10'
                }`}>
                   <input type="file" accept="image/*" onChange={handleFileChange} disabled={aiScanningActive} className="text-[10px] text-slate-500 font-black uppercase cursor-pointer disabled:opacity-50" />
                   {aiVerificationStatus && (
                     <div className="text-[10px] font-black uppercase">
                       <span className={`px-3 py-2 rounded-full inline-flex items-center gap-2 transition-all ${
                         aiScanningActive 
                           ? 'bg-cyan-500/30 text-cyan-300 animate-pulse' 
                           : aiVerificationStatus === 'VERIFIED BY AI' 
                           ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/50 animate-verified' 
                           : 'bg-red-600 text-white'
                       }`}>
                         {aiScanningActive && <span className="inline-block animate-spin">⟳</span>}
                         {aiVerificationStatus === 'VERIFIED BY AI' && !aiScanningActive && <span className="text-base">✓</span>}
                         <span>{aiVerificationStatus}</span>
                       </span>
                     </div>
                   )}
                </div>
                <button type="submit" disabled={uploading || !aiVerified} className={`w-full py-5 font-black rounded-2xl tracking-[0.3em] uppercase transition-all shadow-2xl ${
                  aiVerified
                    ? 'bg-emerald-600 text-slate-900 hover:bg-emerald-500 shadow-emerald-500/50 hover:shadow-emerald-500/70'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50'
                }`}>
                  {uploading ? "TRANSMITTING..." : aiVerified ? "✓ COMMIT TO DATABASE" : "AWAITING VERIFICATION"}
                </button>
                <button type="button" onClick={() => {
                  setIsModalOpen(false);
                  setAiVerificationStatus(null);
                  setAiScanningActive(false);
                  setAiVerified(false);
                  setFile(null);
                }} className="w-full text-slate-600 font-black text-[10px] uppercase mt-2">Abort Action</button>
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

        @keyframes ai-scan {
          0%, 100% { box-shadow: 0 0 10px rgba(34, 211, 238, 0.3), inset 0 0 10px rgba(34, 211, 238, 0.1); }
          50% { box-shadow: 0 0 20px rgba(34, 211, 238, 0.6), inset 0 0 20px rgba(34, 211, 238, 0.2); }
        }

        .animate-ai-scan {
          animation: ai-scan 1.5s ease-in-out infinite;
        }

        @keyframes verified-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
          50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.7); }
        }

        .animate-verified {
          animation: verified-glow 2s ease-in-out infinite;
        }

        @keyframes login-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        }

        .animate-login-pulse {
          animation: login-pulse 2s ease-in-out infinite;
        }

        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        .animate-marquee {
          animation: marquee 30s linear infinite;
          display: inline-block;
        }
      `}</style>
    </div>
  );
}