/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import AdminPanel from './AdminPanel';
import Teams from './Teams';
import CVEs from './CVEs';
import UpcomingCTFs from './UpcomingCTFs';
import Achievements from './Achievements';
import Individuals from './Individuals';
import IndividualProfile from './IndividualProfile';
import Dashboard from './Dashboard';
import Alumni from './Alumni';

import AdminLogin from './AdminLogin';
import UserLogin from './UserLogin';
import StudentLogin from './StudentLogin';
import StudentDashboard from './StudentDashboard';

function App() {
  const [normalUser, setNormalUser] = useState(null);
  const [studentUser, setStudentUser] = useState(() => sessionStorage.getItem('studentToken') ? { username: 'student' } : null);

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedIndividualId, setSelectedIndividualId] = useState(null);
  const [view, setView] = useState('portal'); // 'portal', 'admin', 'teams', 'cves', 'upcoming-ctfs', 'achievements', 'individuals', 'individual-profile', 'attendance'
  const [adminUser, setAdminUser] = useState(null);
  const [dbProjects, setDbProjects] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoIndex, setAutoIndex] = useState(0);
  
  // New Global State Toggle for Data Source
  const [useDatabase, setUseDatabase] = useState(true);

  // Fetch products from the MySQL backend on load
  useEffect(() => {
    if (useDatabase && !isAutoMode) {
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
  }, [view, useDatabase, isAutoMode]);

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

  const autoTourSteps = useMemo(() => {
    const productSteps = [
      { view: 'portal', selectedProject: null },
      ...projects.map((project, index) => ({ view: 'portal', selectedProject: project, heroIndex: index }))
    ];
    const individualSteps = [
      { view: 'individuals', selectedIndividualId: null },
      ...individuals.map(individual => ({ view: 'individual-profile', selectedIndividualId: individual.id }))
    ];

    return [
      { view: 'dashboard' },
      ...productSteps,
      { view: 'teams' },
      ...individualSteps,
      { view: 'achievements' },
      { view: 'cves' },
      { view: 'upcoming-ctfs' },
      { view: 'attendance' }
    ].filter(step => step.view !== 'individual-profile' || step.selectedIndividualId);
  }, [dbProjects, individuals]);

  const scrollAutoPage = () => {
    const container = mainRef.current;
    if (!container) return () => {};

    let animationFrame = null;
    const animateScroll = (targetTop, duration) => {
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      const startTop = container.scrollTop;
      const distance = targetTop - startTop;
      const startTime = performance.now();

      const tick = (currentTime) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        container.scrollTop = startTop + (distance * easedProgress);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(tick);
        } else {
          animationFrame = null;
        }
      };

      animationFrame = requestAnimationFrame(tick);
    };

    container.scrollTo({ top: 0, behavior: 'auto' });
    const scrollDown = setTimeout(() => {
      animateScroll(Math.max(container.scrollHeight - container.clientHeight, 0), 5200);
    }, 700);
    const scrollUp = setTimeout(() => {
      animateScroll(0, 3200);
    }, 9000);

    return () => {
      clearTimeout(scrollDown);
      clearTimeout(scrollUp);
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    };
  };

  // Auto Mode Engine
  useEffect(() => {
    if (!isAutoMode) return;

    if (autoTourSteps.length === 0) return;

    const step = autoTourSteps[autoIndex % autoTourSteps.length];
    const stepTimer = setTimeout(() => {
      setView(step.view);
      setSelectedProject(step.selectedProject || null);
      setSelectedIndividualId(step.selectedIndividualId || null);
      if (typeof step.heroIndex === 'number') {
        setActiveHeroIndex(step.heroIndex);
      }
    }, 0);

    let stopScrolling = () => {};
    const scrollStartTimer = setTimeout(() => {
      stopScrolling = scrollAutoPage();
    }, 150);
    const nextTimer = setTimeout(() => {
      setAutoIndex((prev) => prev + 1);
    }, 15000);

    return () => {
      clearTimeout(stepTimer);
      clearTimeout(scrollStartTimer);
      clearTimeout(nextTimer);
      stopScrolling();
    };
  }, [isAutoMode, autoIndex, autoTourSteps]);

  const activeHeroProject = projects[activeHeroIndex] || null;
  const defaultImage = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop";
  const sideNavItems = useMemo(() => [
    { view: 'dashboard', label: 'Dashboard', icon: 'dashboard', meta: 'Live' },
    { view: 'portal', label: 'Products', icon: 'inventory_2', meta: String(projects.length || 0) },
    { view: 'teams', label: 'Teams', icon: 'groups', meta: 'Ops' },
    { view: 'individuals', label: 'Individuals', icon: 'badge', meta: String(individuals.length || 0) },
    { view: 'achievements', label: 'Achievements', icon: 'military_tech', meta: 'Intel' },
    { view: 'alumni', label: 'Alumni', icon: 'workspace_premium', meta: 'Network' },
    { view: 'cves', label: 'CVEs', icon: 'bug_report', meta: 'CVE' },
    { view: 'upcoming-ctfs', label: 'CTFs', icon: 'flag', meta: 'Events' }
  ], [projects.length, individuals.length]);
  const activeShellItem = sideNavItems.find(item => (
    item.view === 'portal'
      ? view === 'portal' && !selectedProject
      : item.view === 'individuals'
        ? view === 'individuals' || view === 'individual-profile'
        : view === item.view
  ));

  const handleSideNavSelect = (item) => {
    setView(item.view);
    setIsMobileSidebarOpen(false);
    if (item.view !== 'portal') setSelectedProject(null);
    if (item.view !== 'individuals') setSelectedIndividualId(null);
  };

  const renderSidebar = (isMobile = false) => (
    <>
      <div className={`flex items-center gap-2 py-2 ${isSidebarExpanded || isMobile ? 'justify-between px-2' : 'justify-center'}`}>
        {(isSidebarExpanded || isMobile) && (
          <div>
            <div className="font-mono text-[10px] text-outline uppercase tracking-widest">Navigation</div>
            <div className="font-mono text-[9px] text-primary/70 uppercase tracking-widest mt-0.5">{sideNavItems.length} modules</div>
          </div>
        )}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setIsSidebarExpanded(prev => !prev)}
            className="w-10 h-10 rounded border border-outline/30 text-outline hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
            title={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={isSidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="material-symbols-outlined text-[18px]">{isSidebarExpanded ? 'left_panel_close' : 'left_panel_open'}</span>
          </button>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="w-10 h-10 rounded border border-outline/30 text-outline hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
            aria-label="Close navigation"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {sideNavItems.map(item => {
          const active = item.view === 'portal'
            ? view === 'portal' && !selectedProject
            : item.view === 'individuals'
              ? view === 'individuals' || view === 'individual-profile'
              : view === item.view;
          const showLabels = isSidebarExpanded || isMobile;
          return (
            <button
              key={item.view}
              title={item.label}
              onClick={() => handleSideNavSelect(item)}
              className={`group relative w-full flex items-center rounded border py-3 font-mono text-xs uppercase tracking-widest transition-all ${showLabels ? 'gap-3 px-3 text-left' : 'justify-center px-0'} ${active ? 'bg-primary/15 text-primary border-primary/30 shadow-[inset_3px_0_0_rgba(0,245,255,0.9)]' : 'text-outline border-transparent hover:text-primary hover:bg-primary/5'}`}
            >
              <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
              {showLabels && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  <span className={`text-[9px] rounded px-1.5 py-0.5 border ${active ? 'border-primary/30 text-primary' : 'border-outline/20 text-outline/70'}`}>{item.meta}</span>
                </>
              )}
              {!showLabels && (
                <span className="pointer-events-none absolute left-full ml-3 rounded border border-outline/20 bg-surface-container px-2 py-1 text-[10px] text-on-surface opacity-0 shadow-lg transition-opacity group-hover:opacity-100 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );

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
        <div className="relative w-full min-h-[430px] flex flex-col justify-end p-6 md:p-10 border-b ghost-border mb-10 overflow-hidden group">
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
              <h1 className="font-headline font-black text-4xl md:text-5xl lg:text-6xl text-on-surface tracking-tight leading-[0.95] mb-4 transition-all jarvis-text break-words max-w-5xl">{activeHeroProject.title}</h1>
              <p className="font-mono text-sm text-on-surface-variant max-w-2xl leading-relaxed line-clamp-3">
                {activeHeroProject.description || activeHeroProject.shortDesc}
              </p>
            </div>
            <div className="w-full md:w-auto flex flex-row md:flex-col justify-between md:items-end gap-4 bg-surface-dim/90 border-outline-variant/60 backdrop-blur-md p-4 rounded border ghost-border group-hover:border-primary-container/30 transition-colors">
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
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden w-10 h-10 rounded border border-outline/30 text-outline hover:text-primary hover:border-primary/40 flex items-center justify-center transition-colors"
              aria-label="Open navigation"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="min-w-0">
              <span className="block font-headline font-bold tracking-widest text-on-surface text-base md:text-lg uppercase jarvis-text hologram truncate">Incognitrix lab</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,245,255,0.8)]"></span>
                <span className="font-mono text-[10px] text-outline uppercase tracking-widest truncate">{activeShellItem?.label || selectedProject?.title || view}</span>
              </div>
            </div>
          </div>
          <nav className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => { setView('attendance'); setSelectedProject(null); }}
              className={`h-10 px-3 rounded border font-mono text-[10px] md:text-xs tracking-widest uppercase transition-colors flex items-center gap-2 ${view === 'attendance' ? 'bg-primary/15 text-primary border-primary/40' : 'text-outline border-outline/20 hover:text-primary hover:border-primary/40'}`}
            >
              <span className="material-symbols-outlined text-[16px] hidden sm:inline">how_to_reg</span>
              <span className="hidden sm:inline">Attendance</span>
              <span className="sm:hidden">Att</span>
            </button>
            <button
              onClick={() => { setView('student'); setSelectedProject(null); }}
              className={`h-10 px-3 rounded border font-mono text-[10px] md:text-xs tracking-widest uppercase transition-colors flex items-center gap-2 ${view === 'student' ? 'bg-secondary/15 text-secondary border-secondary/40' : 'text-outline border-outline/20 hover:text-secondary hover:border-secondary/40'}`}
            >
              <span className="material-symbols-outlined text-[16px] hidden sm:inline">school</span>
              <span className="hidden sm:inline">Student</span>
              <span className="sm:hidden">Stu</span>
            </button>
            <button
              onClick={() => setView('admin')}
              className={`h-10 px-3 rounded border font-mono text-[10px] md:text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${view === 'admin' ? 'bg-primary text-on-primary-fixed border-primary' : 'border-primary/50 text-primary hover:bg-primary hover:text-on-primary-fixed'}`}
            >
              <span className="material-symbols-outlined text-[16px] hidden sm:inline">admin_panel_settings</span>
              Admin
            </button>
          </nav>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-[70] md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation overlay"
            ></button>
            <aside className="relative z-10 h-full w-[min(320px,86vw)] border-r border-outline-variant/50 bg-surface-dim p-4 flex flex-col gap-2 shadow-2xl">
              {renderSidebar(true)}
            </aside>
          </div>
        )}
        <aside className={`hidden md:flex shrink-0 border-r border-outline-variant/50 bg-surface-dim/80 backdrop-blur-md z-40 flex-col p-3 gap-2 transition-[width] duration-300 ${isSidebarExpanded ? 'w-64' : 'w-20'}`}>
          {renderSidebar()}
        </aside>

      <main ref={mainRef} className="flex-1 w-full overflow-y-auto scroll-smooth">
        {!['admin', 'attendance', 'student'].includes(view) && (
          <div className="sticky top-0 z-30 border-b border-outline/10 bg-background/80 backdrop-blur-md px-4 md:px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-primary text-[18px]">{activeShellItem?.icon || 'inventory_2'}</span>
              <span className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-on-surface truncate">{selectedProject?.title || activeShellItem?.label || 'Products'}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-outline">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              DB {useDatabase ? 'Active' : 'Sheet'}
            </div>
          </div>
        )}
        {view === 'admin' ? (
          adminUser ? (
            <AdminPanel onBack={() => setView('portal')} adminUser={adminUser} onLogout={() => {
              sessionStorage.removeItem('adminToken');
              setAdminUser(null);
            }} />
          ) : (
            <AdminLogin onLogin={(user) => setAdminUser(user)} />
          )
        ) : view === 'attendance' ? (
          <UserLogin onLogin={() => setView('portal')} />
        ) : view === 'student' ? (
          studentUser ? (
            <StudentDashboard onLogout={() => {
              sessionStorage.removeItem('studentToken');
              setStudentUser(null);
            }} />
          ) : (
            <StudentLogin onLogin={(data) => setStudentUser(data)} />
          )
        ) : view === 'dashboard' ? <Dashboard useDatabase={useDatabase} /> : view === 'teams' ? <Teams useDatabase={useDatabase} onSelectProject={(p) => { setSelectedProject(p); setView('portal'); }} onSelectIndividual={(id) => { setSelectedIndividualId(id); setView('individual-profile'); }} /> : view === 'individuals' ? <Individuals useDatabase={useDatabase} onSelectIndividual={(id) => { setSelectedIndividualId(id); setView('individual-profile'); }} /> : view === 'individual-profile' ? <IndividualProfile useDatabase={useDatabase} individualId={selectedIndividualId} projects={projects} onNavigateToProject={(p) => { setSelectedProject(p); setView('portal'); }} onNavigateToTeam={() => setView('teams')} onBack={() => { setView('individuals'); setSelectedIndividualId(null); }} /> : view === 'alumni' ? <Alumni /> : view === 'cves' ? <CVEs useDatabase={useDatabase} /> : view === 'upcoming-ctfs' ? <UpcomingCTFs /> : view === 'achievements' ? <Achievements useDatabase={useDatabase} /> : (selectedProject ? renderProductDetails(selectedProject) : renderProductList())}
      </main>
      </div>

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
            setAutoIndex(0);
            setView('dashboard');
            setSelectedProject(null);
            setSelectedIndividualId(null);
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











