import React, { useState } from 'react';

function StudentLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || data.error || 'Student login failed');
        return;
      }

      sessionStorage.setItem('studentToken', data.token);
      onLogin(data);
    } catch (err) {
      console.error(err);
      setError('Cannot connect to server. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[500px] p-6 relative animate-fade-slide">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none"></div>
      <div className="w-full max-w-md bg-surface-dim/80 backdrop-blur-xl border border-secondary/30 p-10 relative z-10 shadow-[0_0_50px_rgba(255,107,107,0.06)]">
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-secondary"></div>
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-secondary"></div>
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-secondary"></div>
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-secondary"></div>

        <div className="mb-8 text-center">
          <span className="material-symbols-outlined text-secondary text-5xl mb-4 jarvis-text">school</span>
          <h2 className="font-headline text-2xl font-bold text-on-surface uppercase tracking-widest jarvis-text">Student Login</h2>
          <p className="font-body text-xs text-secondary/80 tracking-widest uppercase mt-2">PERSONAL DASHBOARD ACCESS</p>
        </div>

        {error && <div className="p-3 mb-6 bg-error/10 border border-error/50 text-error font-mono text-xs uppercase tracking-widest">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block">
            <span className="block font-label text-[10px] text-secondary/80 tracking-widest uppercase mb-2">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-background/50 border border-outline-variant/30 px-4 py-3 text-sm font-mono text-on-surface placeholder:text-outline/40 focus:border-secondary focus:outline-none"
              placeholder="ENTER STUDENT ID"
              required
            />
          </label>
          <label className="block">
            <span className="block font-label text-[10px] text-secondary/80 tracking-widest uppercase mb-2">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background/50 border border-outline-variant/30 px-4 py-3 text-sm font-mono text-on-surface placeholder:text-outline/40 focus:border-secondary focus:outline-none"
              placeholder="ENTER PASSWORD"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-secondary/10 text-secondary border border-secondary/50 hover:bg-secondary hover:text-background transition-all py-4 font-headline text-sm font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {loading ? 'VERIFYING...' : 'OPEN DASHBOARD'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentLogin;
