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
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    
    const fetchPhotos = async () => {
      // Pastikan loading aktif sebelum fetch
      setLoading(true);
      
      try {
        // 1. Ambil User secara aman
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        let currentRole = "GUEST";

        // Hanya jika user ada dan tidak ada error auth
        if (user && !authError) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          if (profile && !profileError) {
            currentRole = profile.role || "GUEST";
          }
        }

        // Update state role secara aman
        setUserRole(currentRole);

        // 2. Ambil data laporan
        const { data: allReports, error: reportsError } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (!reportsError && allReports) {
          if (currentRole === 'ADMIN') {
            setReports(allReports);
            setFilteredReports(allReports);
          } else {
            // Guest Logic: Ambil contoh per kategori
            const categories = ["ILEGAL LOGGING", "KEBAKARAN HUTAN", "PERBURUAN SATWA"];
            const samples = categories.map(cat => 
              allReports.find(r => r.category?.toUpperCase() === cat)
            ).filter(Boolean);
            
            setReports(samples);
            setFilteredReports(samples);
          }
        }
      } catch (err) {
        console.error("Critical Exception:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();

    const timer = setInterval(() => {
      setSatCoord(`VAULT-ID-${Math.random().toString(36).substring(7).toUpperCase()} | UPLINK: STABLE | ACCESS: ${userRole === 'ADMIN' ? 'GRANTED' : 'RESTRICTED'}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [userRole]);

  // Fungsi pembantu warna kategori
  const getCategoryColor = (cat: string) => {
    switch (cat?.toUpperCase()) {
      case 'KEBAKARAN HUTAN': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
      case 'ILEGAL LOGGING': return 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]';
      case 'PERBURUAN SATWA': return 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]';
      default: return 'bg-slate-500';
    }
  };

  // Mencegah hydration error
  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 md:p-8 font-sans selection:bg-emerald-500">
      
      {/* 1. STATS COUNTER PANEL */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Intelligence Records', value: '1,429', color: 'text-emerald-500' },
          { label: 'Active Sensors', value: '84', color: 'text-blue-400' },
          { label: 'System Integrity', value: '99.9%', color: 'text-emerald-500' },
          { label: 'Threat Level', value: 'STABLE', color: 'text-slate-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl backdrop-blur-md">
            <div className={`text-xl font-black ${stat.color} tracking-tighter`}>{stat.value}</div>
            <div className="text-[7px] font-black text-slate-600 uppercase tracking-[0.3em]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* HEADER STATUS BAR */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center bg-slate-900/50 border border-white/5 px-6 py-2 rounded-2xl shadow-2xl gap-4">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase italic">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 
            Secure Uplink:
          </div>
          <div className="flex-grow overflow-hidden px-6 w-full text-center">
            <div className="animate-marquee text-[9px] font-mono text-emerald-500/40 font-bold uppercase whitespace-nowrap tracking-widest">
              {satCoord} — {userRole === 'ADMIN' ? 'FULL_ACCESS' : 'RESTRICTED_PREVIEW'}
            </div>
          </div>
          <Link href="/" className="bg-emerald-600/10 hover:bg-emerald-500 text-emerald-500 hover:text-black px-6 py-1.5 rounded-full text-[9px] font-black transition-all border border-emerald-500/20 uppercase text-center">
            ← Exit Vault
          </Link>
      </div>

      {/* GALLERY GRID */}
      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500"></div>
          <span className="text-[10px] font-mono text-emerald-500 animate-pulse uppercase tracking-[0.5em]">Decrypting_Data...</span>
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
                <div className="absolute inset-0 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-full h-[1px] bg-emerald-400 shadow-[0_0_15px_#34d399] absolute top-0 animate-[scan_3s_linear_infinite]"></div>
                </div>

                <img 
                  src={r.image_url} 
                  alt={r.category} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-80" />
                
                <div className="absolute bottom-6 left-6">
                   <span className={`text-[8px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${getCategoryColor(r.category)}`}>
                    {r.category}
                  </span>
                </div>
              </div>
              
              <div className="p-8 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <h3 className="text-white font-black text-sm uppercase truncate group-hover:text-emerald-400 transition-colors">
                    {r.reporter}
                  </h3>
                  <span className="text-[9px] font-mono text-slate-600">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 italic line-clamp-2 min-h-[30px]">
                  "{r.description || 'No additional digital signature recorded.'}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. QUICK VIEW MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#020617]/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/10 w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-[80vh] md:h-[70vh]">
                <div className="md:w-3/5 h-1/2 md:h-full relative bg-black flex items-center justify-center">
                    <img src={selectedReport.image_url} className="max-w-full max-h-full object-contain" />
                    <div className="absolute top-8 left-8">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getCategoryColor(selectedReport.category)}`}>
                            {selectedReport.category}
                        </span>
                    </div>
                </div>
                <div className="md:w-2/5 p-8 md:p-12 flex flex-col justify-between border-t md:border-t-0 md:border-l border-white/5 overflow-y-auto">
                    <div>
                        <div className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Intelligence_Report</div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">{selectedReport.reporter}</h2>
                        <p className="text-slate-600 text-[11px] font-mono mb-8 uppercase italic">Logged: {new Date(selectedReport.created_at).toLocaleString()}</p>
                        
                        <div className="space-y-6 text-slate-400 text-sm leading-relaxed font-light italic border-l-2 border-emerald-500/20 pl-6">
                            "{selectedReport.description || 'System generated: No additional forensic logs provided.'}"
                        </div>
                    </div>

                    <div className="mt-12">
                        <button 
                            onClick={() => setSelectedReport(null)}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest text-xs rounded-2xl transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        >
                            Close Archive
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .animate-marquee { display: inline-block; animation: marquee 30s linear infinite; }
      `}</style>
    </div>
  );
}