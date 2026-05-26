/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';
import AdminPanel from './AdminPanel';
import Teams from './Teams';
import CVEs from './CVEs';
import Achievements from './Achievements';
import Individuals from './Individuals';
import IndividualProfile from './IndividualProfile';
import Dashboard from './Dashboard';

import AdminLogin from './AdminLogin';
import UserLogin from './UserLogin';

function App() {
  const [normalUser, setNormalUser] = useState(null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedIndividualId, setSelectedIndividualId] = useState(null);
  const [view, setView] = useState('portal'); // 'portal', 'admin', 'teams', 'cves', 'achievements', 'individuals', 'individual-profile', 'attendance'
  const [adminUser, setAdminUser] = useState(null);
  const [dbProjects, setDbProjects] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoState, setAutoState] = useState('list');
  const [autoIndex, setAutoIndex] = useState(0);
  
  // New Global State Toggle for Data Source
  const [useDatabase, setUseDatabase] = useState(true);

  // Fetch products from the MySQL backend on load
  useEffect(() => {
    if (useDatabase) {
      fetch('/api/projects')
        .then(res => res.json())
        .then(data => {
          // Use backend data if available
          setDbProjects(data);
        })
        .catch(err => console.error("Database not connected yet", err));

      fetch('/api/individuals')
        .then(res => res.json())
        .then(data => {
          setIndividuals(data);
        })
        .catch(err => console.error("Could not load individuals", err));
    } else {
       // Optional: Add logic to fetch individuals strictly from /api/sheets-dashboard if useDatabase is false
       // and translate them. Currently Individuals.jsx does this internally.
    }
  }, [view, useDatabase]); // Refresh when view changes (e.g. coming back from admin)

  // Use DB products if they exist, otherwise fallback to an empty UI state or standard array
  const defaultProjects = [
    {
      id: 'PROJ-1',
      title: 'Incognitrix Academy',
      shortDesc: 'Structured cyber security learning, labs, and skill progression for Incognitrix members.',
      priority: 'Academy Team',
      status: 'ONGOING',
      target: 'Learners',
      team: 'Academy Team',
      image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
    },
    {
      id: 'PROJ-2',
      title: 'Incognitrix Range',
      shortDesc: 'Hands-on CTF and training range for offensive, defensive, and investigation practice.',
      priority: 'Range Team',
      status: 'ONGOING',
      target: 'CTF Range',
      team: 'Range Team',
      hasIcon: 'flag'
    },
    {
      id: 'PROJ-3',
      title: 'Incognitrix Portfolio',
      shortDesc: 'Public portfolio and lab information hub for teams, members, achievements, CVEs, and products.',
      priority: 'Portfolio Team',
      status: 'ACTIVE',
      target: 'Public Portal',
      team: 'Portfolio Team',
      hasIcon: 'dashboard'
    },
    {
      id: 'PROJ-4',
      title: 'AR VR Project',
      shortDesc: 'Augmented and virtual reality security training environments and interactive cyber awareness modules.',
      priority: 'AR VR Team',
      status: 'ONGOING',
      target: 'Immersive Lab',
      team: 'AR VR Team',
      hasIcon: 'view_in_ar'
    }
  ];

  const projects = dbProjects.length > 0 ? dbProjects : defaultProjects;

  // Cycle Hero Section periodically if there are multiple products
  useEffect(() => {
    if (projects.length <= 1 || isAutoMode) return;
    const interval = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % projects.length);
    }, 8000); // Change hero every 8 seconds
    return () => clearInterval(interval);
  }, [projects, isAutoMode]);

  // Auto Mode Engine
  useEffect(() => {
    if (!isAutoMode) return;

    let timeout;
    if (view === 'portal') {
      if (projects.length === 0) return;
      if (autoState === 'list') {
        setSelectedProject(null);
        setActiveHeroIndex(autoIndex % projects.length);
        timeout = setTimeout(() => {
          setSelectedProject(projects[autoIndex % projects.length]);
          setAutoState('detail');
        }, 3000);
      } else if (autoState === 'detail') {
        timeout = setTimeout(() => {
          setAutoIndex((prev) => prev + 1);
          setAutoState('list');
        }, 5000);
      }
    } else if (view === 'individuals' || view === 'individual-profile') {
      if (individuals.length === 0) return;
      if (autoState === 'list') {
        setView('individuals');
        setSelectedIndividualId(null);
        timeout = setTimeout(() => {
          setSelectedIndividualId(individuals[autoIndex % individuals.length].id);
          setView('individual-profile');
          setAutoState('detail');
        }, 3000);
      } else if (autoState === 'detail') {
        timeout = setTimeout(() => {
          setAutoIndex((prev) => prev + 1);
          setAutoState('list');
        }, 5000);
      }
    } else {
      // Auto mode not supported in other views, silently pause
    }

    return () => clearTimeout(timeout);
  }, [isAutoMode, view, autoState, autoIndex, projects, individuals]);

  const activeHeroProject = projects[activeHeroIndex] || null;
  const defaultImage = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop";

  const parseJsonArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch(e) {
      return [];
    }
  };

  // Helper function to render the Product List
  const renderProductList = () => (
    <div className="animate-fade-slide">
      {activeHeroProject && (
        <div className="relative w-full h-[512px] min-h-[400px] flex flex-col justify-end p-8 md:p-12 border-b ghost-border mb-12 overflow-hidden group">
          <div className="absolute inset-0 z-0 overflow-hidden transition-all duration-1000 ease-in-out">
            <img 
              alt={activeHeroProject.title} 
              className="w-full h-full object-cover opacity-30 mix-blend-luminosity scale-105 group-hover:scale-100 transition-transform duration-[10s]" 
              src={activeHeroProject.image || defaultImage}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent"></div>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6 max-w-7xl mx-auto w-full">
            <div className="flex-1 max-w-3xl">
              <div className="flex items-center space-x-3 mb-4">
                <span className="h-2 w-2 bg-primary-container rounded-full animate-pulse shadow-[0_0_8px_rgba(0,245,255,0.8)]"></span>
                <span className="font-mono text-xs tracking-widest text-primary-container uppercase jarvis-text">PRIORITY: {activeHeroProject.priority || 'ALPHA'}</span>
              </div>
              <h1 className="font-headline font-black text-5xl md:text-7xl text-on-surface tracking-tighter mb-2 transition-all jarvis-text">{activeHeroProject.title}</h1>
              <p className="font-mono text-sm text-on-surface-variant max-w-xl leading-relaxed line-clamp-3">
                {activeHeroProject.description || activeHeroProject.shortDesc}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-4 bg-surface-dim border-outline-variant/60 backdrop-blur-md p-4 rounded border ghost-border group-hover:border-primary-container/30 transition-colors">
              <div className="text-right">
                <div className="font-mono text-[10px] text-outline mb-1">NETWORK STATUS</div>
                <div className="font-mono text-sm text-primary">SECURE / {activeHeroProject.status === 'ONGOING' ? '99.9%' : '100%'} UPTIME</div>
              </div>
              <div className="text-right">
                  <div className="font-mono text-[10px] text-outline mb-1">{activeHeroProject.activeNodes ? 'ACTIVE NODES' : 'ACTIVE DIRECTIVE'}</div>
                  <div className="font-mono text-sm text-on-surface uppercase">{activeHeroProject.activeNodes || activeHeroProject.status}</div>
              </div>
              <button 
                onClick={() => setSelectedProject(activeHeroProject)}
                className="mt-2 px-6 py-2 bg-primary-container text-on-primary-fixed font-headline font-bold text-sm rounded shadow-[0_0_15px_rgba(0,245,255,0.2)] hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all"
              >
                ACCESS CONSOLE
              </button>
            </div>
          </div>
          
          {/* Carousel Indicators */}
          {projects.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {projects.map((_, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setActiveHeroIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${idx === activeHeroIndex ? 'w-6 bg-primary-container shadow-[0_0_8px_rgba(0,245,255,0.8)]' : 'w-2 bg-outline/50 hover:bg-outline'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 pb-12">
        <div className="flex justify-between items-end mb-8 border-b ghost-border pb-4">
          <h2 className="font-headline font-bold text-2xl tracking-tight text-on-surface">Active Products</h2>
          <div className="flex space-x-4">
            <button className="font-mono text-xs text-outline hover:text-primary-container transition-colors">FILTER: ALL</button>
            <button className="font-mono text-xs text-primary-container transition-colors">SORT: PRIORITY</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {projects.map((proj, idx) => (
            <div 
              key={proj.id || idx}
              onClick={() => setSelectedProject(proj)}
              className={`col-span-1 md:col-span-${idx % 3 === 0 ? '8' : '4'} relative bg-surface-dim border-outline-variant-high rounded ghost-border p-6 group hover:bg-surface-bright transition-colors duration-300 cursor-pointer overflow-hidden`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all font-headline font-black text-6xl select-none pointer-events-none">
                {String(idx + 1).padStart(2, '0')}
              </div>
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center space-x-2">
                  <span className={`material-symbols-outlined text-lg ${proj.priority?.toLowerCase().includes('red') ? 'text-error' : proj.priority?.toLowerCase().includes('blue') ? 'text-primary-container' : 'text-tertiary-fixed-dim'}`}>{proj.hasIcon || (proj.priority?.toLowerCase().includes('red') ? 'local_fire_department' : proj.priority?.toLowerCase().includes('blue') ? 'shield' : 'schema')}</span>
                  <span className={`font-mono text-xs tracking-widest ${proj.priority?.toLowerCase().includes('red') ? 'text-error' : proj.priority?.toLowerCase().includes('blue') ? 'text-primary-container' : 'text-tertiary-fixed-dim'}`}>
                    {proj.priority || 'NETWORK OPS'}
                  </span>
                </div>
                <span className={`font-mono text-[10px] px-2 py-1 rounded border ${proj.status === 'ONGOING' ? 'bg-error/10 text-error border-error/20' : proj.status === 'RESOLVED' ? 'bg-outline/10 text-outline border-outline/20' : 'bg-primary-container/10 text-primary-container border-primary-container/20'}`}>{proj.status || 'ACTIVE'}</span>
              </div>
              <h3 className="font-headline font-bold text-3xl mb-2 group-hover:text-primary transition-colors relative z-10">{proj.title}</h3>
                <p className="font-mono text-sm text-outline mb-8 max-w-2xl relative z-10 line-clamp-3">
                  {proj.description || proj.shortDesc}
                </p>

                {proj.lastEvent ? (
                  <div className="flex justify-between items-center border-t ghost-border pt-4 relative z-10">
                    <div className="font-mono text-[10px] text-outline">LAST EVENT: {proj.lastEvent}</div>
                    <span className="material-symbols-outlined text-outline">arrow_forward</span>
                  </div>
                ) : proj.status === 'RESOLVED' ? (
                  <div className="border-t ghost-border pt-4 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                     <span className="material-symbols-outlined text-outline text-sm">arrow_forward</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t ghost-border pt-4 relative z-10">
                    <div>
                      <div className="font-mono text-[10px] text-outline mb-1">CREATED BY</div>
                      <div className="font-mono text-xs text-on-surface truncate">{proj.team || proj.priority || 'Incognitrix Lab'}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] text-outline mb-1">STATUS</div>
                      <div className="font-mono text-xs text-on-surface truncate">{proj.status || 'ACTIVE'}</div>
                    </div>
                    <div className="text-right hidden md:block">
                      <button className="font-mono text-xs text-primary-container uppercase hover:text-primary transition-colors">+ VIEW LOGS</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          {projects.length === 0 && (
            <div className="col-span-full py-20 text-center font-mono text-outline">
              <span className="material-symbols-outlined text-4xl mb-4 block">dns</span>
              No active products connecting to master database at this time.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Helper function to render a single Product Details view
  const renderProductDetails = (project) => (
    <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full flex flex-col gap-12 animate-fade-slide">
      <button 
        onClick={() => setSelectedProject(null)}
        className="self-start flex items-center gap-2 font-mono text-xs text-outline hover:text-primary-container transition-colors mb-4"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        RETURN TO PRODUCTS
      </button>

      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div className="max-w-2xl">
          <div className="font-mono text-xs text-primary-container mb-2 tracking-widest">ID: {project.id} // STATUS: {project.status}</div>
              <h1 className="font-headline text-5xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-4">{project.title}</h1>
          <p className="text-on-surface-variant text-lg">{project.description || project.shortDesc}</p>
        </div>
        <div className="flex flex-col items-end text-right">
          <div className="font-mono text-xs text-outline mb-1 uppercase">Priority Level</div>
          <div className="font-mono text-sm text-error">{project.priority}</div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Main Visual Image Area */}
          <div className="w-full h-64 md:h-80 bg-surface-dim border-outline-variant overflow-hidden rounded border ghost-border group relative">
            <div className="absolute top-0 left-0 w-1 h-1 bg-primary"></div>
            <div className="absolute top-0 right-0 w-1 h-1 bg-primary"></div>
            <div className="absolute bottom-0 left-0 w-1 h-1 bg-primary"></div>
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-primary"></div>
            <img src={project.image || defaultImage} alt={project.title} className="w-full h-full object-cover mix-blend-luminosity opacity-40 group-hover:opacity-60 transition-opacity" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
          </div>

          <div className="bg-surface-dim border-outline-variant-high ghost-border relative p-8">
            <h2 className="font-headline text-xl font-bold text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-sm">account_tree</span>
              Technical Overview & Stack
            </h2>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <div className="font-mono text-xs text-outline uppercase mb-1">Stack Utilized</div>
                <div className="font-mono text-sm text-primary">{(() => { let st = project.stack; if (typeof st === "string") { try { st = JSON.parse(st); } catch(e) {} } return Array.isArray(st) ? st.join(" / ") : st || ""; })()}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-outline uppercase mb-1">Beneficiaries</div>
                <div className="font-mono text-sm text-primary">{project.beneficiaries}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-outline uppercase mb-1">Team Deployed</div>
                <div className="font-mono text-sm text-primary">{project.team}</div>
              </div>
            </div>

            <div className="bg-surface-dim border-outline-variant-lowest border-b border-primary/30 p-4 relative group">
              <div className="font-mono text-xs text-outline uppercase mb-2">How It Is Used</div>
              <p className="font-mono text-sm text-on-surface-variant leading-relaxed">
                {project.usage_desc}
              </p>
              <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-primary-container transition-all duration-300 group-hover:w-full"></div>
            </div>
          </div>

          {/* Tactical Milestones Timeline */}
          <div className="bg-surface-dim border-outline-variant-low p-8 border ghost-border group relative">
            <div className="absolute top-0 left-0 w-1 h-1 bg-primary cursor-pointer"></div>
            <h2 className="font-headline text-xl font-bold text-primary mb-8 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-sm">linear_scale</span>
              Product Timeline
            </h2>
            <div className="relative pl-6 border-l ghost-border">
              {parseJsonArray(project.timeline).map((item, idx) => (
                <div key={idx} className={`mb-8 relative group ${!item.active && item.phase?.includes('PENDING') ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`}>
                  {item.active ? (
                    <div className="absolute -left-[31px] top-1 w-3 h-3 bg-surface border-2 border-primary-container rounded-full animate-pulse shadow-[0_0_10px_rgba(0,245,255,0.4)]"></div>
                  ) : item.phase?.includes('PENDING') ? (
                    <div className="absolute -left-[31px] top-1 w-3 h-3 bg-surface border border-outline rounded-full"></div>
                  ) : (
                    <div className="absolute -left-[31px] top-1 w-3 h-3 bg-primary-container rounded-full shadow-[0_0_10px_rgba(0,245,255,0.4)]"></div>
                  )}
                  <div className={`font-mono text-xs mb-1 ${item.active ? 'text-primary-container' : item.phase.includes('PENDING') ? 'text-outline' : 'text-primary-container'}`}>{item.phase}</div>
                  <h3 className="font-headline text-lg text-primary mb-2 group-hover:text-primary-container transition-colors">{item.title}</h3>
                  <p className="text-sm text-on-surface-variant font-mono">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Assigned Operatives & Actions */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Assigned Operatives List */}
          <div className="bg-surface-dim border-outline-variant-low p-6 rounded-lg ghost-border">
            <h2 className="font-headline text-lg font-bold text-primary mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-sm">group</span>
              Assigned Operatives
            </h2>
            <div className="flex flex-col gap-6">
              {(() => { 
                let pOps = project.operatives;
                if (typeof pOps === 'string') { try { pOps = JSON.parse(pOps); } catch(e) { pOps = []; } }
                const ops = individuals.filter(ind => {
                  const pTeam = String(project.team || "").toLowerCase();
                  const pPriority = String(project.priority || "").toLowerCase();
                  const iTeam = String(ind.team_name || "").toLowerCase();
                  return iTeam && (iTeam === pTeam || iTeam === pPriority);
                }).concat(Array.isArray(pOps) ? pOps.map(op => typeof op === 'string' ? { name: op, role: 'Operative' } : op) : []); 
                return ops.map((op, idx) => (
                <div 
                  key={idx} 
                  onClick={() => {
                    if (op.id) {
                      setSelectedIndividualId(op.id);
                      setView('individual-profile');
                    }
                  }}
                  className="flex items-center gap-4 group p-2 -m-2 hover:bg-surface-bright rounded hover:cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded bg-surface-dim border-outline-variant-highest dark:bg-surface-dim border-outline-variant-low flex items-center justify-center overflow-hidden ghost-border">
                    {op.avatar ? (
                      <img 
                        src={op.avatar} 
                        alt={op.name} 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-outline">person</span>
                    )}
                  </div>
                  <div>
                    <div className="font-headline text-sm font-bold text-primary">{op.name}</div>
                    <div className={`font-mono text-xs ${op.role?.includes('ANALYST') || op.role?.includes('NODE') ? 'text-outline' : 'text-primary-container'}`}>{op.role}</div>
                  </div>
                </div>
              ))})()}
            </div>
            <button className="mt-6 w-full text-left font-mono text-xs text-outline hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">add</span>
              REQUEST RESOURCE ALLOCATION
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-on-surface font-body blueprint-grid relative">
      {/* Navigation Bar */}
      <header className="relative w-full border-b ghost-border bg-surface-dim border-outline-variant/80 backdrop-blur-md z-50 shrink-0">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center">
              <span className="font-headline font-bold tracking-widest text-on-surface text-lg uppercase jarvis-text hologram">Incognitirx lab</span>
          </div>
          <nav className="hidden md:flex space-x-6 items-center">
            <button 
              onClick={() => { setView('dashboard'); setSelectedProject(null); }}
              className={`font-mono text-xs tracking-widest pb-1 transition-colors ${view === 'dashboard' ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => { setView('portal'); setSelectedProject(null); }}
              className={`font-mono text-xs tracking-widest pb-1 transition-colors ${view === 'portal' && !selectedProject ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              PRODUCTS
            </button>
            <button 
              onClick={() => setView('teams')}
              className={`font-mono text-xs tracking-widest pb-1 transition-colors ${view === 'teams' ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              TEAMS
            </button>
            <button 
              onClick={() => { setView('individuals'); setSelectedProject(null); }}
              className={`font-mono text-xs tracking-widest pb-1 transition-colors ${view === 'individuals' || view === 'individual-profile' ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              INDIVIDUALS
            </button>
            <button 
              onClick={() => { setView('achievements'); setSelectedProject(null); }}
              className={`font-mono text-xs tracking-widest pb-1 transition-colors ${view === 'achievements' ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              ACHIEVEMENTS
            </button>
            <button 
              onClick={() => { setView('cves'); setSelectedProject(null); }}
              className={`font-mono text-xs tracking-widest mr-4 pb-1 transition-colors ${view === 'cves' ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              CVES
            </button>
            <button 
              onClick={() => { setView('attendance'); setSelectedProject(null); }}
              className={`font-mono text-xs tracking-widest mr-4 pb-1 transition-colors ${view === 'attendance' ? 'text-primary-container border-b-2 border-primary-container' : 'text-outline hover:text-primary-container'}`}
            >
              ATTENDANCE
            </button>
            <button 
              onClick={() => setView('admin')}
              className={`font-mono text-xs font-bold px-3 py-1 rounded transition-all ${view === 'admin' ? 'bg-primary text-on-primary-fixed' : 'border border-primary text-primary hover:bg-primary hover:text-on-primary-fixed'}`}
            >
              ADMIN
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto">
        {view === 'admin' ? (
          adminUser ? (
            <AdminPanel onBack={() => setView('portal')} adminUser={adminUser} onLogout={() => setAdminUser(null)} />
          ) : (
            <AdminLogin onLogin={(user) => setAdminUser(user)} />
          )
        ) : view === 'attendance' ? (
          <UserLogin onLogin={() => setView('portal')} />
        ) : view === 'dashboard' ? <Dashboard useDatabase={useDatabase} /> : view === 'teams' ? <Teams useDatabase={useDatabase} onSelectProject={(p) => { setSelectedProject(p); setView('portal'); }} onSelectIndividual={(id) => { setSelectedIndividualId(id); setView('individual-profile'); }} /> : view === 'individuals' ? <Individuals useDatabase={useDatabase} onSelectIndividual={(id) => { setSelectedIndividualId(id); setView('individual-profile'); }} /> : view === 'individual-profile' ? <IndividualProfile useDatabase={useDatabase} individualId={selectedIndividualId} projects={projects} onNavigateToProject={(p) => { setSelectedProject(p); setView('portal'); }} onNavigateToTeam={() => setView('teams')} onBack={() => { setView('individuals'); setSelectedIndividualId(null); }} /> : view === 'cves' ? <CVEs useDatabase={useDatabase} /> : view === 'achievements' ? <Achievements useDatabase={useDatabase} /> : (selectedProject ? renderProductDetails(selectedProject) : renderProductList())}
      </main>

      {/* Special Alive Effects Overlay */}
      <div className="pointer-events-none fixed inset-0 z-40 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9InRyYW5zcGFyZW50Ii8+PGxpbmUgeDE9IjAiIHkxPSIwIiB4Mj0iNCIgeTI9IjAiIHN0cm9rZT0icmdiYSgwLCAyNDUsIDI1NSwgMC4wMikiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-50 mix-blend-screen"></div>
      <div className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
      <div className="ambient-particles pointer-events-none fixed inset-0 z-30"></div>

      {/* Floating Global Data Toggles and Auto Mode */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
        <button 
          onClick={() => setUseDatabase(!useDatabase)}
          className={`px-4 py-2 flex items-center gap-2 rounded-full border shadow-lg font-mono text-xs font-bold tracking-widest transition-all duration-300 ${useDatabase ? 'bg-secondary text-background border-secondary shadow-[0_0_20px_rgba(255,107,107,0.6)]' : 'bg-surface-container/80 backdrop-blur-sm text-outline border-outline/30 hover:text-secondary hover:border-secondary/50'}`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {useDatabase ? 'database' : 'table_view'}
          </span>
          {useDatabase ? 'DB SOURCE' : 'SHEET SOURCE'}
        </button>

        <button 
          onClick={() => {
            setIsAutoMode(!isAutoMode);
            setAutoState('list');
            setAutoIndex(0);
            if (view !== 'portal' && view !== 'individuals' && view !== 'individual-profile') {
              setView('portal');
              setSelectedProject(null);
            }
          }}
          className={`px-4 py-2 flex items-center gap-2 rounded-full border shadow-lg font-mono text-xs font-bold tracking-widest transition-all duration-300 ${isAutoMode ? 'bg-primary text-on-primary-fixed border-primary shadow-[0_0_20px_rgba(0,245,255,0.6)] animate-pulse' : 'bg-surface-container/80 backdrop-blur-sm text-outline border-outline/30 hover:text-primary hover:border-primary/50'}`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isAutoMode ? 'smart_toy' : 'settings_b_roll'}
          </span>
          AUTO {isAutoMode ? 'ON' : 'OFF'}
        </button>
      </div>

    </div>
  );
}

export default App;











