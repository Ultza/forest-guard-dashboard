"use client"
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const handleSignUp = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) alert(error.message)
    else alert("Cek email kamu untuk verifikasi atau langsung cek di Supabase!")
  }

  // Tambahkan fungsi Login ini di bawah fungsi handleSignUp
const handleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    alert("Gagal Login: " + error.message);
  } else {
    alert("Berhasil Login sebagai " + email);
    window.location.href = "/"; // Tendang user kembali ke halaman utama setelah login
  }
};

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="bg-slate-900 p-8 rounded-2xl border border-emerald-500/30 w-full max-w-md">
        <h2 className="text-emerald-500 font-black text-2xl mb-6 italic">INITIALIZE ACCESS</h2>
        <input type="text" placeholder="Full Name" className="w-full mb-4 p-3 bg-slate-800 rounded-lg text-white" 
          onChange={(e) => setFullName(e.target.value)} />
        <input type="email" placeholder="Email" className="w-full mb-4 p-3 bg-slate-800 rounded-lg text-white" 
          onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" className="w-full mb-6 p-3 bg-slate-800 rounded-lg text-white" 
          onChange={(e) => setPassword(e.target.value)} />
        <button onClick={handleSignUp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black p-3 rounded-lg transition-all">
          CREATE ACCOUNT
        </button>
        <button onClick={handleLogin} className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-white font-bold p-3 rounded-lg transition-all border border-white/10">
  LOG IN TO ACCESS
</button>
      </div>
    </div>
  )
}