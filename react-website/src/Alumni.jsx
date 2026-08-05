import React, { useEffect, useMemo, useState } from 'react';

function Alumni() {
  const [alumni, setAlumni] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAlumni = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/alumni');
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Failed to load alumni');
          return;
        }
        setAlumni(Array.isArray(data) ? data : []);
        setSelectedId(prev => prev || data?.[0]?.id || null);
      } catch (err) {
        console.error('Failed to load alumni', err);
        setError('Cannot connect to alumni directory.');
      } finally {
        setLoading(false);
      }
    };
    loadAlumni();
  }, []);

  const selected = useMemo(() => (
    alumni.find(person => String(person.id) === String(selectedId)) || alumni[0] || null
  ), [alumni, selectedId]);

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-primary font-mono text-sm">
        LOADING ALUMNI DIRECTORY...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 animate-fade-slide">
      <div className="max-w-7xl mx-auto space-y-6">
        <section className="border border-outline/20 bg-surface-container-low/70 rounded p-6 overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-tertiary"></div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-base">workspace_premium</span>
                Alumni Network
              </div>
              <h1 className="font-headline text-4xl md:text-5xl font-black text-on-surface mt-3">Lab Alumni</h1>
              <p className="font-mono text-sm text-on-surface-variant mt-3 max-w-3xl">
                Project history, internships, placements, and job details from members who moved through the lab.
              </p>
            </div>
            <div className="font-mono text-xs text-outline uppercase border border-outline/20 rounded px-4 py-3">
              {alumni.length} Profiles
            </div>
          </div>
        </section>

        {error && (
          <div className="border border-error/40 bg-error/10 text-error rounded p-4 font-mono text-xs uppercase">
            {error}
          </div>
        )}

        {alumni.length === 0 ? (
          <div className="border border-outline/20 rounded p-10 text-center font-mono text-outline">
            No alumni profiles have been published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <aside className="lg:col-span-4 space-y-3">
              {alumni.map(person => {
                const active = String(person.id) === String(selected?.id);
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => setSelectedId(person.id)}
                    className={`w-full text-left border rounded p-4 transition-colors ${active ? 'bg-primary/10 border-primary/40' : 'bg-background border-outline/20 hover:border-primary/30'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded overflow-hidden border border-outline/20 bg-surface-container-low flex items-center justify-center shrink-0">
                        {person.image ? <img src={person.image} alt={person.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline">person</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-headline text-lg font-bold text-on-surface truncate">{person.name}</div>
                        <div className="font-mono text-[10px] text-outline uppercase tracking-widest truncate">{person.current_role || person.project_title || 'Alumni'}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>

            {selected && (
              <section className="lg:col-span-8 bg-background border border-outline/20 rounded p-6">
                <div className="flex flex-col md:flex-row gap-5 md:items-start">
                  <div className="w-28 h-28 rounded overflow-hidden border border-outline/20 bg-surface-container-low flex items-center justify-center shrink-0">
                    {selected.image ? <img src={selected.image} alt={selected.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline text-5xl">person</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs text-primary uppercase tracking-widest">{selected.batch_year || 'Batch not updated'}</div>
                    <h2 className="font-headline text-3xl md:text-4xl font-black text-on-surface mt-2">{selected.name}</h2>
                    <div className="mt-3 flex flex-wrap gap-2 font-mono text-xs">
                      {selected.current_role && <span className="border border-primary/30 text-primary rounded px-3 py-1">{selected.current_role}</span>}
                      {selected.current_company && <span className="border border-secondary/30 text-secondary rounded px-3 py-1">{selected.current_company}</span>}
                      {selected.email && <span className="border border-outline/20 text-outline rounded px-3 py-1">{selected.email}</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoBlock title="Project Did In Lab" value={selected.project_title} details={selected.project_details} icon="account_tree" />
                  <InfoBlock title="Internship Details" value={selected.internship_details} icon="business_center" />
                  <InfoBlock title="Job Details" value={selected.job_details} icon="work" />
                  <InfoBlock title="Current Placement" value={[selected.current_role, selected.current_company].filter(Boolean).join(' / ')} details={selected.notes} icon="verified" />
                </div>

                {(selected.linkedin || selected.email) && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    {selected.linkedin && <a href={selected.linkedin} target="_blank" rel="noreferrer" className="font-mono text-xs text-primary border border-primary/30 rounded px-4 py-2 hover:bg-primary/10">LINKEDIN</a>}
                    {selected.email && <a href={`mailto:${selected.email}`} className="font-mono text-xs text-secondary border border-secondary/30 rounded px-4 py-2 hover:bg-secondary/10">EMAIL</a>}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBlock({ title, value, details, icon }) {
  return (
    <div className="border border-outline/20 rounded p-4 bg-surface-container-low/50 min-h-[150px]">
      <div className="flex items-center gap-2 text-primary">
        <span className="material-symbols-outlined text-lg">{icon}</span>
        <div className="font-mono text-[10px] uppercase tracking-widest">{title}</div>
      </div>
      <div className="mt-3 font-headline text-xl font-bold text-on-surface">{value || 'Not updated'}</div>
      {details && <p className="mt-3 font-mono text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">{details}</p>}
    </div>
  );
}

export default Alumni;
