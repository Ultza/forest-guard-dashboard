"use client"
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false); // State untuk tukar mode
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const handleAuth = async () => {
    if (isRegister) {
      // LOGIKA DAFTAR
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) alert(error.message)
      else alert("Pendaftaran berhasil! Silakan login.")
    } else {
      // LOGIKA LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) alert("Gagal Login: " + error.message)
      else window.location.href = "/";
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-emerald-500/30 w-full max-w-md shadow-2xl">
        <h2 className="text-emerald-500 font-black text-2xl mb-6 italic tracking-tighter">
          {isRegister ? "CREATE AGENT ID" : "TERMINAL ACCESS"}
        </h2>

        {isRegister && (
          <input type="text" placeholder="FULL NAME" className="w-full mb-4 p-4 bg-slate-800 rounded-2xl text-white text-xs font-bold outline-none border border-white/5 focus:border-emerald-500" 
            onChange={(e) => setFullName(e.target.value)} />
        )}

        <input type="email" placeholder="EMAIL ADDRESS" className="w-full mb-4 p-4 bg-slate-800 rounded-2xl text-white text-xs font-bold outline-none border border-white/5 focus:border-emerald-500" 
          onChange={(e) => setEmail(e.target.value)} />
        
        <input type="password" placeholder="PASSWORD" className="w-full mb-6 p-4 bg-slate-800 rounded-2xl text-white text-xs font-bold outline-none border border-white/5 focus:border-emerald-500" 
          onChange={(e) => setPassword(e.target.value)} />

        <button onClick={handleAuth} className="w-full bg-emerald-600 hover:bg-emerald-500 text-slate-900 font-black p-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/10 uppercase tracking-widest text-xs">
          {isRegister ? "Initialize Account" : "Confirm Identity"}
        </button>

        <p className="text-center mt-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:text-emerald-400 transition-colors"
           onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Already have access? Login here" : "Need new access? Register here"}
        </p>
      </div>
    </div>
  )
}