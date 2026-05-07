/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Individuals({ onSelectIndividual }) {
  const [individuals, setIndividuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchIndividuals = async () => {
      try {
        const response = await axios.get('/api/individuals');
        setIndividuals(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching individuals:', error);
        setLoading(false);
      }
    };
    fetchIndividuals();
  }, []);

  const filteredIndividuals = individuals.filter(ind => 
    ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ind.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ind.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-background min-h-screen relative animate-fade-slide">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
                <span className="font-label text-[10px] text-secondary uppercase tracking-widest">Live Registry Connected</span>
              </div>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-on-surface tracking-tight">Personnel Directory</h1>
              <p className="font-body text-on-surface-variant mt-3 max-w-2xl text-sm leading-relaxed">
                Encrypted database of all active researchers, analysts, and engineering operatives within CyberNexus parameters. Unauthorized access attempts will be logged.
              </p>
            </div>
            
            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant text-sm group-focus-within:text-primary transition-colors" data-icon="search">search</span>
                <input 
                  className="w-full sm:w-64 bg-surface-container-lowest border-0 border-b-2 border-outline-variant focus:border-secondary text-on-surface text-sm py-2.5 pl-9 pr-4 font-label tracking-wide placeholder:text-on-surface-variant/50 transition-colors focus:ring-0" 
                  placeholder="QUERY_OPERATIVE..." 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="text-center text-primary font-label h-64 flex items-center justify-center">LOADING REGISTRY...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {filteredIndividuals.map((ind, index) => {
              // Determine if this is a "featured" profile (every 3rd item or customize logic)
              const isFeatured = index % 3 === 0;

              if (isFeatured) {
                return (
                  <article key={ind.id} className="lg:col-span-8 bg-surface-container-low border border-transparent hover:border-outline-variant/30 transition-all group relative overflow-hidden flex flex-col sm:flex-row">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent blur-xl"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 m-4"></div>
                    <div className="w-full sm:w-1/3 bg-surface-container-lowest relative min-h-[200px]">
                      {ind.image ? (
                        <img alt="Profile avatar" className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500" src={ind.image} />
                      ) : (
                        <div className="w-full h-full flex justify-center items-center bg-surface text-on-surface text-4xl">
                           <span className="material-symbols-outlined text-6xl opacity-30">person</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                      <div className="absolute bottom-3 left-3 flex gap-2">
                        <span className="px-1.5 py-0.5 bg-error-container/80 text-error font-label text-[9px] uppercase tracking-widest backdrop-blur-sm">Lvl_5_Clearance</span>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-headline text-2xl font-bold text-on-surface">{ind.name}</h3>
                            <p className="font-label text-xs text-primary uppercase tracking-widest mt-1">{ind.role}</p>
                          </div>
                          <span className="material-symbols-outlined text-secondary text-sm" data-icon="wifi_tethering" title="Active Connection">wifi_tethering</span>
                        </div>
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="font-body text-on-surface-variant text-sm line-clamp-3">
                            <span className="text-xs text-primary opacity-60 uppercase mr-2">Department:</span> {ind.department}
                          </p>
                          <p className="font-body text-on-surface-variant text-sm line-clamp-3">
                             <span className="text-xs text-primary opacity-60 uppercase mr-2">Year:</span> {ind.year_of_study}
                          </p>
                        </div>
                      </div>
                      <div className="mt-6 pt-4 border-t border-outline-variant/20 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4">
                          <div className="flex flex-col">
                            <span className="font-label text-[9px] text-on-surface-variant uppercase tracking-widest">ID Code</span>
                            <span className="font-label text-xs text-on-surface">#OP-{ind.id.toString().padStart(4, '0')}</span>
                          </div>
                        </div>
                        <button onClick={() => onSelectIndividual(ind.id)} className="font-label text-xs text-primary uppercase tracking-wider hover:text-primary-fixed transition-colors flex items-center gap-1">
                          ACCESS_FILE <span className="material-symbols-outlined text-[14px]" data-icon="chevron_right">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              } else {
                return (
                  <article key={ind.id} className="lg:col-span-4 bg-surface-container-low flex flex-col relative group border border-transparent hover:border-outline-variant/30 transition-all">
                    <div className="h-24 bg-surface-container-lowest relative overflow-hidden">
                      <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDEwaDQwTTAgMjBoNDBNMCAzMGg0ME0xMCAwdjQwTTIwIDB2NDBNMzAgMHY0MCIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiIG9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')]"></div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface-container-low"></div>
                    </div>
                    <div className="px-5 pb-5 -mt-12 flex-1 flex flex-col relative z-10">
                      <div className="w-16 h-16 bg-surface-container-lowest border-2 border-surface-container-low mb-3 overflow-hidden rounded">
                        {ind.image ? (
                          <img alt="Profile avatar" className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-300" src={ind.image} />
                        ) : (
                          <div className="w-full h-full flex justify-center items-center bg-surface text-on-surface">
                            <span className="material-symbols-outlined opacity-30">person</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-start flex-col">
                        <div>
                          <h3 className="font-headline text-lg font-bold text-on-surface">{ind.name}</h3>
                          <p className="font-label text-[10px] text-tertiary uppercase tracking-widest mt-0.5">{ind.role}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2 flex-grow">
                          <p className="font-body text-on-surface-variant text-xs line-clamp-2">
                             <span className="opacity-60 uppercase mr-1">Dept:</span> {ind.department}
                          </p>
                          <p className="font-body text-on-surface-variant text-xs line-clamp-2">
                             <span className="opacity-60 uppercase mr-1">Year:</span> {ind.year_of_study}
                          </p>
                      </div>
                      <div className="mt-5 pt-3 border-t border-outline-variant/10 flex justify-between items-center cursor-pointer group-hover:border-primary/30" onClick={() => onSelectIndividual(ind.id)}>
                        <span className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest group-hover:text-primary transition-colors">#OP-{ind.id.toString().padStart(4, '0')}</span>
                        <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors text-[14px]">arrow_forward</span>
                      </div>
                    </div>
                  </article>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Individuals;

