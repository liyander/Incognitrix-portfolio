/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';

function IndividualProfile({ individualId, projects, onNavigateToProject, onNavigateToTeam, onBack, useDatabase }) {
  const [individual, setIndividual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    const fetchIndividual = async () => {
      try {
        if (useDatabase) {
           const response = await fetch(`/api/individuals/${individualId}`);
           if (response.ok) {
              const data = await response.json();
              setIndividual(data);
              setLoading(false);
              return;
           }
        }

        const response = await fetch('/api/sheets-dashboard');
        const sheetsData = await response.json();
        
        let foundInd = null;
        const studentSheets = ['Technical Team', 'CVE Hunt Team', 'Escape Room Team', 'Cyber-AR&VR', 'Internship/Placed', 'Project'];

        const allInds = [];
        studentSheets.forEach((sheetName) => {
          if (sheetsData[sheetName]) {
            let currentTeam = sheetName;
            sheetsData[sheetName].forEach(row => {
              if (row['TEAM NAME'] && row['TEAM NAME'].trim() !== '') {
                currentTeam = row['TEAM NAME'].trim();
              }
              const name = row['NAME'] || row['NAME '] || row['STUDENT LEARNER'] || row['LEADING BY'];
              if (name) {
                allInds.push({
                  name: name,
                  team_name: currentTeam,
                  role: row['WORK'] || 'Operative',
                  department: row['DEPT - YEAR'] || 'Unknown',
                  achievements: row['ACHIEVEMENTS'] || '',
                  certificates: row['CERTIFICATES'] || '',
                  research_work: row['RESEARCH WORK'] || ''
                });
              }
            });
          }
        });
        
        let globalIdCounter = 1;
        const unique = [];
        const seen = new Set();
        for (const ind of allInds) {
           const normName = ind.name.toLowerCase().replace(/[\s\.]/g, '').replace('auswath', 'asuwath');
           if(!seen.has(normName)) {
               seen.add(normName);
               ind.id = globalIdCounter++;
               unique.push(ind);
           }
        }
        
        foundInd = unique.find(u => u.id === individualId);

        setIndividual(foundInd);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching individual profile:', error);
        setLoading(false);
      }
    };
    if (individualId) {
      fetchIndividual();
    }
  }, [individualId]);

  if (loading) {
    return <div className="text-center text-primary font-label h-64 flex items-center justify-center">LOADING PROFILE DATA...</div>;
  }

  if (!individual) {
    return <div className="text-center text-error font-label h-64 flex items-center justify-center">PROFILE NOT FOUND</div>;
  }

  const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const achievements = parseJsonArray(individual.linked_achievements);
  let certificates = [];
  try { certificates = typeof individual.certificates === 'string' ? JSON.parse(individual.certificates) : individual.certificates || []; } catch(e){}
  let research_work = [];
  try { research_work = typeof individual.research_work === 'string' ? JSON.parse(individual.research_work) : individual.research_work || []; } catch(e){}
  const workTimeline = Array.isArray(individual.work_timeline) ? individual.work_timeline : [];
  const currentDayWork = individual.current_day_work || individual.daily_work || '';
  const formatWorkDate = (value) => {
    if (!value) return 'NO_DATE';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('en-CA');
  };

  const nameParts = individual.name.split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ') || individual.name;

  const activeProjects = (projects || []).filter(proj => {
    let pOps = proj.operatives;
    if (typeof pOps === 'string') { try { pOps = JSON.parse(pOps); } catch(e) { pOps = []; } }
    
    // Check if the individual is listed in operatives JSON
    const isInOps = Array.isArray(pOps) && pOps.some(op => {
      const opName = typeof op === 'string' ? op : op.name;
      return String(opName).toLowerCase() === String(individual.name).toLowerCase();
    });
    
    // Check if project team matches individual's team_name
    const pTeam = String(proj.team || "").toLowerCase();
    const pPriority = String(proj.priority || "").toLowerCase();
    const iTeam = String(individual.team_name || "").toLowerCase();
    const matchesTeam = iTeam && (iTeam === pTeam || iTeam === pPriority);
    
    return isInOps || matchesTeam;
  });

  return (
    <div className="flex-1 overflow-y-auto terminal-scroll bg-surface-dim p-4 md:p-8 relative min-h-screen animate-fade-slide">
      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface-container border border-outline-variant-high p-8 max-w-2xl w-full relative">
            <button onClick={() => setSelectedDetail(null)} className="absolute top-4 right-4 text-outline hover:text-error transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary text-3xl">{selectedDetail.icon}</span>
              <h2 className="font-headline text-2xl font-bold uppercase text-on-surface">{selectedDetail.title}</h2>
            </div>
            <div className="font-body text-on-surface-variant leading-relaxed whitespace-pre-wrap mb-6">
              {selectedDetail.description || 'No detailed description available.'}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-outline-variant/20 pt-4">
              {(selectedDetail.meta || []).map((m, i) => (
                <span key={i} className="font-label text-xs tracking-widest uppercase text-tertiary">
                  {m.label}: <span className="text-on-surface">{m.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Background Glow */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Back Button */}
        <button onClick={onBack} className="flex items-center gap-2 text-primary font-label text-xs uppercase tracking-widest hover:text-primary-fixed mb-4">
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          RETURN_TO_DIRECTORY
        </button>

        {/* Profile Header Module */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-8 space-y-8">
            <div className="bg-surface-container flex flex-col md:flex-row items-stretch border border-outline-variant/10 relative overflow-hidden group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary group-hover:bg-primary transition-colors z-10"></div>
              
              {/* Image Segment */}
                <div className="w-full md:w-64 shrink-0 relative bg-surface-container-lowest min-h-[300px] flex items-center justify-center group overflow-hidden">
                  {individual.image ? (
                     <img alt="Researcher Portrait" className="w-full h-full object-cover grayscale opacity-80 mix-blend-luminosity absolute inset-0 transition-all duration-500 group-hover:grayscale-0 group-hover:mix-blend-normal group-hover:opacity-100 group-hover:scale-105" src={individual.image}/>
                ) : (
                   <span className="material-symbols-outlined text-6xl text-outline-variant opacity-30">person</span>
                )}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-surface-container-lowest/80 backdrop-blur px-3 py-1.5 border border-outline-variant/30">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>
                  <span className="font-label text-[10px] text-secondary tracking-widest uppercase">ACTIVE_DUTY</span>
                </div>
              </div>

              {/* Data Segment */}
              <div className="p-8 flex flex-col justify-between flex-1 relative z-10">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="font-headline text-4xl md:text-5xl font-black tracking-tighter text-on-surface uppercase">
                      {lastName ? <>{lastName}. <span className="text-primary glow-text-primary">{firstName}</span></> : <span className="text-primary glow-text-primary">{individual.name}</span>}
                    </h2>
                    <div className="px-3 py-1 bg-surface-container-highest border border-primary/20">
                      <span className="font-label text-[10px] text-primary tracking-widest uppercase">ID: OP-{String(individual.id).padStart(4, '0')}</span>
                    </div>
                  </div>
                  <p className="font-label text-sm text-on-surface-variant tracking-widest uppercase mb-6">
                    {individual.role || 'OPERATIVE'} // {individual.department || 'GENERAL'}
                  </p>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed max-w-lg mb-8">
                      Specialist operative currently assigned to team <span onClick={onNavigateToTeam} className="text-primary cursor-pointer hover:underline underline-offset-2">{individual.team_name || 'UNASSIGNED'}</span>. 
                    Assigned duties focus on {individual.role}. Clearance status determined by sector engagement.
                  </p>
                  <div className="mb-8 bg-surface-container-low border border-outline-variant/20 p-4">
                    <p className="font-label text-[10px] text-primary tracking-widest uppercase mb-2">Current Day Work</p>
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                      {currentDayWork || 'No work update recorded for today.'}
                    </p>
                  </div>
                </div>
                
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-outline-variant/20 pt-6">
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">ACHIEVEMENTS</p>
                    <p className="font-headline text-2xl font-bold text-on-surface">{achievements.length}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">PRODUCTS</p>
                      <p className="font-headline text-2xl font-bold text-primary glow-text-primary">{activeProjects.length}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">YEAR/EXP</p>
                    <p className="font-headline text-xl font-bold text-error">{individual.year_of_study || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">STUDY YEAR</p>
                    <p className="font-headline text-xl font-bold text-secondary">{individual.studying_year ? `Year ${individual.studying_year}` : 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Products Bento */}
            {activeProjects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {activeProjects.map((work, idx) => (
                    <div key={idx} onClick={() => onNavigateToProject && onNavigateToProject(work)} className="bg-surface-container border border-outline-variant/10 flex flex-col cursor-pointer hover:border-primary/50 transition-colors group">
                      <div className="bg-surface-bright px-4 py-2 flex items-center justify-between border-b border-outline-variant/10 group-hover:bg-primary/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">folder_open</span>
                          <span className="font-label text-[11px] text-primary tracking-widest uppercase">PRODUCT_DIR</span>
                        </div>
                        <span className="font-label text-[10px] text-secondary tracking-widest uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 bg-secondary rounded-full"></span> ONGOING</span>
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-headline text-xl font-bold text-on-surface mb-2 tracking-tight uppercase line-clamp-1">{work.title || `RESEARCH_${idx+1}`}</h3>
                          <p className="font-body text-xs text-on-surface-variant leading-relaxed line-clamp-3">{work.description || work.summary}</p>
                        </div>
                        <div className="mt-6 flex items-center justify-between">
                          <span className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase">TEAM: {work.team || work.priority || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                 ))}
              </div>
            )}

            {/* Achievements Bento */}
            {achievements.length > 0 && (
              <div className="bg-surface-container p-6 md:p-8 border border-outline-variant/20 mt-8">
                <h3 className="font-headline text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-xl">emoji_events</span>
                  AWARDS & RECOGNITION
                </h3>
                <div className="space-y-4">
                  {achievements.map((ach, idx) => {
                    const contributors = parseJsonArray(ach.contributors);
                    return (
                    <div
                      key={ach.id || idx}
                      onClick={() => setSelectedDetail({
                        icon: 'emoji_events',
                        title: ach.title || 'Achievement',
                        description: ach.description || 'Verified achievement logged in the lab record.',
                        meta: [
                          { label: 'DATE', value: ach.date ? formatWorkDate(ach.date) : 'N/A' },
                          { label: 'CONTRIBUTORS', value: contributors.length ? contributors.join(', ') : individual.name }
                        ]
                      })}
                      className="bg-surface-container-low border-l-2 border-secondary p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center cursor-pointer hover:bg-surface-container-highest transition-colors"
                    >
                      <div>
                        <h4 className="font-headline text-md font-bold text-on-surface">{ach.title || 'Achievement'}</h4>
                        <p className="font-body text-xs text-on-surface-variant mt-1 line-clamp-2">{ach.description || 'Verified achievement logged in the lab record.'}</p>
                        {contributors.length > 0 && (
                          <p className="font-label text-[10px] text-outline mt-2 uppercase tracking-widest">Contributors: {contributors.join(', ')}</p>
                        )}
                      </div>
                      <span className="font-label text-[10px] text-secondary tracking-widest shrink-0 bg-secondary/10 px-2 py-1">{ach.date ? formatWorkDate(ach.date) : 'LOGGED'}</span>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Certifications (Used as Publications/Whitepapers) */}
            {certificates.length > 0 && (
              <div className="bg-surface-container border border-outline-variant/10 mt-8">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
                  <h3 className="font-headline text-lg font-bold text-on-surface tracking-widest uppercase">CERTIFICATIONS_&_PUBLICATIONS</h3>
                  <span className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase">FILTER: VALIDATED</span>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {certificates.map((cert, idx) => (
                       <div key={idx} onClick={() => setSelectedDetail({ icon: 'verified', title: cert.title || cert.name, description: cert.description || `Official certification record. Validated credentials for ${cert.title || cert.name}.`, meta: [{ label: 'DATE', value: cert.date || cert.issue_date || 'N/A' }, { label: 'REF', value: `CRT-${idx + 100}` }, { label: 'ISSUER', value: cert.issuer || cert.organization || 'INTERNAL' }] })} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-highest cursor-pointer transition-colors group">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <span className="material-symbols-outlined text-[24px] text-on-surface-variant group-hover:text-primary transition-colors">verified</span>
                          </div>
                          <div>
                            <h4 className="font-headline text-base font-bold text-on-surface mb-1 group-hover:text-primary transition-colors uppercase tracking-tight">{cert.title || cert.name}</h4>
                            <div className="flex items-center gap-4 font-label text-[10px] text-on-surface-variant tracking-widest uppercase">
                              <span>DATE: {cert.date || cert.issue_date || 'N/A'}</span>
                              <span>REF: CRT-{idx + 100}</span>
                              <span className="text-tertiary">ISSUER: {cert.issuer || cert.organization || 'INTERNAL'}</span>
                            </div>
                          </div>
                        </div>
                        <button className="shrink-0 px-6 py-2 border border-outline-variant/30 text-primary font-headline text-[10px] font-bold tracking-widest uppercase hover:bg-primary/10 transition-colors">VERIFY_RECORD</button>
                     </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Work Timeline */}
          <div className="xl:col-span-4 h-[600px] xl:h-auto xl:sticky xl:top-8 xl:bottom-0 bg-surface-container-lowest border border-outline-variant/20 flex flex-col min-h-[500px]">
            <div className="bg-surface-bright px-4 py-3 border-b border-outline-variant/20 flex items-center gap-3">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">terminal</span>
              <span className="font-label text-xs text-on-surface-variant tracking-widest uppercase">WORK_TIMELINE :: OP-{individual.id}</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto terminal-scroll font-label text-[11px] leading-relaxed text-on-surface-variant opacity-80 flex flex-col gap-3">
              {workTimeline.length === 0 ? (
                <div className="flex gap-4">
                  <span className="text-outline shrink-0">NO_LOG</span>
                  <span>&gt; No daily work timeline stored yet.</span>
                </div>
              ) : (
                workTimeline.map((log) => (
                  <div key={log.id || `${log.work_date}-${log.work_text}`} className="flex gap-4 items-start border-b border-outline-variant/10 pb-3 last:border-b-0">
                    <span className="text-outline shrink-0">{formatWorkDate(log.work_date)}</span>
                    <span className="text-on-surface-variant">
                      <span className={log.work_text === currentDayWork ? 'text-primary' : 'text-secondary'}>&gt; WORK_LOG:</span> {log.work_text}
                    </span>
                  </div>
                ))
              )}
              <div className="flex gap-4">
                <span className="text-outline shrink-0">TODAY</span>
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndividualProfile;

