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
  const [satCoord, setSatCoord] = useState("SCANNING_DATABASE...");

  useEffect(() => {
    setIsMounted(true);
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) {
        setReports(data);
        setFilteredReports(data);
      }
      setLoading(false);
    };
    fetchPhotos();

    const timer = setInterval(() => {
      setSatCoord(`VAULT-ID-${Math.random().toString(36).substring(7).toUpperCase()} | UPLINK: STABLE | ACCESS: GRANTED`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fungsi Filter
  const handleFilter = (cat: string) => {
    setSelectedCategory(cat);
    if (cat === "ALL") {
      setFilteredReports(reports);
    } else {
      setFilteredReports(reports.filter(r => r.category === cat));
    }
  };

  // Helper Warna Kategori
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'KEBAKARAN HUTAN': return 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      case 'ILEGAL LOGGING': return 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case 'PERBURUAN SATWA': return 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]';
      default: return 'bg-slate-500 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-sans selection:bg-emerald-500">
      
      {/* HEADER FEED */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center bg-slate-900/50 border border-white/5 px-6 py-2 rounded-2xl overflow-hidden shadow-2xl gap-4">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase italic shrink-0">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 
            Gallery Vault:
          </div>
          <div className="flex-grow overflow-hidden px-6 w-full">
            <div className="animate-marquee text-[9px] font-mono text-emerald-500/40 font-bold uppercase whitespace-nowrap tracking-widest text-center md:text-left">
              {isMounted ? satCoord : "CONNECTING..."} — ARCHIVE_MODE — ACEH_GREEN_PORTAL — ENCRYPTED_STORAGE
            </div>
          </div>
          <Link href="/" className="bg-emerald-600/10 hover:bg-emerald-500 text-emerald-500 hover:text-black px-6 py-1.5 rounded-full text-[9px] font-black transition-all border border-emerald-500/20 uppercase shrink-0">
            ← Return to Command Center
          </Link>
      </div>

      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
              Media <span className="text-emerald-500 underline decoration-white/10 underline-offset-8">Vault</span>
            </h1>
            <p className="text-[10px] font-black text-slate-600 tracking-[0.5em] uppercase mt-2">Historical Evidence Records</p>
          </div>

          {/* FILTER BUTTONS */}
          <div className="flex gap-2 flex-wrap justify-end">
            {["ALL", "ILEGAL LOGGING", "KEBAKARAN HUTAN", "PERBURUAN SATWA"].map((cat) => (
              <button 
                key={cat}
                onClick={() => handleFilter(cat)}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                  selectedCategory === cat 
                  ? 'bg-emerald-500 border-emerald-500 text-black' 
                  : 'bg-transparent border-white/10 text-slate-500 hover:border-emerald-500/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
      </div>

      <hr className="max-w-7xl mx-auto border-white/5 mb-12" />

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500"></div>
          <span className="text-[10px] font-mono text-emerald-500 animate-pulse">DECRYPTING DATA...</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
          {filteredReports.map((r) => (
            <div key={r.id} className="group bg-slate-900/40 rounded-[2rem] overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all duration-500 shadow-xl flex flex-col backdrop-blur-sm">
              <div className="aspect-square overflow-hidden relative">
                <img 
                  src={r.image_url} 
                  alt={r.category} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110 shadow-inner" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60" />
                
                {/* Overlay Kategori (Bottom Left) */}
                <div className="absolute bottom-4 left-4">
                   <span className={`text-[8px] font-black px-3 py-1 rounded-md uppercase tracking-wider ${getCategoryColor(r.category)}`}>
                    {r.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <h3 className="text-white font-black text-sm uppercase truncate tracking-tighter group-hover:text-emerald-400 transition-colors">
                    {r.reporter}
                  </h3>
                  <span className="text-[9px] font-mono text-slate-600">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 italic leading-relaxed line-clamp-3 min-h-[40px]">
                  "{r.description}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredReports.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
          <p className="text-slate-600 font-mono text-xs uppercase tracking-[0.3em]">No records found in this sector</p>
        </div>
      )}

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}