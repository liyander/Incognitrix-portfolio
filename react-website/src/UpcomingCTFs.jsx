/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useEffect, useState } from 'react';

function UpcomingCTFs() {
  const [ctfs, setCtfs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCtfs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/upcoming-ctfs');
      const data = await response.json();
      setCtfs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch upcoming CTFs', err);
      setCtfs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCtfs();
  }, []);

  const formatDateTime = (value) => {
    if (!value) return 'TBA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  return (
    <div className="flex-1 bg-background min-h-screen relative animate-fade-slide">
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
              <span className="font-label text-[10px] text-secondary uppercase tracking-widest">CTFTIME Feed Connected</span>
            </div>
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tight">Upcoming CTFs</h1>
            <p className="font-body text-on-surface-variant mt-3 max-w-2xl text-sm leading-relaxed">
              Live competition feed from CTFTIME with lab-added priority events for team planning and practice.
            </p>
          </div>
          <button
            onClick={fetchCtfs}
            className="w-fit px-5 py-2.5 border border-primary/40 text-primary font-label text-xs uppercase tracking-widest hover:bg-primary/10 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="text-center text-primary font-label h-64 flex items-center justify-center">LOADING CTF FEED...</div>
        ) : ctfs.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant/20 p-10 text-center">
            <p className="font-label text-sm text-outline uppercase tracking-widest">No upcoming CTFs available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {ctfs.map((ctf) => (
              <article key={`${ctf.source}-${ctf.id}`} className="bg-surface-container-low border border-outline-variant/20 p-5 flex flex-col gap-4 hover:border-primary/50 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`font-label text-[10px] uppercase tracking-widest mb-2 ${ctf.source === 'ctftime' ? 'text-secondary' : 'text-primary'}`}>
                      {ctf.source === 'ctftime' ? 'CTFTIME API' : 'LAB PRIORITY'}
                    </div>
                    <h2 className="font-headline text-xl font-bold text-on-surface leading-tight">{ctf.title}</h2>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">flag</span>
                </div>

                <div className="grid grid-cols-1 gap-2 font-label text-[11px] text-on-surface-variant uppercase tracking-wide">
                  <div><span className="text-outline">Start:</span> {formatDateTime(ctf.start_time)}</div>
                  <div><span className="text-outline">End:</span> {formatDateTime(ctf.end_time)}</div>
                  <div><span className="text-outline">Format:</span> {ctf.format || 'CTF'}</div>
                  <div><span className="text-outline">Location:</span> {ctf.location || 'Online'}</div>
                </div>

                {ctf.description && (
                  <p className="font-body text-xs text-on-surface-variant leading-relaxed line-clamp-3">{ctf.description}</p>
                )}

                {ctf.url && (
                  <a href={ctf.url} target="_blank" rel="noreferrer" className="mt-auto pt-3 border-t border-outline-variant/10 text-primary font-label text-xs uppercase tracking-widest flex items-center gap-1 hover:text-primary-fixed transition-colors">
                    Open Event <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </a>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UpcomingCTFs;
