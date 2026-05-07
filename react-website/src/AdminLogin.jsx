/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState } from 'react';

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.username);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Cannot connect to server. Ensure backend is running.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[500px] p-6 relative animate-fade-slide">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 blur-[150px] rounded-full pointer-events-none animate-pulse"></div>

      <div className="w-full max-w-md bg-surface-dim/80 backdrop-blur-xl border border-primary/30 p-10 relative z-10 shadow-[0_0_50px_rgba(0,245,255,0.1)]">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary"></div>

        <div className="mb-8 text-center">
          <span className="material-symbols-outlined text-primary text-5xl mb-4 jarvis-text">admin_panel_settings</span>
          <h2 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-widest jarvis-text">Admin login</h2>
          <p className="font-body text-xs text-primary/70 tracking-widest uppercase mt-2">SECURE TERMINAL ACCESS</p>
        </div>

        {error && <div className="p-3 mb-6 bg-error/10 border border-error/50 text-error font-mono text-xs uppercase tracking-widest animate-pulse">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-0 group-hover:scale-100 transition-transform"></div>
            <label className="block font-label text-[10px] text-primary/80 tracking-widest uppercase mb-2 ml-1">Agent ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background/50 border border-outline-variant/30 px-4 py-3 text-sm font-mono text-primary placeholder-primary/30 focus:border-primary/80 focus:bg-primary/5 focus:outline-none transition-all"
              placeholder="ENTER CREDENTIALS"
              required
            />
          </div>
          <div className="relative group">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-0 group-hover:scale-100 transition-transform"></div>
            <label className="block font-label text-[10px] text-primary/80 tracking-widest uppercase mb-2 ml-1">Authorization Code</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background/50 border border-outline-variant/30 px-4 py-3 text-sm font-mono text-primary placeholder-primary/30 focus:border-primary/80 focus:bg-primary/5 focus:outline-none transition-all"
              placeholder="••••••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-primary/10 text-primary border border-primary/50 hover:bg-primary hover:text-on-primary-fixed hover:border-primary hover:shadow-[0_0_20px_rgba(0,245,255,0.6)] transition-all duration-300 py-4 font-headline text-sm font-bold uppercase tracking-widest group relative overflow-hidden"
          >
            <span className="relative z-10">{loading ? 'DECRYPTING...' : 'INITIALIZE UPLINK'}</span>
            <div className="absolute inset-0 bg-primary/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;

