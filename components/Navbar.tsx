"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    // Cek status login saat ini
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();

    // Listen perubahan auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!isMounted) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-slate-900/60 backdrop-blur-xl border border-white/5 px-6 py-3 rounded-2xl shadow-2xl">
        
        {/* LOGO & CONNECTION STATUS */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group">
            <div className="text-xl font-black text-white tracking-tighter flex items-center gap-2 uppercase italic">
              FOREST<span className="text-emerald-500 group-hover:text-white transition-colors">GUARD</span>
            </div>
          </Link>
          
          {/* DYNAMIC CONNECTION INDICATOR */}
          <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${user ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]'}`}></span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  System Status: <span className={user ? 'text-emerald-500' : 'text-blue-500'}>{user ? 'ENCRYPTED_UPLINK' : 'PUBLIC_PORTAL'}</span>
                </span>
              </div>
              <div className="text-[7px] font-mono text-slate-600 uppercase tracking-tighter">
                {user ? `Agent ID: ${user.email?.split('@')[0].toUpperCase()}` : 'Guest Access Only'}
              </div>
            </div>
          </div>
        </div>

        {/* MENU LINKS */}
        <div className="flex items-center gap-4">
          <Link href="/gallery" className="text-[10px] font-black text-slate-400 hover:text-emerald-500 uppercase tracking-widest transition-all px-4 py-2 hover:bg-white/5 rounded-lg">
            Media Vault
          </Link>
          
          {user ? (
            <div className="flex items-center gap-4">
              <Link href="/report" className="hidden sm:block text-[10px] font-black bg-emerald-500 text-black px-4 py-2 rounded-lg uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95">
                + New Intel
              </Link>
              <button 
                onClick={handleLogout}
                className="text-[10px] font-black text-red-500/60 hover:text-red-500 uppercase tracking-widest border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/5 transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="relative group overflow-hidden bg-white/5 border border-white/10 px-6 py-2 rounded-xl transition-all hover:border-emerald-500/50"
            >
              <span className="relative z-10 text-[10px] font-black text-white group-hover:text-emerald-500 uppercase tracking-widest">
                Establish Connection
              </span>
              <div className="absolute inset-0 bg-emerald-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}