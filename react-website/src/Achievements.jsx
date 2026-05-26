/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';

function Achievements({ onSelectAchievement, useDatabase }) {
  const [achievements, setAchievements] = useState([]);
  const [selectedAchievement, setSelectedAchievement] = useState(null);

  const eventMeta = {
    'ACN CTF': {
      type: 'Capture The Flag',
      venue: 'Amrita Vishwa Vidyapeetham, Chennai',
      domains: ['Forensics', 'Web', 'Security Analysis', 'Problem Solving'],
      signal: 'Podium result in Amrita CyberNation CTF context',
      icon: 'flag'
    },
    'L3m0n CTF': {
      type: '24-hour Jeopardy CTF',
      venue: 'Amrita Vishwa Vidyapeetham, Coimbatore',
      domains: ['Web', 'Crypto', 'Pwn', 'Reverse', 'Forensics', 'OSINT'],
      signal: 'Multi-domain cybersecurity competition',
      icon: 'terminal'
    },
    '0xti CTF': {
      type: 'Offline 24-hour CTF',
      venue: 'Rajalakshmi Engineering College, Chennai',
      domains: ['Web', 'Crypto', 'Forensics', 'Reverse', 'Team Ops'],
      signal: 'HackTiVate/Titanium CTF environment',
      icon: 'offline_bolt'
    },
    'HackQuest': {
      type: 'National CTF Hackathon',
      venue: 'Jamal Mohamed College, Trichy',
      domains: ['Web Exploitation', 'Authentication', 'Injection', 'Server-side Bugs'],
      signal: 'Web security competition track',
      icon: 'travel_explore'
    },
    'KI CTF': {
      type: 'On-site Jeopardy CTF',
      venue: 'Kumaraguru College of Technology, Coimbatore',
      domains: ['Web', 'Pwn', 'Reverse', 'Forensics', 'AI', 'Crypto'],
      signal: 'Cyber Conclave / Yugam cybersecurity event',
      icon: 'hub'
    },
    'Inno Blitz': {
      type: 'National Technical Event',
      venue: 'Sri Ramakrishna Engineering College, Coimbatore',
      domains: ['Product Presentation', 'Ideathon', 'Buildathon', 'Prototype Work'],
      signal: 'Innovation and prototype delivery',
      icon: 'emoji_objects'
    },
    'Vulnerability Research Across Major Technology Organizations': {
      type: 'Security Research',
      venue: 'Global vendor research',
      domains: ['Google', 'Microsoft', 'Apple', 'Cambridge', 'Oxford', 'NASA'],
      signal: 'Major-organization vulnerability research archive',
      icon: 'policy'
    },
    'AI Exploitation Research in Gemini and Grok': {
      type: 'AI Security Research',
      venue: 'AI exploitation research track',
      domains: ['Gemini', 'Grok', 'Prompt Abuse', 'Tool Misuse', 'Guardrail Testing'],
      signal: 'AI exploitation and defensive validation',
      icon: 'psychology'
    },
    'Black Hat USA Invitation by Microsoft': {
      type: 'Researcher Recognition',
      venue: 'Black Hat USA',
      domains: ['Microsoft', 'Security Research', 'Conference Recognition'],
      signal: 'Invitation as a security researcher',
      icon: 'workspace_premium'
    }
  };

  const parseLinks = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean);
    } catch (e) {
      return [value].filter(Boolean);
    }
  };

  const parseContributors = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
    } catch (e) {
      return [value].filter(Boolean);
    }
  };

  const getMeta = (achievement) => eventMeta[achievement.title] || {
    type: 'Lab Milestone',
    venue: 'Incognitrix Lab',
    domains: ['Research', 'Execution', 'Documentation'],
    signal: 'Recorded lab achievement',
    icon: 'military_tech'
  };

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
    const meta = getMeta(selectedAchievement);
    const contribs = parseContributors(selectedAchievement.contributors);
    const links = parseLinks(selectedAchievement.reference_link);

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
          <div className="absolute top-0 right-0 p-12 opacity-5 select-none pointer-events-none material-symbols-outlined text-9xl group-hover:text-primary transition-all group-hover:opacity-10 scale-150 transform-view">{meta.icon}</div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary-container animate-pulse drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">star</span>
              <span className="font-mono text-xs tracking-widest text-primary-container font-bold">{meta.type}</span>
            </div>
            
            <h1 className="font-headline text-5xl md:text-6xl font-black text-on-surface mb-6 tracking-tighter">{selectedAchievement.title}</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-background border border-outline/20 rounded p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1">Venue / Track</div>
                <div className="font-headline text-sm font-bold text-primary">{meta.venue}</div>
              </div>
              <div className="bg-background border border-outline/20 rounded p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1">Signal</div>
                <div className="font-headline text-sm font-bold text-on-surface">{meta.signal}</div>
              </div>
              <div className="bg-background border border-outline/20 rounded p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1">Contributors</div>
                <div className="font-headline text-sm font-bold text-secondary">{contribs.length || 1}</div>
              </div>
            </div>
            
            <div className="bg-surface-dim border-l-4 border-primary p-6 mb-8 rounded-r relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
              <p className="font-mono text-base text-on-surface-variant leading-relaxed relative z-10">
                {selectedAchievement.description}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-background border border-outline-variant p-6 rounded relative shadow-md">
                <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-primary-container font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">category</span> Domains
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {meta.domains.map(domain => (
                    <span key={domain} className="font-mono text-[10px] uppercase px-3 py-1 rounded-full bg-surface-container-high border border-outline/20 text-on-surface-variant">
                      {domain}
                    </span>
                  ))}
                </div>
              </div>

              {selectedAchievement.future_scope && (
                <div className="bg-background border border-outline-variant p-6 rounded relative group shadow-md hover:border-primary-container transition-all">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-primary-container font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">update</span> Future Scope / Next Steps
                  </div>
                  <p className="font-mono text-sm text-on-surface-variant tracking-wide mt-2">{selectedAchievement.future_scope}</p>
                </div>
              )}
              
              {links.length > 0 && (
                <div className="bg-background border border-outline-variant p-6 rounded relative shadow-md">
                  <div className="absolute top-0 left-4 -translate-y-1/2 bg-surface-container-low px-2 font-mono text-xs text-outline font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">link</span> Reference Document
                  </div>
                  {links.map((link, index) => (
                    <a key={index} href={link} target="_blank" rel="noopener noreferrer" className="mt-2 text-primary-container hover:text-primary transition-colors font-mono underline break-all flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg hidden sm:block">smart_display</span>
                      {link}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-surface-dim border border-outline/20 p-5 rounded">
                <span className="material-symbols-outlined text-primary mb-2">school</span>
                <h3 className="font-headline text-sm font-bold text-on-surface mb-1">Academy Value</h3>
                <p className="font-mono text-xs text-outline leading-relaxed">Reusable lessons, writeups, and practice tracks can be produced from this record.</p>
              </div>
              <div className="bg-surface-dim border border-outline/20 p-5 rounded">
                <span className="material-symbols-outlined text-secondary mb-2">flag</span>
                <h3 className="font-headline text-sm font-bold text-on-surface mb-1">Range Value</h3>
                <p className="font-mono text-xs text-outline leading-relaxed">Techniques can become CTF, CVE simulation, forensic, or blue-team exercises.</p>
              </div>
              <div className="bg-surface-dim border border-outline/20 p-5 rounded">
                <span className="material-symbols-outlined text-emerald-400 mb-2">groups</span>
                <h3 className="font-headline text-sm font-bold text-on-surface mb-1">Team Value</h3>
                <p className="font-mono text-xs text-outline leading-relaxed">The result identifies contributors and strengthens product/team evidence trails.</p>
              </div>
            </div>

            {contribs.length > 0 && (
              <div className="mt-8 border-t border-outline/20 pt-8">
                <h3 className="font-headline font-bold text-xl mb-4 text-outline flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">group_work</span> Team Members
                </h3>
                <div className="flex flex-wrap gap-3">
                  {contribs.map((c, i) => (
                    <div key={i} className="bg-surface-container-high px-4 py-2 rounded-full border border-outline/30 font-mono text-xs text-on-surface flex items-center gap-2 hover:bg-primary-container hover:text-on-primary-fixed transition-colors cursor-default shadow-sm">
                      {c.name || c}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface-container-low border ghost-border rounded p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1">Total Records</div>
          <div className="font-headline text-4xl font-bold text-primary">{achievements.length}</div>
        </div>
        <div className="bg-surface-container-low border ghost-border rounded p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1">Competition Records</div>
          <div className="font-headline text-4xl font-bold text-secondary">{achievements.filter(ach => /ctf|quest|blitz/i.test(ach.title)).length}</div>
        </div>
        <div className="bg-surface-container-low border ghost-border rounded p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-outline mb-1">Research Records</div>
          <div className="font-headline text-4xl font-bold text-emerald-400">{achievements.filter(ach => /research|vulnerability|ai|black hat/i.test(ach.title)).length}</div>
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
              <div className="font-mono text-[10px] uppercase tracking-widest text-primary-container mb-2">{getMeta(ach).type}</div>
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

