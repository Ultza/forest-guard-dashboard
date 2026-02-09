"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
// Path diperbaiki: naik dua tingkat (../../) karena file ini ada di app/gallery/
import { supabase } from '../../lib/supabase';

export default function GalleryPage() {
  const [reports, setReports] = useState<any[]>([]);
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
      if (data) setReports(data);
      setLoading(false);
    };
    fetchPhotos();

    const timer = setInterval(() => {
      setSatCoord(`VAULT-ID-${Math.random().toString(36).substring(7).toUpperCase()} | UPLINK: STABLE | ACCESS: GRANTED`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8 font-sans selection:bg-emerald-500">
      
      {/* HEADER FEED */}
      <div className="max-w-7xl mx-auto mb-10 flex justify-between items-center bg-slate-900/50 border border-white/5 px-6 py-2 rounded-2xl overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase italic shrink-0">
            <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span> 
            Gallery Vault:
          </div>
          <div className="flex-grow overflow-hidden px-6">
            <div className="animate-marquee text-[9px] font-mono text-emerald-500/40 font-bold uppercase whitespace-nowrap tracking-widest">
              {isMounted ? satCoord : "CONNECTING..."} — ARCHIVE_MODE — ACEH_GREEN_PORTAL — ENCRYPTED_STORAGE
            </div>
          </div>
          <Link href="/" className="bg-emerald-600/10 hover:bg-emerald-500 text-emerald-500 hover:text-black px-6 py-1.5 rounded-full text-[9px] font-black transition-all border border-emerald-500/20 uppercase shrink-0">
            ← Return to Command Center
          </Link>
      </div>

      <div className="max-w-7xl mx-auto mb-12">
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
            Media <span className="text-emerald-500 underline decoration-white/10 underline-offset-8">Vault</span>
          </h1>
          <p className="text-[10px] font-black text-slate-600 tracking-[0.5em] uppercase mt-2">Historical Evidence Records</p>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500"></div>
          <span className="text-[10px] font-mono text-emerald-500 animate-pulse">DECRYPTING DATA...</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
          {reports.map((r) => (
            <div key={r.id} className="group bg-slate-900/40 rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-emerald-500/50 transition-all duration-500 shadow-xl flex flex-col">
              <div className="aspect-square overflow-hidden relative">
                <img 
                  src={r.image_url} 
                  alt={r.category} 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </div>
              
              <div className="p-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black bg-emerald-500 text-black px-3 py-1 rounded-full uppercase tracking-tighter">
                    {r.category}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-white font-black text-sm uppercase truncate tracking-tighter group-hover:text-emerald-400 transition-colors">
                  {r.reporter}
                </h3>
                <p className="text-[10px] text-slate-500 italic leading-relaxed line-clamp-2">
                  "{r.description}"
                </p>
              </div>
            </div>
          ))}
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