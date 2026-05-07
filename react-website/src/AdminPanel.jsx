/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect, useCallback } from 'react';
import SimpleMdeReact from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

const API_URL = '/api/projects';
const TEAMS_API_URL = '/api/teams';
const INDIVIDUALS_API_URL = '/api/individuals';
const CVES_API_URL = '/api/cves';
const ACHIEVEMENTS_API_URL = '/api/achievements';
const FUTURE_SCOPES_API_URL = '/api/future_scopes';

function AdminPanel({ onBack, adminUser, onLogout }) {
  const [activeAdminView, setActiveAdminView] = useState('dashboard'); // 'dashboard' | 'projects-list' | 'add-project' | 'teams-list' | 'add-team' | 'individuals-list' | 'add-individual' | 'cves-list' | 'add-cve' | 'achievements-list' | 'add-achievement' | 'future-scopes-list' | 'add-future-scope' | 'admin-settings'
  const [editingId, setEditingId] = useState(null);
  
  // Data States
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [cves, setCves] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [futureScopes, setFutureScopes] = useState([]);

  // Form States
  const [formData, setFormData] = useState({
    id: '', title: '', status: 'ONGOING', priority: 'Red team', 
    description: '', shortDesc: '', image: '', stack: '', 
    beneficiaries: '', team: '', usage_desc: '', timeline: '', operatives: ''
  });

  const [teamFormData, setTeamFormData] = useState({ name: '', description: '', technical_summary: '', current_objective: '' });
  
  const [individualFormData, setIndividualFormData] = useState({
    name: '', role: '', team_id: '', department: '', year_of_study: '', image: '',
    achievements: [], certificates: [], research_work: []
  });

  const [cveFormData, setCveFormData] = useState({ cve_number: '', details: '', poc: '', reference_link: [''], contributors: [] });
  const [achievementFormData, setAchievementFormData] = useState({ title: '', description: '', reference_link: [''], future_scope: '', contributors: [] });
const [futureScopeFormData, setFutureScopeFormData] = useState({ title: '', category: 'RESEARCH', priority: 'Normal', description: '', proposed_date: '', reference_link: [''] });

  const handleSimpleMdeChange = useCallback((value, field, setter, formData) => {
    setter({ ...formData, [field]: value });
  }, []);

  const handleLinkArrayChange = (field, index, value, setter, formData) => {
    const updatedArray = [...formData[field]];
    updatedArray[index] = value;
    setter({ ...formData, [field]: updatedArray });
  };

  const addLinkItem = (field, setter, formData) => {
    setter({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeLinkItem = (field, index, setter, formData) => {
    const updatedArray = formData[field].filter((_, i) => i !== index);
    setter({ ...formData, [field]: updatedArray });
  };

  const handleIndividualArrayChange = (field, index, key, value) => {
    const updatedArray = [...individualFormData[field]];
    updatedArray[index][key] = value;
    setIndividualFormData({ ...individualFormData, [field]: updatedArray });
  };

  const addArrayItem = (field, template) => {
    setIndividualFormData({
      ...individualFormData,
      [field]: [...individualFormData[field], template]
    });
  };

  const removeArrayItem = (field, index) => {
    const updatedArray = individualFormData[field].filter((_, i) => i !== index);
    setIndividualFormData({ ...individualFormData, [field]: updatedArray });
  };

  useEffect(() => {
    fetchProjects();
    fetchTeams();
    fetchIndividuals();
    fetchCves();
    fetchAchievements();
    fetchFutureScopes();
  }, []);

  const fetchFutureScopes = async () => {
    try {
      const response = await fetch(FUTURE_SCOPES_API_URL);
      const data = await response.json();
      setFutureScopes(data);
    } catch (err) {
      console.error('Failed to fetch future scopes', err);
    }
  };

  const fetchCves = async () => {
    try {
      const response = await fetch(CVES_API_URL);
      const data = await response.json();
      setCves(data);
    } catch (err) {
      console.error('Failed to fetch CVEs', err);
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await fetch(ACHIEVEMENTS_API_URL);
      const data = await response.json();
      setAchievements(data);
    } catch (err) {
      console.error('Failed to fetch achievements', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(TEAMS_API_URL);
      const data = await response.json();
      setTeams(data);
    } catch (err) {
      console.error('Failed to fetch teams', err);
    }
  };

  const fetchIndividuals = async () => {
    try {
      const response = await fetch(INDIVIDUALS_API_URL);
      const data = await response.json();
      setIndividuals(data);
    } catch (err) {
      console.error('Failed to fetch individuals', err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTeamChange = (e) => {
    setTeamFormData({ ...teamFormData, [e.target.name]: e.target.value });
  };

  const handleIndividualChange = (e) => {
    setIndividualFormData({ ...individualFormData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      setIndividualFormData({ ...individualFormData, image: data.imageUrl });
    } catch (err) {
      console.error('Error uploading image', err);
      alert('Failed to upload image');
    }
  };

  const handleCveChange = (e) => {
    setCveFormData({ ...cveFormData, [e.target.name]: e.target.value });
  };

  const handleAchievementChange = (e) => {
    setAchievementFormData({ ...achievementFormData, [e.target.name]: e.target.value });
  };

  const handleFutureScopeChange = (e) => {
    setFutureScopeFormData({ ...futureScopeFormData, [e.target.name]: e.target.value });
  };

  // PROJECT HANDLERS
  const handleEditProject = (proj) => {
    setFormData({
      id: proj.id || "",
      title: proj.title || "",
      status: proj.status || "ONGOING",
      priority: proj.priority || "Red team",
      description: proj.description || "",
      shortDesc: proj.shortDesc || "",
      image: proj.image || "",
      beneficiaries: proj.beneficiaries || "",
      team: proj.team || "",
      usage_desc: proj.usage_desc || "",
      operatives: proj.operatives || "",
      stack: (Array.isArray(proj.stack) ? proj.stack : (typeof proj.stack === "string" ? (() => { try { return JSON.parse(proj.stack); } catch(e) { return [proj.stack]; } })() : [])).join(', '),
      // Ensure other fields not present in table but needed in form don't fail
      timeline: proj.timeline && Array.isArray(proj.timeline) && proj.timeline[0] ? proj.timeline[0].desc?.replace('Launch targeted for ', '') || '' : ''
    });
    setEditingId(proj.id);
    setActiveAdminView('add-project');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Parse JSON strings back to arrays/objects if they are provided, else empty arrays
    const formattedData = {
      ...formData,
      stack: formData.stack ? formData.stack.split(',').map(s => s.trim()) : [],
      timeline: formData.timeline ? [
        { phase: "SCHEDULED", title: "Target Execution", desc: `Launch targeted for ${formData.timeline}`, active: true }
      ] : [],
      operatives: [
        { name: "Agent Alpha", role: "FIELD OPERATIVE", avatar: null },
        { name: "Unit-04", role: "SUPPORT NODE", avatar: null }
      ]
    };

    try {
      const targetUrl = editingId ? `${API_URL}/${editingId}` : API_URL;
      await fetch(targetUrl, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formattedData)
      });
      fetchProjects(); // Refresh list
      alert(`Project ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setFormData({
        id: '', title: '', status: 'ONGOING', priority: 'Red team', 
        description: '', shortDesc: '', image: '', stack: '', 
        beneficiaries: '', team: '', usage_desc: '', timeline: '', operatives: ''
      });
      setEditingId(null);
      setActiveAdminView('projects-list');
    } catch (err) {
      console.error('Failed to save project', err);
      alert('Error saving project. Check console.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  // TEAM HANDLERS
  const handleEditTeam = (team) => {
    setTeamFormData({ 
      name: team.name, 
      description: team.description,
      technical_summary: team.technical_summary || '',
      current_objective: team.current_objective || ''
    });
    setEditingId(team.id);
    setActiveAdminView('add-team');
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    try {
      const targetUrl = editingId ? `${TEAMS_API_URL}/${editingId}` : TEAMS_API_URL;
      await fetch(targetUrl, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamFormData)
      });
      fetchTeams();
      alert(`Team ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setTeamFormData({ name: '', description: '', technical_summary: '', current_objective: '' });
      setEditingId(null);
      setActiveAdminView('teams-list');
    } catch (err) {
      console.error('Failed to save team', err);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('Delete this team?')) return;
    try {
      await fetch(`${TEAMS_API_URL}/${id}`, { method: 'DELETE' });
      fetchTeams();
    } catch (err) {
      console.error('Failed to delete team', err);
    }
  };

  // INDIVIDUAL HANDLERS
  const handleEditIndividual = (ind) => {
    let ach = [], certs = [], research = [];
    try { ach = typeof ind.achievements === 'string' ? JSON.parse(ind.achievements) : ind.achievements || []; } catch(e){}
    try { certs = typeof ind.certificates === 'string' ? JSON.parse(ind.certificates) : ind.certificates || []; } catch(e){}
    try { research = typeof ind.research_work === 'string' ? JSON.parse(ind.research_work) : ind.research_work || []; } catch(e){}

    setIndividualFormData({
      ...ind,
      team_id: ind.team_id || '',
      achievements: ach,
      certificates: certs,
      research_work: research
    });
    setEditingId(ind.id);
    setActiveAdminView('add-individual');
  };

  const handleIndividualSubmit = async (e) => {
    e.preventDefault();
    try {
      const targetUrl = editingId ? `${INDIVIDUALS_API_URL}/${editingId}` : INDIVIDUALS_API_URL;
      await fetch(targetUrl, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(individualFormData)
      });
      fetchIndividuals();
      alert(`Individual ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setIndividualFormData({
        name: '', role: '', team_id: '', department: '', year_of_study: '', image: '',
        achievements: [], certificates: [], research_work: []
      });
      setEditingId(null);
      setActiveAdminView('individuals-list');
    } catch (err) {
      console.error('Failed to save individual', err);
    }
  };

  const handleDeleteIndividual = async (id) => {
    if (!window.confirm('Delete this individual?')) return;
    try {
      await fetch(`${INDIVIDUALS_API_URL}/${id}`, { method: 'DELETE' });
      fetchIndividuals();
    } catch (err) {
      console.error('Failed to delete individual', err);
    }
  };

  const handleUpdateMemberRole = async (ind, newRole) => {
    try {
      const payload = { ...ind, role: newRole };
      await fetch(`${INDIVIDUALS_API_URL}/${ind.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchIndividuals();
    } catch (err) {
      console.error('Failed to update member role', err);
    }
  };

  const handleRemoveMemberFromTeam = async (ind) => {
    try {
      const payload = { ...ind, team_id: null };
      await fetch(`${INDIVIDUALS_API_URL}/${ind.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchIndividuals();
    } catch (err) {
      console.error('Failed to remove member from team', err);
    }
  };

  // CVE HANDLERS
  const handleEditCve = (cve) => {
    let contribs = [];
    try { contribs = typeof cve.contributors === 'string' ? JSON.parse(cve.contributors) : cve.contributors || []; } catch(e){}
    setCveFormData({
      ...cve,
      contributors: contribs
    });
    setEditingId(cve.id);
    setActiveAdminView('add-cve');
  };

  const handleCveSubmit = async (e) => {
    e.preventDefault();
    try {
      const targetUrl = editingId ? `${CVES_API_URL}/${editingId}` : CVES_API_URL;
      await fetch(targetUrl, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cveFormData)
      });
      fetchCves();
      alert(`CVE ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setCveFormData({ cve_number: '', details: '', poc: '', reference_link: '', contributors: [] });
      setEditingId(null);
      setActiveAdminView('cves-list');
    } catch (err) {
      console.error('Failed to save CVE', err);
    }
  };

  const handleDeleteCve = async (id) => {
    if (!window.confirm('Delete this CVE?')) return;
    try {
      await fetch(`${CVES_API_URL}/${id}`, { method: 'DELETE' });
      fetchCves();
    } catch (err) {
      console.error('Failed to delete CVE', err);
    }
  };

  // ACHIEVEMENT HANDLERS
  const handleEditAchievement = (ach) => {
    let contribs = [];
    try { contribs = typeof ach.contributors === 'string' ? JSON.parse(ach.contributors) : ach.contributors || []; } catch(e){}
    setAchievementFormData({
      ...ach,
      reference_link: ach.reference_link ? (typeof ach.reference_link === 'string' ? JSON.parse(ach.reference_link) : ach.reference_link) : [''],
      contributors: contribs
    });
    setEditingId(ach.id);
    setActiveAdminView('add-achievement');
  };

  const handleAchievementSubmit = async (e) => {
    e.preventDefault();
    try {
      const targetUrl = editingId ? `${ACHIEVEMENTS_API_URL}/${editingId}` : ACHIEVEMENTS_API_URL;
      await fetch(targetUrl, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(achievementFormData)
      });
      fetchAchievements();
      alert(`Achievement ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setAchievementFormData({ title: '', description: '', reference_link: [''], future_scope: '', contributors: [] });
      setEditingId(null);
      setActiveAdminView('achievements-list');
    } catch (err) {
      console.error('Failed to save achievement', err);
    }
  };

  // FUTURE SCOPES HANDLERS
  const handleEditFutureScope = (fs) => {
    setFutureScopeFormData({
      title: fs.title || '',
        category: fs.category || 'RESEARCH',
        priority: fs.priority || 'Normal',
        description: fs.description || '',
        proposed_date: fs.proposed_date ? new Date(fs.proposed_date).toISOString().split('T')[0] : '',
        reference_link: Array.isArray(JSON.parse(fs.reference_link || '[]')) ? JSON.parse(fs.reference_link || '[]') : [fs.reference_link || '']
      });
      setEditingId(fs.id);
      setActiveAdminView('add-future-scope');
    };

    const handleFutureScopeSubmit = async (e) => {
      e.preventDefault();
      try {
        const targetUrl = editingId ? `${FUTURE_SCOPES_API_URL}/${editingId}` : FUTURE_SCOPES_API_URL;
        await fetch(targetUrl, {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...futureScopeFormData,
            reference_link: JSON.stringify(futureScopeFormData.reference_link.filter(Boolean))
          })
        });
        fetchFutureScopes();
        alert(`Future Scope ${editingId ? 'Updated' : 'Added'} Successfully!`);
        setFutureScopeFormData({ title: '', category: 'RESEARCH', priority: 'Normal', description: '', proposed_date: '', reference_link: [''] });
      } catch (err) {
        console.error('Error submitting future scope:', err);
        alert('Failed to save future scope. Please check the network tab.');
      }
    };

    const handleDeleteFutureScope = async (id) => {
    if (!window.confirm('Delete this future scope?')) return;
    try {
      await fetch(`${FUTURE_SCOPES_API_URL}/${id}`, { method: 'DELETE' });
      fetchFutureScopes();
    } catch (err) {
      console.error('Failed to delete future scope', err);
    }
  };

  return (
    <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full flex flex-col gap-8 text-on-surface">
      <button 
        onClick={activeAdminView === 'dashboard' ? onBack : () => setActiveAdminView('dashboard')}
        className="self-start flex items-center gap-2 font-mono text-xs text-outline hover:text-primary-container transition-colors mb-4"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        {activeAdminView === 'dashboard' ? 'RETURN TO PORTAL' : 'BACK TO ADMIN DASHBOARD'}
      </button>

      <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight text-primary">ADMIN CONSOLE</h1>
      <p className="text-on-surface-variant font-mono text-sm max-w-2xl mb-4">
        {activeAdminView === 'dashboard' && "Manage portal contents, threat intel statuses, and active directives."}
        {activeAdminView === 'projects-list' && "Manage your project listings. Actions are logged."}
        {activeAdminView === 'add-project' && "Initialize a new project operation into the master database."}
      </p>

      {/* DASHBOARD VIEW */}
      {activeAdminView === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {/* Projects Card */}
          <div 
            onClick={() => setActiveAdminView('projects-list')}
            className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
              <span className="material-symbols-outlined text-3xl">folder_special</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">PROJECTS</h2>
            </div>
            <p className="font-mono text-sm text-on-surface-variant">View, add, and manage existing operational projects and active directives within the system.</p>
            <div className="mt-6 flex justify-between items-center text-outline text-xs font-mono">
              <span>{projects.length} Total</span>
              <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
            </div>
          </div>

          {/* Teams Card */}
          <div 
            onClick={() => setActiveAdminView('teams-list')}
            className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
              <span className="material-symbols-outlined text-3xl">group</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">TEAMS</h2>
            </div>
            <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Manage teams, organizational structures, and view collective directives.</p>
            <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
              <span>{teams?.length || 0} Total</span>
              <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
            </div>
          </div>

          {/* Individuals Card */}
          <div 
            onClick={() => setActiveAdminView('individuals-list')}
            className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
              <span className="material-symbols-outlined text-3xl">person</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">INDIVIDUALS</h2>
            </div>
            <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Manage individual operatives, their assignments, achievements, and research records.</p>
            <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
              <span>{individuals?.length || 0} Total</span>
              <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
            </div>
          </div>

          {/* CVEs Card */}
          <div 
            onClick={() => setActiveAdminView('cves-list')}
            className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
              <span className="material-symbols-outlined text-3xl">bug_report</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">CVEs</h2>
            </div>
            <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Manage discovered vulnerabilities and threat reports.</p>
            <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
              <span>{cves?.length || 0} Total</span>
              <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
            </div>
          </div>

          {/* Achievements Card */}
          <div 
            onClick={() => setActiveAdminView('achievements-list')}
            className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
              <span className="material-symbols-outlined text-3xl">emoji_events</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">AWARDS</h2>
            </div>
              <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Manage Lab achievements and awards.</p>
              <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
                <span>{achievements?.length || 0} Total</span>
                <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
              </div>
            </div>

            {/* Future Scopes Card */}
            <div 
              onClick={() => setActiveAdminView('future-scopes-list')}
              className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
            >
              <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
                <span className="material-symbols-outlined text-3xl">science</span>
                <h2 className="font-headline text-2xl font-bold tracking-wider">FUTURE SCOPES</h2>
              </div>
              <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Manage prospective research items and tech directions.</p>
              <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
                <span>{futureScopes?.length || 0} Total</span>
                <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
              </div>
            </div>

            {/* Admin Settings Card */}
            <div 
              onClick={() => setActiveAdminView('admin-settings')}
              className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
            >
              <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
                <span className="material-symbols-outlined text-3xl">manage_accounts</span>
                <h2 className="font-headline text-2xl font-bold tracking-wider">SETTINGS</h2>
              </div>
              <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Manage settings, users, and admin access.</p>
              <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
                <span>Users</span>
                <span className="group-hover:text-primary transition-colors">ACCESS &rarr;</span>
              </div>
            </div>
          </div>
        )}

      {/* PROJECTS LIST VIEW */}
      {activeAdminView === 'projects-list' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-surface-container/50 p-6 rounded border ghost-border">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Active Projects Database</h2>
              <p className="font-mono text-xs text-outline mt-1">Listing all integrated directives</p>
            </div>
            <button 
              onClick={() => {
                setFormData({
                  id: '', title: '', status: 'ONGOING', priority: 'Red team', 
                  description: '', shortDesc: '', image: '', stack: '', 
                  beneficiaries: '', team: '', usage_desc: '', timeline: '', operatives: ''
                });
                setEditingId(null);
                setActiveAdminView('add-project');
              }}
              className="px-6 py-3 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.3)] font-headline font-bold rounded flex items-center gap-2 hover:shadow-[0_0_20px_rgba(0,245,255,0.6)] transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              NEW PROJECT
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {projects.length === 0 ? (
              <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
                <p className="text-outline font-mono text-sm">No records found. Database is currently empty.</p>
              </div>
            ) : (
              projects.map(proj => (
                <div key={proj.id} className="bg-background border border-outline/20 p-5 rounded flex lg:items-center justify-between flex-col lg:flex-row gap-4 hover:border-primary/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="font-mono text-xs font-bold text-primary-container bg-primary-container/10 w-fit px-2 py-0.5 rounded tracking-widest">{proj.id}</div>
                    <div className="font-headline text-xl font-bold">{proj.title}</div>
                    <div className="font-mono text-xs text-outline">{proj.shortDesc}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 lg:mt-0 sm:gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-[10px] text-outline mb-0.5">STATUS</div>
                      <div className="font-mono text-xs text-on-surface uppercase">{proj.status}</div>
                    </div>
                    <button 
                      onClick={() => handleEditProject(proj)}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      EDIT
                    </button>
                    <button 
                      onClick={() => handleDelete(proj.id)}
                      className="text-error hover:bg-error/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-error/20"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      PURGE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT PROJECT VIEW */}
      {activeAdminView === 'add-project' && (
        <div className="bg-surface-container-highest p-8 border ghost-border rounded form-container max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline text-2xl text-primary font-bold">{editingId ? 'Edit Project' : 'New Project Entry'}</h2>
            <button onClick={() => {
              setActiveAdminView('projects-list');
              setEditingId(null);
            }} className="text-outline hover:text-on-surface text-sm font-mono transition-colors">CANCEL</button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-mono text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Project ID</label>
                <input name="id" value={formData.id} onChange={handleChange} required disabled={!!editingId} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors disabled:opacity-50" placeholder="e.g. OP-OMEGA" />
              </div>
              <div>
                <label className="text-outline block mb-1">Title</label>
                <input name="title" value={formData.title} onChange={handleChange} required className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="Project Title" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Status</label>
                <select name="status" onChange={handleChange} value={formData.status} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors">
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FUTURE DEVELOPMENT">Future Development</option>
                </select>
              </div>
              <div>
                <label className="text-outline block mb-1">Priority (Team)</label>
                <select name="priority" onChange={handleChange} value={formData.priority} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors">
                  <option value="Red team">Red team</option>
                  <option value="Blue team">Blue team</option>
                  <option value="cve">CVE</option>
                  <option value="project team">Project team</option>
                  <option value="VAPT">VAPT</option>
                  <option value="network">Network</option>
                  <option value="research team">Research team</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="text-outline block mb-1">Short Description</label>
              <input name="shortDesc" value={formData.shortDesc} onChange={handleChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="Short intro summary" />
            </div>
            <div>
              <label className="text-outline block mb-1">Full Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="Detailed operation description..."></textarea>
            </div>
            <div>
              <label className="text-outline block mb-1">Cover Image URL</label>
              <input name="image" value={formData.image} onChange={handleChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="https://..." />
            </div>
            <div>
              <label className="text-outline block mb-1">Tech Stack & Variables (comma separated)</label>
              <input name="stack" value={formData.stack} onChange={handleChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="React, Node.js, MySQL, AES-256" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Beneficiaries</label>
                <input name="beneficiaries" value={formData.beneficiaries} onChange={handleChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Sector 7 Defense Grid" />
              </div>
              <div>
                <label className="text-outline block mb-1">Team Affiliation</label>
                  <select name="team" value={formData.team} onChange={handleChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors">
                    <option value="">-- Independent / No Team --</option>
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
              </div>
            </div>
            
            <div>
              <label className="text-outline block mb-1">Usage / Deployment Description</label>
              <textarea name="usage_desc" value={formData.usage_desc} onChange={handleChange} rows="2" className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="How is this utilized in the field?"></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-surface-container/30 p-4 rounded border border-outline/10">
              <div>
                <label className="text-outline block mb-1">Target Date (Timeline)</label>
                <div className="flex gap-2">
                  <span className="bg-surface-container-low flex items-center px-3 border border-outline/30 rounded-l border-r-0"><span className="material-symbols-outlined text-outline text-sm">calendar_month</span></span>
                  <input type="date" name="timeline" value={formData.timeline} onChange={handleChange} className="w-full bg-background border border-outline/30 rounded-r p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="text-outline block mb-1">Operatives (JSON Array)</label>
                <textarea name="operatives" readOnly rows="2" className="w-full bg-surface-container-low border border-outline/20 rounded p-2 text-on-surface text-xs focus:outline-none opacity-60 cursor-not-allowed" placeholder='[{"name": "Placeholder", "role": "ANALYST", "avatar": null}]'></textarea>
                <div className="text-[10px] text-outline mt-1 text-right">AUTOMATICALLY ASSIGNED</div>
              </div>
            </div>

            <button type="submit" className="mt-6 w-full h-12 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.2)] font-headline font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
              {editingId ? 'UPDATE DIRECTIVE (SAVE)' : 'INITIALIZE DIRECTIVE (SAVE)'}
            </button>
          </form>
        </div>
      )}

      {/* TEAMS LIST VIEW */}
      {activeAdminView === 'teams-list' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-surface-container/50 p-6 rounded border ghost-border">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Teams Database</h2>
              <p className="font-mono text-xs text-outline mt-1">Listing all internal active teams</p>
            </div>
            <button 
              onClick={() => {
                setTeamFormData({ name: '', description: '', technical_summary: '', current_objective: '' });
                setEditingId(null);
                setActiveAdminView('add-team');
              }}
              className="px-6 py-3 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.3)] font-headline font-bold rounded flex items-center gap-2 hover:shadow-[0_0_20px_rgba(0,245,255,0.6)] transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              NEW TEAM
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {teams.length === 0 ? (
              <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
                <p className="text-outline font-mono text-sm">No teams found. Database is currently empty.</p>
              </div>
            ) : (
              teams.map(team => (
                <div key={team.id} className="bg-background border border-outline/20 p-5 rounded flex lg:items-center justify-between flex-col lg:flex-row gap-4 hover:border-primary/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="font-mono text-xs font-bold text-primary-container bg-primary-container/10 w-fit px-2 py-0.5 rounded tracking-widest">TEAM ID: {team.id}</div>
                    <div className="font-headline text-xl font-bold">{team.name}</div>
                    <div className="font-mono text-xs text-outline">{team.description}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 lg:mt-0 sm:gap-6">
                    <button 
                      onClick={() => handleEditTeam(team)}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      EDIT
                    </button>
                    <button 
                      onClick={() => handleDeleteTeam(team.id)}
                      className="text-error hover:bg-error/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-error/20"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      PURGE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT TEAM VIEW */}
      {activeAdminView === 'add-team' && (
        <div className="bg-surface-container-highest p-8 border ghost-border rounded form-container max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline text-2xl text-primary font-bold">{editingId ? 'Edit Team Entry' : 'New Team Entry'}</h2>
            <button onClick={() => {
              setActiveAdminView('teams-list');
              setEditingId(null);
            }} className="text-outline hover:text-on-surface text-sm font-mono transition-colors">CANCEL</button>
          </div>
          <form onSubmit={handleTeamSubmit} className="flex flex-col gap-5 font-mono text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Team Name</label>
                <input name="name" value={teamFormData.name} onChange={handleTeamChange} required className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Red Team" />
              </div>
              <div>
                <label className="text-outline block mb-1">Short Description</label>
                <input name="description" value={teamFormData.description} onChange={handleTeamChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Defensive Operations" />
              </div>
            </div>
            <div>
              <label className="text-outline block mb-1">Technical Summary</label>
              <textarea name="technical_summary" value={teamFormData.technical_summary} onChange={handleTeamChange} rows="3" className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="Proactive threat hunting, incident response..."></textarea>
            </div>
            <div>
              <label className="text-outline block mb-1">Current Objective</label>
              <textarea name="current_objective" value={teamFormData.current_objective} onChange={handleTeamChange} rows="2" className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="Patch deployment across Alpha nodes."></textarea>
            </div>
            <button type="submit" className="mt-6 w-full h-12 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.2)] font-headline font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
              {editingId ? 'UPDATE TEAM' : 'INITIALIZE TEAM'}
            </button>
          </form>

          {editingId && (
            <div className="mt-8 pt-8 border-t border-outline/20">
              <h3 className="font-headline text-lg text-primary font-bold mb-4">Assigned Operatives</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {individuals.filter(ind => String(ind.team_id) === String(editingId)).length === 0 ? (
                  <p className="text-outline font-mono text-xs col-span-2">No operatives currently assigned to this team.</p>
                ) : (
                  individuals.filter(ind => String(ind.team_id) === String(editingId)).map(ind => (
                    <div key={ind.id} className="bg-background border border-outline/20 p-4 rounded flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-headline font-bold text-base">{ind.name}</div>
                          <div className="font-mono text-[10px] text-outline mt-0.5">{ind.department || 'NO DEPT'}</div>
                        </div>
                        <button 
                          onClick={() => handleRemoveMemberFromTeam(ind)}
                          title="Terminate Deployment"
                          className="text-error hover:bg-error/10 p-1.5 rounded transition-colors flex items-center justify-center border border-transparent hover:border-error/20"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                      
                      <div className="mt-1 pt-3 border-t border-outline/10 flex justify-between items-center">
                        <label className="text-[10px] font-mono text-outline uppercase tracking-wider">Access Tier / Role</label>
                        <select 
                          value={ind.role || 'Member'} 
                          onChange={(e) => handleUpdateMemberRole(ind, e.target.value)}
                          className="bg-surface-container border border-outline/30 rounded px-2 py-1 text-xs font-mono text-on-surface focus:border-primary focus:outline-none"
                        >
                          <option value="Lead">Lead</option>
                          <option value="Co Lead">Co Lead</option>
                          <option value="Coordinator">Coordinator</option>
                          <option value="Member">Member</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* INDIVIDUALS LIST VIEW */}
      {activeAdminView === 'individuals-list' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-surface-container/50 p-6 rounded border ghost-border">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Individuals / Operatives Database</h2>
              <p className="font-mono text-xs text-outline mt-1">Listing all internal personnel</p>
            </div>
            <button 
              onClick={() => {
                setIndividualFormData({
                  name: '', role: '', team_id: '', department: '', year_of_study: '', image: '',
                  achievements: [], certificates: [], research_work: []
                });
                setEditingId(null);
                setActiveAdminView('add-individual');
              }}
              className="px-6 py-3 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.3)] font-headline font-bold rounded flex items-center gap-2 hover:shadow-[0_0_20px_rgba(0,245,255,0.6)] transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              NEW INDIVIDUAL
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {individuals.length === 0 ? (
              <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
                <p className="text-outline font-mono text-sm">No individuals found. Database is currently empty.</p>
              </div>
            ) : (
              individuals.map(ind => (
                <div key={ind.id} className="bg-background border border-outline/20 p-5 rounded flex lg:items-center justify-between flex-col lg:flex-row gap-4 hover:border-primary/50 transition-colors">
                  <div className="flex flex-col gap-1">
                    <div className="font-mono text-xs font-bold text-primary-container bg-primary-container/10 w-fit px-2 py-0.5 rounded tracking-widest">{ind.role || 'OPERATIVE'} / {ind.department || 'NO DEPT'}</div>
                    <div className="font-headline text-xl font-bold">{ind.name}</div>
                    <div className="font-mono text-xs text-outline">Team: {ind.team_name || 'UNASSIGNED'}</div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 lg:mt-0 sm:gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-[10px] text-outline mb-0.5">YEAR</div>
                      <div className="font-mono text-xs text-on-surface uppercase">{ind.year_of_study || 'N/A'}</div>
                    </div>
                    <button 
                      onClick={() => handleEditIndividual(ind)}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      EDIT
                    </button>
                    <button 
                      onClick={() => handleDeleteIndividual(ind.id)}
                      className="text-error hover:bg-error/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-error/20"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      PURGE
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD / EDIT INDIVIDUAL VIEW */}
      {activeAdminView === 'add-individual' && (
        <div className="bg-surface-container-highest p-8 border ghost-border rounded form-container max-w-4xl mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline text-2xl text-primary font-bold">{editingId ? 'Edit Individual Entry' : 'New Individual Entry'}</h2>
            <button onClick={() => {
              setActiveAdminView('individuals-list');
              setEditingId(null);
            }} className="text-outline hover:text-on-surface text-sm font-mono transition-colors">CANCEL</button>
          </div>
          <form onSubmit={handleIndividualSubmit} className="flex flex-col gap-5 font-mono text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Full Name</label>
                <input name="name" value={individualFormData.name} onChange={handleIndividualChange} required className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Agent Smith" />
              </div>
              <div>
                <label className="text-outline block mb-1">Role / Title</label>
                <input name="role" value={individualFormData.role} onChange={handleIndividualChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Lead Analyst" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Assign to Team</label>
                <select name="team_id" value={individualFormData.team_id} onChange={handleIndividualChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors">
                  <option value="">-- No Team / Unassigned --</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-outline block mb-1">Department</label>
                <input name="department" value={individualFormData.department} onChange={handleIndividualChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. Computer Science, VAPT" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-outline block mb-1">Year of Study / Experience</label>
                <input name="year_of_study" value={individualFormData.year_of_study} onChange={handleIndividualChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors" placeholder="e.g. 3rd Year" />
              </div>
              <div>
                <label className="text-outline block mb-1">Image Upload</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none transition-colors" />
                {individualFormData.image && (
                  <div className="mt-2">
                    <img src={individualFormData.image} alt="Preview" className="h-16 w-16 object-cover border border-outline/30" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-container/30 p-4 rounded border border-outline/10 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-outline font-bold">Achievements</label>
                <button type="button" onClick={() => addArrayItem('achievements', { title: '', description: '', date: '' })} className="text-xs text-primary bg-primary/10 px-3 py-1 rounded hover:bg-primary/20 transition-colors">+ ADD ACHIEVEMENT</button>
              </div>
              {individualFormData.achievements.map((ach, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-container-low p-3 border border-outline/20 rounded relative">
                  <button type="button" onClick={() => removeArrayItem('achievements', index)} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md">✕</button>
                  <input value={ach.title} onChange={(e) => handleIndividualArrayChange('achievements', index, 'title', e.target.value)} placeholder="Title" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input value={ach.description} onChange={(e) => handleIndividualArrayChange('achievements', index, 'description', e.target.value)} placeholder="Description" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input type="date" value={ach.date} onChange={(e) => handleIndividualArrayChange('achievements', index, 'date', e.target.value)} required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                </div>
              ))}
              {individualFormData.achievements.length === 0 && <div className="text-xs text-outline italic">No achievements added.</div>}
            </div>

            <div className="bg-surface-container/30 p-4 rounded border border-outline/10 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-outline font-bold">Certificates</label>
                <button type="button" onClick={() => addArrayItem('certificates', { title: '', issued_by: '', date: '', skill_earned: '' })} className="text-xs text-primary bg-primary/10 px-3 py-1 rounded hover:bg-primary/20 transition-colors">+ ADD CERTIFICATE</button>
              </div>
              {individualFormData.certificates.map((cert, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-surface-container-low p-3 border border-outline/20 rounded relative">
                  <button type="button" onClick={() => removeArrayItem('certificates', index)} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md">✕</button>
                  <input value={cert.title} onChange={(e) => handleIndividualArrayChange('certificates', index, 'title', e.target.value)} placeholder="Title" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input value={cert.issued_by} onChange={(e) => handleIndividualArrayChange('certificates', index, 'issued_by', e.target.value)} placeholder="Issued By" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input value={cert.skill_earned} onChange={(e) => handleIndividualArrayChange('certificates', index, 'skill_earned', e.target.value)} placeholder="Skill Earned" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input type="date" value={cert.date} onChange={(e) => handleIndividualArrayChange('certificates', index, 'date', e.target.value)} required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                </div>
              ))}
              {individualFormData.certificates.length === 0 && <div className="text-xs text-outline italic">No certificates added.</div>}
            </div>

            <div className="bg-surface-container/30 p-4 rounded border border-outline/10 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <label className="text-outline font-bold">Research Papers / Work</label>
                <button type="button" onClick={() => addArrayItem('research_work', { title: '', publisher: '', date: '' })} className="text-xs text-primary bg-primary/10 px-3 py-1 rounded hover:bg-primary/20 transition-colors">+ ADD PAPER</button>
              </div>
              {individualFormData.research_work.map((paper, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-container-low p-3 border border-outline/20 rounded relative">
                  <button type="button" onClick={() => removeArrayItem('research_work', index)} className="absolute -top-2 -right-2 bg-error text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md">✕</button>
                  <input value={paper.title} onChange={(e) => handleIndividualArrayChange('research_work', index, 'title', e.target.value)} placeholder="Title" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input value={paper.publisher} onChange={(e) => handleIndividualArrayChange('research_work', index, 'publisher', e.target.value)} placeholder="Publisher" required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                  <input type="date" value={paper.date} onChange={(e) => handleIndividualArrayChange('research_work', index, 'date', e.target.value)} required className="w-full bg-background border border-outline/30 rounded p-2 text-on-surface text-xs" />
                </div>
              ))}
              {individualFormData.research_work.length === 0 && <div className="text-xs text-outline italic">No research papers added.</div>}
            </div>

            <button type="submit" className="mt-6 w-full h-12 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.2)] font-headline font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
              {editingId ? 'UPDATE INDIVIDUAL' : 'INITIALIZE INDIVIDUAL'}
            </button>
          </form>
        </div>
      )}

      {/* CVES LIST VIEW */}
      {activeAdminView === 'cves-list' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden">
            <div>
              <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container">CVE DIRECTORY</h2>
              <p className="font-mono text-sm text-on-surface-variant">Active discovered vulnerabilities and threat assignments.</p>
            </div>
            <button 
              onClick={() => { setEditingId(null); setCveFormData({ cve_number: '', details: '', poc: '', reference_link: '', contributors: [] }); setActiveAdminView('add-cve'); }}
              className="bg-primary/20 hover:bg-primary/30 text-primary px-6 py-3 font-bold font-mono text-sm border border-primary/50 shadow-[0_0_10px_rgba(0,245,255,0.1)] transition-all rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.3)] z-10"
            >
              + ADD CVE REPORT
            </button>
            <div className="absolute -right-10 -bottom-10 text-9xl text-outline/5 material-symbols-outlined select-none pointer-events-none">bug_report</div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {cves.map(cve => (
              <div key={cve.id} className="bg-surface-container-low border border-outline/20 p-4 shrink-0 rounded flex justify-between">
                <div>
                  <h3 className="font-bold text-lg text-primary">{cve.cve_number}</h3>
                  <div className="text-sm font-mono text-on-surface line-clamp-1">{cve.details}</div>
                </div>
                <div className="flex gap-2 h-10 w-24 text-xs font-bold shrink-0">
                  <button onClick={() => handleEditCve(cve)} className="flex-1 bg-surface-container-highest border border-outline/30 hover:bg-primary hover:text-on-primary-fixed transition-colors material-symbols-outlined rounded text-base">edit</button>
                  <button onClick={() => handleDeleteCve(cve.id)} className="flex-1 bg-error-container border border-error hover:bg-error hover:text-white transition-colors material-symbols-outlined rounded text-base">delete</button>
                </div>
              </div>
            ))}
            {cves.length === 0 && <div className="p-8 text-center text-outline font-mono italic">No CVEs recorded.</div>}
          </div>
        </div>
      )}

      {/* ADD/EDIT CVE */}
      {activeAdminView === 'add-cve' && (
        <div className="max-w-3xl mx-auto w-full bg-surface-container-low p-6 md:p-8 rounded border ghost-border relative overflow-hidden">
          <div className="absolute top-4 right-4 text-6xl text-outline/5 material-symbols-outlined pointer-events-none select-none">edit_document</div>
          <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container mb-6 border-b border-outline/20 pb-4">
            {editingId ? 'UPDATE CVE REPORT' : 'INITIALIZE NEW CVE REPORT'}
          </h2>
          <form onSubmit={handleCveSubmit} className="flex flex-col gap-5 text-sm font-mono">
            <div className="grid grid-cols-1 gap-5">
              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">CVE Number <span className="text-error">*</span></div>
                <input name="cve_number" required value={cveFormData.cve_number} onChange={handleCveChange} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="CVE-YYYY-XXXX" />
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Details <span className="text-error">*</span></div>
                <textarea name="details" required value={cveFormData.details} onChange={handleCveChange} rows="3" className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="Description of the vulnerability..."></textarea>
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Proof of Concept (PoC)</div>
                <textarea name="poc" value={cveFormData.poc} onChange={handleCveChange} rows="2" className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="Steps to reproduce, payloads, or links..."></textarea>
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Reference Link</div>
                <input name="reference_link" value={cveFormData.reference_link} onChange={handleCveChange} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="https://nvd.nist.gov/vuln/detail/CVE..." />
              </label>
            </div>
            
            <button type="submit" className="mt-6 w-full h-12 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.2)] font-headline font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
              {editingId ? 'UPDATE CVE' : 'SUBMIT CVE'}
            </button>
          </form>
        </div>
      )}

      {/* ACHIEVEMENTS LIST VIEW */}
      {activeAdminView === 'achievements-list' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden">
            <div>
              <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container">ACHIEVEMENT DIRECTORY</h2>
              <p className="font-mono text-sm text-on-surface-variant">Lab awards, honors, and milestone accomplishments.</p>
            </div>
            <button 
              onClick={() => { setEditingId(null); setAchievementFormData({ title: '', description: '', reference_link: '', future_scope: '', contributors: [] }); setActiveAdminView('add-achievement'); }}
              className="bg-primary/20 hover:bg-primary/30 text-primary px-6 py-3 font-bold font-mono text-sm border border-primary/50 shadow-[0_0_10px_rgba(0,245,255,0.1)] transition-all rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.3)] z-10"
            >
              + RECORD ACHIEVEMENT
            </button>
            <div className="absolute -right-10 -bottom-10 text-9xl text-outline/5 material-symbols-outlined select-none pointer-events-none">emoji_events</div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {achievements.map(ach => (
              <div key={ach.id} className="bg-surface-container-low border border-outline/20 p-4 shrink-0 rounded flex justify-between">
                <div>
                  <h3 className="font-bold text-lg text-primary">{ach.title}</h3>
                  <div className="text-sm font-mono text-on-surface line-clamp-1">{ach.description}</div>
                </div>
                <div className="flex gap-2 h-10 w-24 text-xs font-bold shrink-0">
                  <button onClick={() => handleEditAchievement(ach)} className="flex-1 bg-surface-container-highest border border-outline/30 hover:bg-primary hover:text-on-primary-fixed transition-colors material-symbols-outlined rounded text-base">edit</button>
                  <button onClick={() => handleDeleteAchievement(ach.id)} className="flex-1 bg-error-container border border-error hover:bg-error hover:text-white transition-colors material-symbols-outlined rounded text-base">delete</button>
                </div>
              </div>
            ))}
            {achievements.length === 0 && <div className="p-8 text-center text-outline font-mono italic">No Achievements recorded.</div>}
          </div>
        </div>
      )}

      {/* ADD/EDIT ACHIEVEMENT */}
      {activeAdminView === 'add-achievement' && (
        <div className="max-w-3xl mx-auto w-full bg-surface-container-low p-6 md:p-8 rounded border ghost-border relative overflow-hidden">
          <div className="absolute top-4 right-4 text-6xl text-outline/5 material-symbols-outlined pointer-events-none select-none">edit_document</div>
          <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container mb-6 border-b border-outline/20 pb-4">
            {editingId ? 'UPDATE ACHIEVEMENT RECORD' : 'INITIALIZE ACHIEVEMENT RECORD'}
          </h2>
          <form onSubmit={handleAchievementSubmit} className="flex flex-col gap-5 text-sm font-mono">
            <div className="grid grid-cols-1 gap-5">
              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Achievement Title <span className="text-error">*</span></div>
                <input name="title" required value={achievementFormData.title} onChange={handleAchievementChange} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="e.g. DEF CON CTF Winners..." />
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Description <span className="text-error">*</span></div>
                <textarea name="description" required value={achievementFormData.description} onChange={handleAchievementChange} rows="3" className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="Context behind the achievement..."></textarea>
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Future Scope / Next Steps</div>
                <textarea name="future_scope" value={achievementFormData.future_scope} onChange={handleAchievementChange} rows="2" className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="How this scales out logically going forward..."></textarea>
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Reference / Press Link</div>
                <input name="reference_link" value={achievementFormData.reference_link} onChange={handleAchievementChange} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="https://..." />
              </label>
            </div>
            
            <button type="submit" className="mt-6 w-full h-12 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.2)] font-headline font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
              {editingId ? 'UPDATE RECORD' : 'SAVE RECORD'}
            </button>
          </form>
        </div>
      )}

        {/* FUTURE SCOPES LIST VIEW */}
        {activeAdminView === 'future-scopes-list' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden">
              <div>
                <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container">FUTURE SCOPES LOG</h2>
                <p className="font-mono text-sm text-on-surface-variant">Prospective research items and next steps.</p>
              </div>
              <button 
                onClick={() => { setEditingId(null); setFutureScopeFormData({ title: '', category: 'RESEARCH', priority: 'Normal', description: '', proposed_date: '', reference_link: [''] }); setActiveAdminView('add-future-scope'); }}
                className="bg-primary/20 hover:bg-primary/30 text-primary px-6 py-3 font-bold font-mono text-sm border border-primary/50 shadow-[0_0_10px_rgba(0,245,255,0.1)] transition-all rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.3)] z-10"
              >
                + RECORD SCOPE
              </button>
              <div className="absolute -right-10 -bottom-10 text-9xl text-outline/5 material-symbols-outlined select-none pointer-events-none">science</div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {futureScopes.map(fs => (
                <div key={fs.id} className="bg-surface-container-low border border-outline/20 p-4 shrink-0 rounded flex justify-between">
                  <div>
                    <h3 className="font-bold text-lg font-headline hover:text-primary">{fs.title}</h3>
                    <div className="font-mono text-sm text-on-surface-variant line-clamp-1">{fs.category} | {fs.priority}</div>
                  </div>
                  <div className="flex gap-2 items-start shrink-0">
                    <button onClick={() => handleEditFutureScope(fs)} className="px-3 py-1 font-mono text-sm text-primary hover:bg-primary hover:text-on-primary-fixed border border-primary transition-all rounded">EDIT</button>
                    <button onClick={() => handleDeleteFutureScope(fs.id)} className="px-3 py-1 font-mono text-sm text-error hover:bg-error hover:text-on-error border border-error transition-all rounded">DELETE</button>
                  </div>
                </div>
              ))}
              {futureScopes.length === 0 && <div className="text-center font-mono text-outline 
py-12 border border-outline/20 border-dashed rounded">NO FUTURE SCOPES FOUND IN DIRECTORY</div>}
            </div>
          </div>
        )}

        {/* ADD/EDIT FUTURE SCOPE */}
        {activeAdminView === 'add-future-scope' && (
          <div className="max-w-4xl mx-auto w-full bg-surface-container-low p-6 md:p-8 rounded border ghost-border relative overflow-hidden">
            <div className="absolute top-4 right-4 text-6xl text-outline/5 material-symbols-outlined pointer-events-none select-none">edit_document</div>
            <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container mb-6 border-b border-outline/20 pb-4">
              {editingId ? 'UPDATE FUTURE SCOPE' : 'INITIALIZE FUTURE SCOPE'}
            </h2>
            <form onSubmit={handleFutureScopeSubmit} className="flex flex-col gap-5 text-sm font-mono text-on-surface">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col">
                  <div className="text-outline font-bold mb-1 ml-1 text-xs">Title <span className="text-error">*</span></div>
                  <input name="title" required value={futureScopeFormData.title} onChange={(e) => setFutureScopeFormData({ ...futureScopeFormData, title: e.target.value })} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="e.g. Quantum Entropy Routing" />
                </label>

                <label className="flex flex-col">
                  <div className="text-outline font-bold mb-1 ml-1 text-xs">Proposed Date</div>
                  <input type="date" name="proposed_date" value={futureScopeFormData.proposed_date} onChange={(e) => setFutureScopeFormData({ ...futureScopeFormData, proposed_date: e.target.value })} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col">
                  <div className="text-outline font-bold mb-1 ml-1 text-xs">Category <span className="text-error">*</span></div>
                  <select name="category" required value={futureScopeFormData.category} onChange={(e) => setFutureScopeFormData({ ...futureScopeFormData, category: e.target.value })} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3">
                    <option value="RESEARCH">RESEARCH</option>
                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                    <option value="UPGRADE">UPGRADE</option>
                    <option value="INTEGRATION">INTEGRATION</option>
                  </select>
                </label>

                <label className="flex flex-col">
                  <div className="text-outline font-bold mb-1 ml-1 text-xs">Priority <span className="text-error">*</span></div>
                  <select name="priority" required value={futureScopeFormData.priority} onChange={(e) => setFutureScopeFormData({ ...futureScopeFormData, priority: e.target.value })} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3">
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
              </div>
              
              <label className="flex flex-col w-full text-black">
                  <div className="text-outline font-bold mb-1 ml-1 text-xs">Description / Markdown Support <span className="text-error">*</span></div>
                  <SimpleMdeReact 
                      value={futureScopeFormData.description} 
                      onChange={(value) => handleSimpleMdeChange(value, 'description', setFutureScopeFormData, futureScopeFormData)}
                  />
              </label>

              <div className="flex flex-col gap-2">
                <div className="text-outline font-bold mb-1 ml-1 text-xs flex justify-between items-center">
                  <span>Reference Links</span>
                  <button type="button" onClick={() => addLinkItem('reference_link', setFutureScopeFormData, futureScopeFormData)} className="text-[10px] bg-surface-bright px-2 py-1 rounded hover:text-primary transition-colors">+ ADD LINK</button>
                </div>
                {futureScopeFormData.reference_link.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input 
                      value={link} 
                      onChange={(e) => handleLinkArrayChange('reference_link', idx, e.target.value, setFutureScopeFormData, futureScopeFormData)} 
                      className="flex-1 bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" 
                      placeholder="https://..." 
                    />
                    {futureScopeFormData.reference_link.length > 1 && (
                      <button type="button" onClick={() => removeLinkItem('reference_link', idx, setFutureScopeFormData, futureScopeFormData)} className="text-error hover:text-error/80 p-2 material-symbols-outlined">delete</button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" className="mt-6 w-full h-12 bg-primary-container text-on-primary-fixed shadow-[0_0_10px_rgba(0,245,255,0.2)] font-headline font-bold text-lg rounded hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
                {editingId ? 'UPDATE RECORD' : 'SAVE RECORD'}
              </button>
            </form>
          </div>
        )}

          {/* ADMIN SETTINGS VIEW */}
          {activeAdminView === 'admin-settings' && (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden mb-6">
                <div>
                  <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container">ADMIN LOGISTICS</h2>
                  <p className="font-mono text-sm text-on-surface-variant">Active Admin: {adminUser}</p>
                </div>
                <button onClick={onLogout} className="bg-error/10 hover:bg-error/20 text-error px-6 py-3 font-bold font-mono text-sm border border-error/50 transition-all rounded z-10">
                  LOGOUT
                </button>
                <div className="absolute -right-10 -bottom-10 text-9xl text-outline/5 material-symbols-outlined select-none pointer-events-none">manage_accounts</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Change Password Block */}
                <div className="bg-surface-container border border-outline/20 p-6 rounded">
                  <h3 className="font-headline text-xl text-primary border-b border-outline/30 pb-4 mb-4">CHANGE PASSWORD</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const currentPassword = e.target.currentPassword.value;
                    const newPassword = e.target.newPassword.value;
                    try {
                      const res = await fetch('/api/admin/change-password', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: adminUser, currentPassword, newPassword })
                      });
                      const data = await res.json();
                      if (data.success) { alert('Password changed successfully'); e.target.reset(); }
                      else { alert('Error: ' + data.message); }
                    } catch(err) { console.error(err); alert('Failed to connect to server'); }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono mb-1 text-on-surface-variant">Current Password</label>
                      <input name="currentPassword" type="password" required className="w-full bg-surface-dim border border-outline/50 p-2 text-sm font-mono text-on-surface focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono mb-1 text-on-surface-variant">New Password</label>
                      <input name="newPassword" type="password" required className="w-full bg-surface-dim border border-outline/50 p-2 text-sm font-mono text-on-surface focus:outline-none focus:border-primary" />
                    </div>
                    <button type="submit" className="w-full bg-primary/20 text-primary border border-primary/50 py-2 font-mono text-sm hover:bg-primary hover:text-on-primary-fixed transition-colors">UPDATE PASSWORD</button>
                  </form>
                </div>

                {/* Create New Admin Block */}
                <div className="bg-surface-container border border-outline/20 p-6 rounded">
                  <h3 className="font-headline text-xl text-secondary border-b border-outline/30 pb-4 mb-4">CREATE NEW ADMIN</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const newUsername = e.target.newUsername.value;
                    const newPassword = e.target.newPassword.value;
                    try {
                      const res = await fetch('/api/admin/create', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ newUsername, newPassword })
                      });
                      const data = await res.json();
                      if (data.success) { alert('Admin created successfully'); e.target.reset(); }
                      else { alert('Error: ' + data.message); }
                    } catch(err) { console.error(err); alert('Failed to connect to server'); }
                  }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono mb-1 text-on-surface-variant">New Username</label>
                      <input name="newUsername" type="text" required className="w-full bg-surface-dim border border-outline/50 p-2 text-sm font-mono text-on-surface focus:outline-none focus:border-secondary" />
                    </div>
                    <div>
                      <label className="block text-xs font-mono mb-1 text-on-surface-variant">New Password</label>
                      <input name="newPassword" type="password" required className="w-full bg-surface-dim border border-outline/50 p-2 text-sm font-mono text-on-surface focus:outline-none focus:border-secondary" />
                    </div>
                    <button type="submit" className="w-full bg-secondary/20 text-secondary border border-secondary/50 py-2 font-mono text-sm hover:bg-secondary hover:text-on-secondary-fixed transition-colors">PROVISION ACCESS</button>
                  </form>
                </div>
              </div>
            </div>
          )}




      </div>
    );
  }
  
export default AdminPanel;

