/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function IndividualProfile({ individualId, projects, onNavigateToProject, onNavigateToTeam, onBack }) {
  const [individual, setIndividual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    const fetchIndividual = async () => {
      try {
        const response = await axios.get(`/api/individuals/${individualId}`);
        setIndividual(response.data);
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

  let achievements = [];
  try { achievements = typeof individual.achievements === 'string' ? JSON.parse(individual.achievements) : individual.achievements || []; } catch(e){}
  let certificates = [];
  try { certificates = typeof individual.certificates === 'string' ? JSON.parse(individual.certificates) : individual.certificates || []; } catch(e){}
  let research_work = [];
  try { research_work = typeof individual.research_work === 'string' ? JSON.parse(individual.research_work) : individual.research_work || []; } catch(e){}

  const nameParts = individual.name.split(' ');
  const lastName = nameParts.length > 1 ? nameParts.pop() : '';
  const firstName = nameParts.join(' ') || individual.name;

  const activeProjects = (projects || []).filter(proj => {
    let pOps = proj.operatives;
    if (typeof pOps === 'string') { try { pOps = JSON.parse(pOps); } catch(e) { pOps = []; } }
    
    // Check if the individual is listed in operatives JSON
    const isInOps = Array.isArray(pOps) && pOps.some(op => String(op.name).toLowerCase() === String(individual.name).toLowerCase());
    
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
                </div>
                
                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 border-t border-outline-variant/20 pt-6">
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">ACHIEVEMENTS</p>
                    <p className="font-headline text-2xl font-bold text-on-surface">{achievements.length}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">PROJECTS</p>
                      <p className="font-headline text-2xl font-bold text-primary glow-text-primary">{activeProjects.length}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase mb-1">YEAR/EXP</p>
                    <p className="font-headline text-xl font-bold text-error">{individual.year_of_study || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Projects Bento */}
            {activeProjects.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {activeProjects.map((work, idx) => (
                    <div key={idx} onClick={() => onNavigateToProject && onNavigateToProject(work)} className="bg-surface-container border border-outline-variant/10 flex flex-col cursor-pointer hover:border-primary/50 transition-colors group">
                      <div className="bg-surface-bright px-4 py-2 flex items-center justify-between border-b border-outline-variant/10 group-hover:bg-primary/5 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">folder_open</span>
                          <span className="font-label text-[11px] text-primary tracking-widest uppercase">PROJECT_DIR</span>
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

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="bg-surface-container border border-outline-variant/10 mt-8">
                <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between">
                  <h3 className="font-headline text-lg font-bold text-on-surface tracking-widest uppercase">HONORS_&_ACHIEVEMENTS</h3>
                  <span className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase">FILTER: ALL</span>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {achievements.map((ach, idx) => (
                       <div key={idx} onClick={() => setSelectedDetail({ icon: 'emoji_events', title: ach.title || ach.name, description: ach.description || 'Details regarding this achievement have been classified.', meta: [{ label: 'DATE', value: ach.date || 'N/A' }, { label: 'CATEGORY', value: 'HONOR/AWARD' }] })} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-highest cursor-pointer transition-colors group">
                        <div className="flex items-start gap-4">
                          <div className="mt-1">
                            <span className="material-symbols-outlined text-[24px] text-on-surface-variant group-hover:text-primary transition-colors">emoji_events</span>
                          </div>
                          <div>
                            <h4 className="font-headline text-base font-bold text-on-surface mb-1 group-hover:text-primary transition-colors uppercase tracking-tight">{ach.title || ach.name}</h4>
                            <p className="font-body text-xs text-on-surface-variant mb-2">{ach.description}</p>
                            <div className="flex items-center gap-4 font-label text-[10px] text-on-surface-variant tracking-widest uppercase">
                              <span>DATE: {ach.date || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                     </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Terminal Log / Activity Feed */}
          <div className="xl:col-span-4 h-[600px] xl:h-auto xl:sticky xl:top-8 xl:bottom-0 bg-surface-container-lowest border border-outline-variant/20 flex flex-col min-h-[500px]">
            <div className="bg-surface-bright px-4 py-3 border-b border-outline-variant/20 flex items-center gap-3">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">terminal</span>
              <span className="font-label text-xs text-on-surface-variant tracking-widest uppercase">SYS_LOG :: OP-{individual.id}</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto terminal-scroll font-label text-[11px] leading-relaxed text-on-surface-variant opacity-80 flex flex-col gap-3">
              <div className="flex gap-4">
                <span className="text-outline shrink-0">14:02:11</span>
                <span className="text-primary">&gt; AUTH_SUCCESS: ENCLAVE_BETA</span>
              </div>
              <div className="flex gap-4">
                <span className="text-outline shrink-0">14:05:43</span>
                <span>&gt; UPLOADING_PAYLOAD: metadata_v2.bin</span>
              </div>
              <div className="flex gap-4">
                <span className="text-outline shrink-0">14:06:01</span>
                <span className="text-secondary">&gt; CHECKSUM_VERIFIED</span>
              </div>
              <div className="flex gap-4">
                <span className="text-outline shrink-0">16:40:00</span>
                <span>&gt; SESSION_IDLE</span>
              </div>
              <div className="flex gap-4">
                <span className="text-outline shrink-0">**:**:**</span>
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

