"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

export default function GalleryPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [filteredReports, setFilteredReports] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState("GUEST");
  const [satCoord, setSatCoord] = useState("SCANNING_DATABASE...");
  
  // State untuk Quick View Modal
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const fetchPhotos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let currentRole = "GUEST";

      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profile) {
          currentRole = profile.role;
          setUserRole(profile.role);
        }
      }

      const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });

      if (data) {
        if (currentRole === 'ADMIN') {
          setReports(data);
          setFilteredReports(data);
        } else {
          const categories = ["ILEGAL LOGGING", "KEBAKARAN HUTAN", "PERBURUAN SATWA"];
          const samples = categories.map(cat => 
            data.find(r => r.category.toUpperCase() === cat.toUpperCase())
          ).filter(Boolean);
          setReports(samples);
          setFilteredReports(samples);
        }
      }
      setLoading(false);
    };

    fetchPhotos();
    const timer = setInterval(() => {
      setSatCoord(`VAULT-ID-${Math.random().toString(36).substring(7).toUpperCase()} | UPLINK: STABLE | ACCESS: ${userRole === 'ADMIN' ? 'GRANTED' : 'RESTRICTED'}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [userRole]);

  const handleFilter = (cat: string) => {
    setSelectedCategory(cat);
    setFilteredReports(cat === "ALL" ? reports : reports.filter(r => r.category.toUpperCase() === cat.toUpperCase()));
  };

  const getCategoryColor = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'KEBAKARAN HUTAN': return 'bg-red-500';
      case 'ILEGAL LOGGING': return 'bg-emerald-500';
      case 'PERBURUAN SATWA': return 'bg-orange-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans selection:bg-emerald-500">
      
      {/* 1. TOP STATS COUNTER (PROFESSIONAL LOOK) */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Archives', value: '1,429', color: 'text-emerald-500' },
          { label: 'Active Sensors', value: '84', color: 'text-blue-500' },
          { label: 'Threat Level', value: 'LOW', color: 'text-yellow-500' },
          { label: 'System Integrity', value: '99.9%', color: 'text-emerald-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/30 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
            <div className={`text-xl font-black ${stat.color} tracking-tighter`}>{stat.value}</div>
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* HEADER FEED */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center bg-slate-900/50 border border-white/5 px-6 py-2 rounded-2xl shadow-2xl gap-4">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase italic shrink-0">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 
            System Status:
          </div>
          <div className="flex-grow overflow-hidden px-6 w-full">
            <div className="animate-marquee text-[9px] font-mono text-emerald-500/40 font-bold uppercase whitespace-nowrap tracking-widest text-center md:text-left">
              {isMounted ? satCoord : "CONNECTING..."} — {userRole === 'ADMIN' ? 'FULL_ARCHIVE_ACCESS' : 'PREVIEW_MODE_ONLY'} — ACEH_GREEN_PORTAL
            </div>
          </div>
          <Link href="/" className="bg-emerald-600/10 hover:bg-emerald-500 text-emerald-500 hover:text-black px-6 py-1.5 rounded-full text-[9px] font-black transition-all border border-emerald-500/20 uppercase">
            ← Exit Vault
          </Link>
      </div>

      {/* TITLE & FILTERS */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-3">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
                Media <span className="text-emerald-500 underline decoration-white/10 underline-offset-8">Vault</span>
                </h1>
                {userRole !== 'ADMIN' && (
                    <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-[8px] font-black animate-pulse">
                        PREVIEW MODE
                    </span>
                )}
            </div>
            <p className="text-[10px] font-black text-slate-600 tracking-[0.5em] uppercase mt-2">Historical Evidence Intelligence Records</p>
          </div>

          <div className="flex gap-2 flex-wrap justify-end">
            {["ALL", "ILEGAL LOGGING", "KEBAKARAN HUTAN", "PERBURUAN SATWA"].map((cat) => (
              <button 
                key={cat}
                onClick={() => handleFilter(cat)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black border transition-all ${
                  selectedCategory === cat 
                  ? 'bg-emerald-500 border-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                  : 'bg-white/5 border-white/10 text-slate-500 hover:border-emerald-500/50 hover:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
      </div>

      <hr className="max-w-7xl mx-auto border-white/5 mb-12" />

      {/* GALLERY GRID */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="w-1/2 h-full bg-emerald-500 animate-[loading_1s_ease-in-out_infinite]"></div>
          </div>
          <span className="text-[9px] font-mono text-emerald-500 tracking-[0.5em]">DECRYPTING_DATA...</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
          {filteredReports.map((r) => (
            <div 
              key={r.id} 
              onClick={() => setSelectedReport(r)}
              className="group bg-slate-900/40 rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all duration-500 shadow-xl flex flex-col backdrop-blur-sm relative cursor-pointer"
            >
              
              <div className="aspect-[4/5] overflow-hidden relative">
                {/* 2. SCANNER LINE ANIMATION */}
                <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-full h-[2px] bg-emerald-400 shadow-[0_0_15px_#34d399] absolute top-0 animate-[scan_3s_linear_infinite]"></div>
                </div>

                <img 
                  src={r.image_url} 
                  alt={r.category} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80" />
                
                {/* Intelligence Metadata overlay */}
                <div className="absolute top-4 left-4 font-mono text-[7px] text-white/40 group-hover:text-emerald-400 transition-colors uppercase">
                    ID: {r.id.substring(0,8)}<br/>
                    LAT: 4.6951° N<br/>
                    LNG: 96.7494° E
                </div>

                <div className="absolute bottom-6 left-6">
                   <span className={`text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg ${getCategoryColor(r.category)}`}>
                    {r.category}
                  </span>
                </div>
              </div>
              
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <h3 className="text-white font-black text-sm uppercase truncate tracking-tighter group-hover:text-emerald-400 transition-colors">
                    {r.reporter}
                  </h3>
                  <div className="text-right">
                    <div className="text-[8px] font-mono text-slate-600 leading-none">TIMESTAMP</div>
                    <div className="text-[10px] font-black text-slate-400">{new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-2">
                  "{r.description || 'No digital signature recorded in central archive'}"
                </p>
                <div className="flex items-center gap-2 text-[8px] font-black text-emerald-500/50 uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Verified Record
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. QUICK VIEW MODAL (PROFESSIONAL FEATURE) */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh]">
                <div className="md:w-3/5 h-1/2 md:h-full relative bg-black">
                    <img src={selectedReport.image_url} className="w-full h-full object-contain" />
                    <div className="absolute top-8 left-8 flex gap-2">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryColor(selectedReport.category)}`}>
                            {selectedReport.category}
                        </span>
                    </div>
                </div>
                <div className="md:w-2/5 p-8 md:p-12 flex flex-col justify-between overflow-y-auto border-t md:border-t-0 md:border-l border-white/5">
                    <div>
                        <div className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4 italic">Intelligence_Report</div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">{selectedReport.reporter}</h2>
                        <p className="text-slate-600 text-[11px] font-mono mb-8 italic uppercase">Logged: {new Date(selectedReport.created_at).toLocaleString()}</p>
                        
                        <div className="space-y-6 text-slate-400 text-sm leading-relaxed font-light italic border-l-2 border-emerald-500/20 pl-6">
                            "{selectedReport.description || 'System generated: No additional description provided by field agent.'}"
                        </div>
                    </div>

                    <div className="mt-12 space-y-4">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div className="text-[8px] text-slate-600 font-black uppercase mb-2 tracking-[0.2em]">Data Integrity Check</div>
                            <div className="flex items-center gap-3">
                                <div className="h-1 flex-grow bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[98%]"></div>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-500">98% AUTHENTIC</span>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedReport(null)}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95"
                        >
                            Close Archive
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* FOOTER & CTA */}
      {userRole !== 'ADMIN' && !loading && (
        <div className="max-w-7xl mx-auto mb-20 p-12 rounded-[3rem] border border-emerald-500/20 bg-emerald-500/5 text-center relative overflow-hidden group">
            <div className="relative z-10">
                <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Access Restricted Archive?</h4>
                <p className="text-emerald-500/60 font-mono text-[10px] uppercase tracking-[0.3em] mb-8 max-w-xl mx-auto">
                    Public access is limited to category samples. Secure your credential to view full geographical data and forensic logs.
                </p>
                <Link href="/login" className="inline-block px-10 py-4 bg-emerald-500 text-black font-black text-[10px] uppercase tracking-[0.3em] rounded-full hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all">
                    Establish Connection →
                </Link>
            </div>
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <div className="h-full w-full bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]"></div>
            </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}