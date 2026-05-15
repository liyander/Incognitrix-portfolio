/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';

function Achievements({ onSelectAchievement }) {
  const [achievements, setAchievements] = useState([]);
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  useEffect(() => {
    fetch('/api/achievements')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAchievements(data);
        } else {
          setAchievements([]);
          console.error("Expected array but got:", data);
        }
      })
      .catch(err => console.error("Failed to fetch Achievements", err));
  }, []);

  if (selectedAchievement) {
    return (
      <div className="max-w-7xl mx-auto p-6 md:p-12 text-on-surface">
        <button 
          onClick={() => setSelectedAchievement(null)}
          className="mb-8 font-mono text-sm text-outline hover:text-primary-container transition-colors flex items-center gap-2 relative z-20"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          RETURN TO DIRECTORY
        </button>

        <div className="bg-surface-container-low border ghost-border rounded p-8 md:p-12 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 select-none pointer-events-none material-symbols-outlined text-9xl group-hover:text-primary transition-all group-hover:opacity-10 scale-150 transform-view">emoji_events</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary-container animate-pulse drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">star</span>
              <span className="font-mono text-xs tracking-widest text-primary-container font-bold">LABORATORY MILESTONE</span>
            </div>
            
            <h1 className="font-headline text-5xl md:text-6xl font-black text-on-surface mb-6 tracking-tighter">{selectedAchievement.title}</h1>
            
            <div className="bg-surface-dim border-l-4 border-primary p-6 mb-8 rounded-r relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
              <p className="font-mono text-base text-on-surface-variant leading-relaxed relative z-10">
                {selectedAchievement.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 mb-8">
              {selectedAchievement.future_scope && (
                <div className="bg-background border border-outline-variant p-6 rounded relative group shadow-md hover:border-primary-container transition-all">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-primary-container font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">update</span> Future Scope / Next Steps
                  </div>
                  <p className="font-mono text-sm text-on-surface-variant tracking-wide mt-2">{selectedAchievement.future_scope}</p>
                </div>
              )}
              
              {selectedAchievement.reference_link && (
                <div className="bg-background border border-outline-variant p-6 rounded relative shadow-md">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-outline font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">link</span> Reference Document
                  </div>
                  <a href={selectedAchievement.reference_link} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary-container hover:text-primary transition-colors font-mono underline break-all flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg hidden sm:block">smart_display</span>
                    {selectedAchievement.reference_link}
                  </a>
                </div>
              )}
            </div>

            {selectedAchievement.contributors && (() => {
              let contribs = [];
              try { contribs = typeof selectedAchievement.contributors === 'string' ? JSON.parse(selectedAchievement.contributors) : selectedAchievement.contributors; } catch(e){}
              if (contribs && contribs.length > 0) {
                return (
                  <div className="mt-8 border-t border-outline/20 pt-8">
                    <h3 className="font-headline font-bold text-xl mb-4 text-outline flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">group_work</span> Project Leads
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {contribs.map((c, i) => (
                        <div key={i} className="bg-surface-container-high px-4 py-2 rounded-full border border-outline/30 font-mono text-xs text-on-surface flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-fixed transition-colors cursor-default shadow-sm">
                          {c.name || c}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 w-full">
      <div className="flex items-center gap-4 mb-8 border-b ghost-border pb-6">
        <span className="material-symbols-outlined text-5xl text-primary drop-shadow-[0_0_15px_rgba(0,245,255,0.6)]">military_tech</span>
        <div>
          <h1 className="font-headline font-black text-4xl tracking-tighter text-on-surface">LAB ACHIEVEMENTS</h1>
          <p className="font-mono text-sm text-outline mt-1 max-w-2xl">Official records of threat mitigations, CTF victories, and significant milestones accomplished by operational directives.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {achievements.map(ach => (
          <div 
            key={ach.id} 
            onClick={() => setSelectedAchievement(ach)}
            className="group cursor-pointer bg-surface-dim border ghost-border relative p-6 md:p-8 rounded-lg hover:border-primary-container transition-all hover:bg-surface-bright flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-[0_0_30px_rgba(0,245,255,0.15)]"
          >
            {/* Background flourish */}
            <div className="absolute -right-4 -bottom-4 text-outline/5 material-symbols-outlined text-8xl transition-transform group-hover:scale-125 group-hover:text-primary/10">workspace_premium</div>
            
            <div className="relative z-10 mb-8">
              <h2 className="font-headline font-bold text-3xl text-on-surface mb-3 group-hover:text-primary transition-colors tracking-tight">{ach.title}</h2>
              <p className="font-mono text-sm text-outline line-clamp-3 leading-relaxed">{ach.description}</p>
            </div>
            
            <div className="relative z-10 flex justify-between items-center border-t border-outline/20 pt-4">
              <div className="font-mono text-[10px] tracking-widest text-outline flex items-center gap-1 group-hover:text-primary-container transition-colors">
                <span className="material-symbols-outlined text-xs">info</span> CLASSIFIED MILESTONE
              </div>
              <span className="material-symbols-outlined text-primary transform group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
            </div>
          </div>
        ))}
        
        {achievements.length === 0 && (
          <div className="col-span-full py-24 text-center border ghost-border rounded border-dashed bg-surface-container-low max-w-3xl mx-auto w-full">
            <span className="material-symbols-outlined text-5xl text-outline/50 mb-4 block">hourglass_empty</span>
            <h3 className="font-headline text-xl text-on-surface font-bold mb-2">No Directives Complete</h3>
            <p className="font-mono text-outline text-sm">Achievements log is currently empty. Directives are ongoing.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Achievements;

