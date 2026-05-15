/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';

const API_TEAMS = '/api/teams';
const API_PROJECTS = '/api/projects';
const API_INDIVIDUALS = '/api/individuals';

function Teams({ onSelectProject, onSelectIndividual }) {
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(API_TEAMS).then(res => res.json()),
      fetch(API_PROJECTS).then(res => res.json()),
      fetch(API_INDIVIDUALS).then(res => res.json())
    ]).then(([teamsData, projData, indData]) => {
      setTeams(teamsData);
      setProjects(projData);
      setIndividuals(indData);
    }).catch(err => console.error(`Error fetching teams telemetry:`, err));
  }, []);

  if (selectedTeam) {
    const teamProjects = projects.filter(p => p.priority && p.priority.toLowerCase() === selectedTeam.name.toLowerCase());
    const teamMembers = individuals.filter(i => i.team_id === selectedTeam.id);
    const ongoingProject = teamProjects.length > 0 ? teamProjects[0] : null;

    return (
      <div className="pt-8 pb-12 px-4 md:px-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <button 
          onClick={() => setSelectedTeam(null)}
          className="self-start flex items-center gap-2 font-mono text-xs text-outline hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          RETURN TO DIVISIONS
        </button>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Identity Col */}
          <aside className="w-full md:w-1/4 flex flex-col gap-6">
            {/* Dossier Header */}
            <div className="bg-surface-container-low rounded p-6 border border-outline/15 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-container/10 to-transparent blur-xl"></div>
              <div className="flex flex-col items-center text-center gap-4 relative z-10">
                <div className="w-32 h-32 rounded-full bg-surface border border-outline/30 p-1 relative shadow-lg">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 scale-105 animate-pulse"></div>
                  <div className="w-full h-full rounded-full bg-surface-container flex items-center justify-center border border-outline/20">
                     <span className="material-symbols-outlined text-4xl text-primary opacity-80">group</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h1 className="text-xl font-bold tracking-tight text-on-surface">{selectedTeam.name}</h1>
                  <p className="text-xs font-mono text-primary tracking-[0.1em] uppercase">{selectedTeam.description || 'Division'}</p>
                </div>
                <div className="flex gap-2 w-full mt-4">
                  <div className="flex-1 bg-surface-container py-2 rounded-sm text-center border border-outline/10">
                    <span className="block text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Clearance</span>
                    <span className="font-mono text-sm text-primary">LEVEL 4</span>
                  </div>
                  <div className="flex-1 bg-surface-container py-2 rounded-sm text-center border border-outline/10">
                    <span className="block text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Status</span>
                    <span className="font-mono text-sm text-emerald-400">ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-surface-container-low rounded p-6 border border-outline/15 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-on-surface-variant tracking-widest uppercase border-b border-outline/20 pb-2 mb-2">Team Members</h3>
              {teamMembers.length === 0 ? (
                <div className="text-sm text-outline font-mono">No assigned operatives.</div>
              ) : (
                teamMembers.map(member => (
                  <div 
                    key={member.id} 
                    onClick={() => onSelectIndividual?.(member.id)}
                    className="flex justify-between items-center text-sm border-b border-outline/10 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-surface-container transition-colors group p-2 -mx-2 rounded"
                  >
                    <span className="text-on-surface font-semibold text-xs truncate max-w-[50%] group-hover:text-primary transition-colors">{member.name}</span>
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-primary tracking-wider uppercase group-hover:text-primary-container transition-colors">{member.role || 'Operative'}</div>
                      <div className="font-mono text-[9px] text-outline uppercase">{member.department || 'N/A'}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button className="w-full bg-gradient-to-r from-primary/20 to-primary-container/10 border border-primary/30 text-primary hover:bg-primary/10 py-3 rounded-sm text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px]">emergency</span> Initiate Comms
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <section className="flex-1 flex flex-col gap-8">
            {/* Ongoing Project Bento Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Primary Assignment */}
              <div className="xl:col-span-2 bg-surface-container-low rounded p-6 border border-outline/15 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-surface-container-high to-surface-container-lowest opacity-50"></div>
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xs font-bold text-primary tracking-widest uppercase mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Ongoing Project
                      </h2>
                      {ongoingProject ? (
                        <h3 className="text-xl font-bold text-on-surface tracking-tight">{ongoingProject.title}</h3>
                      ) : (
                        <h3 className="text-xl font-bold text-on-surface tracking-tight italic opacity-50">No Active Deployment</h3>
                      )}
                    </div>
                    {ongoingProject && (
                      <span className="bg-primary-container/10 text-primary border border-primary/20 px-2 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider">{ongoingProject.status || 'Active'}</span>
                    )}
                  </div>
                  
                  {ongoingProject ? (
                    <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                      {ongoingProject.description || ongoingProject.shortDesc || "No mission brief provided for this assignment."}
                    </p>
                  ) : (
                    <p className="text-sm text-outline mb-6 leading-relaxed font-mono">
                      Division is currently awaiting assignment directives. Standby.
                    </p>
                  )}
                  
                  <div className="mt-auto grid grid-cols-2 gap-4 border-t border-outline/10 pt-4">
                    {selectedTeam.technical_summary && (
                      <div className="col-span-2">
                        <span className="block text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Division Technical Summary</span>
                        <span className="font-mono text-xs text-on-surface">{selectedTeam.technical_summary}</span>
                      </div>
                    )}
                    {selectedTeam.current_objective && (
                      <div className="col-span-2">
                        <span className="block text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Current Objective</span>
                        <span className="font-mono text-xs text-primary">{selectedTeam.current_objective}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Stats (Progress Metrics) */}
              {ongoingProject && (
                <div className="bg-surface-container-low rounded p-6 border border-outline/15 flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-on-surface-variant tracking-widest uppercase mb-4">Progress Metrics</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant">Completion</span>
                        <span className="font-mono text-primary">Est. 45%</span>
                      </div>
                      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[45%]"></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-on-surface-variant">Resource Utilization</span>
                        <span className="font-mono text-emerald-400">Nominal</span>
                      </div>
                      <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 w-[78%]"></div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-outline/20">
                      <button 
                        onClick={() => onSelectProject?.(ongoingProject)} 
                        className="text-xs font-bold text-primary hover:text-primary-container transition-colors uppercase tracking-wider flex items-center gap-1 group w-full"
                      >
                        Access Project Dashboard <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Other Projects */}
            <div className="bg-surface-container-low rounded border border-outline/15 flex flex-col">
              <div className="p-6 border-b border-outline/20 flex justify-between items-center">
                <h2 className="text-sm font-bold text-on-surface tracking-widest uppercase">Other Projects</h2>
              </div>
              <div className="flex flex-col">
                {teamProjects.length <= 1 ? (
                  <div className="p-6 text-center text-outline font-mono text-xs">No additional projects logged.</div>
                ) : (
                  teamProjects.filter(p => !ongoingProject || p.id !== ongoingProject.id).map(proj => (
                    <div 
                      key={proj.id} 
                      onClick={() => onSelectProject?.(proj)} 
                      className="p-4 px-6 border-b border-outline/10 hover:bg-surface-container cursor-pointer transition-colors group flex items-start gap-4 last:border-0 last:border-b-transparent"
                    >
                      <div className="mt-1 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20 group-hover:bg-primary/20">
                        <span className="material-symbols-outlined text-[18px]">folder</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{proj.title}</h4>
                          <span className="text-[10px] font-mono text-on-surface-variant font-bold">{proj.status}</span>
                        </div>
                        <p className="text-xs text-on-surface-variant mb-2 line-clamp-1">{proj.shortDesc || proj.description || 'Details restricted.'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // STANDARD TEAMS LIST VIEW
  return (
    <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full">
      <header className="mb-12 md:mb-16">
        <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-4 uppercase text-on-surface">Research Divisions</h1>
        <p className="text-on-surface-variant max-w-2xl text-sm md:text-base opacity-80 leading-relaxed font-mono">
          Active deployments and strategic units operating within the Kinetic Terminal. Select a division to access real-time telemetry, vulnerability reports, and current operational objectives.
        </p>
      </header>

      {/* Asymmetrical Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {teams.map((team, index) => {
          const teamProjects = projects.filter(p => p.priority && p.priority.toLowerCase() === team.name.toLowerCase());
          const teamMembers = individuals.filter(i => i.team_id === team.id);

          const isHero = index % 3 === 0;
          const colSpan = isHero ? "md:col-span-8" : (index % 3 === 1 ? "md:col-span-4" : "md:col-span-12");
          const flexDir = index % 3 === 2 ? "flex flex-col md:flex-row gap-8 items-center" : "flex flex-col justify-between";
          const pulseColor = isHero ? "bg-error" : (index % 3 === 1 ? "bg-primary-container" : "bg-secondary");
          const textColor = isHero ? "text-error" : (index % 3 === 1 ? "text-primary" : "text-secondary");
          const gradient = isHero ? "from-transparent via-error to-transparent" : (index % 3 === 1 ? "from-transparent via-primary-container to-transparent" : "from-transparent via-secondary to-transparent");

          return (
            <div 
              key={team.id} 
              onClick={() => setSelectedTeam(team)}
              className={`cursor-pointer ${colSpan} bg-surface-container-low rounded-lg p-6 md:p-8 ${flexDir} relative overflow-hidden group border ghost-border transition-all hover:bg-surface-container-high hover:border-primary/50`}
            >
              <div className={`absolute top-0 ${index%3===2?'left-0 w-1 h-full bg-gradient-to-b':'right-0 w-full h-1 bg-gradient-to-r'} ${gradient} opacity-50`}></div>
              
              <div className={`${index%3===2 ? 'w-full md:w-1/3 border-b md:border-b-0 md:border-r border-outline/20 pb-6 md:pb-0 md:pr-8' : 'w-full mb-6'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`w-2 h-2 rounded-full ${pulseColor} ${isHero?'animate-pulse':''}`}></span>
                  <span className={`font-mono text-xs uppercase tracking-[0.05em] ${textColor}`}>{team.description || 'Division'}</span>
                </div>
                <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface group-hover:text-primary transition-colors">{team.name}</h2>
              </div>
              
              <div className={`space-y-6 ${index%3===2 ? 'w-full md:w-2/3 grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0' : 'w-full'}`}>
                {team.technical_summary && (
                  <div>
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-outline mb-2">Technical Summary</h3>
                    <p className="font-body text-sm text-on-surface-variant leading-relaxed line-clamp-3">
                      {team.technical_summary}
                    </p>
                  </div>
                )}

                {team.current_objective && (
                  <div className={`${isHero ? 'bg-surface-container rounded p-4 border ghost-border' : ''}`}>
                    <h3 className="font-mono text-[10px] uppercase tracking-widest text-outline mb-2">Current Objective</h3>
                    <p className={`font-body text-sm font-medium text-on-surface line-clamp-2 ${!isHero ? "border-l-2 " + (index%3===1?"border-primary":"border-outline") + " pl-2" : ""}`}>
                      {team.current_objective}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Teams;

