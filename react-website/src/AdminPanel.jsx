/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import SimpleMdeReact from "react-simplemde-editor";
import "easymde/dist/easymde.min.css";

const API_URL = '/api/projects';
const TEAMS_API_URL = '/api/teams';
const INDIVIDUALS_API_URL = '/api/individuals';
const CVES_API_URL = '/api/cves';
const ACHIEVEMENTS_API_URL = '/api/achievements';
const UPCOMING_CTFS_API_URL = '/api/upcoming-ctfs';

const getCurrentWeekValue = () => {
  const current = new Date();
  const target = new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
};

const getCurrentMonthValue = () => {
  const current = new Date();
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentDateValue = () => {
  const current = new Date();
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
};

const getMonthStartValue = () => `${getCurrentMonthValue()}-01`;

const MONTH_OPTIONS = [
  ['01', 'January'],
  ['02', 'February'],
  ['03', 'March'],
  ['04', 'April'],
  ['05', 'May'],
  ['06', 'June'],
  ['07', 'July'],
  ['08', 'August'],
  ['09', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December']
];

const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, index) => currentYear - 4 + index);
};

function AdminPanel({ onBack, adminUser, onLogout }) {
  const [activeAdminView, setActiveAdminView] = useState('dashboard'); // 'dashboard' | 'projects-list' | 'add-project' | 'teams-list' | 'add-team' | 'individuals-list' | 'add-individual' | 'cves-list' | 'add-cve' | 'achievements-list' | 'add-achievement' | 'admin-settings'
  const [editingId, setEditingId] = useState(null);
  
  // Data States
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [cves, setCves] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [upcomingCtfs, setUpcomingCtfs] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [attendanceHolidays, setAttendanceHolidays] = useState([]);
  const [selectedIndividual, setSelectedIndividual] = useState(null);
  const [selectedIndividualLoading, setSelectedIndividualLoading] = useState(false);
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState(getCurrentMonthValue());
  const [dialogState, setDialogState] = useState(null);
  const dialogResolverRef = useRef(null);

  // Form States
  const [formData, setFormData] = useState({
    id: '', title: '', status: 'ONGOING', priority: 'Red team', 
    description: '', shortDesc: '', image: '', stack: '', 
    beneficiaries: '', team: '', usage_desc: '', timeline: '', operatives: ''
  });

  const [teamFormData, setTeamFormData] = useState({ name: '', description: '', technical_summary: '', current_objective: '' });
  
  const [individualFormData, setIndividualFormData] = useState({
    name: '', role: '', team_id: '', department: '', year_of_study: '', studying_year: '', daily_work: '', image: '',
    achievements: [], certificates: [], research_work: []
  });

  const [cveFormData, setCveFormData] = useState({ cve_number: '', details: '', poc: '', reference_link: [''], contributors: [] });
  const [achievementFormData, setAchievementFormData] = useState({ title: '', description: '', date: '', reference_link: [''], future_scope: '', contributors: [] });
  const [ctfFormData, setCtfFormData] = useState({ title: '', url: '', start_time: '', end_time: '', format: 'Jeopardy', location: 'Online', description: '' });
  const [holidayFormData, setHolidayFormData] = useState({ holiday_date: '', title: '', holiday_type: 'Institute Holiday' });
  const [odFormData, setOdFormData] = useState({ user_id: '', od_date: '', reason: '' });
  const [attendanceExportWeek, setAttendanceExportWeek] = useState(getCurrentWeekValue());
  const [attendanceRange, setAttendanceRange] = useState({ from: getMonthStartValue(), to: getCurrentDateValue() });
  const [individualSearchQuery, setIndividualSearchQuery] = useState('');

  const showAlert = (message, tone = 'info') => {
    setDialogState({ type: 'alert', tone, title: tone === 'error' ? 'Action Failed' : 'System Notice', message });
  };

  const showConfirm = (message, title = 'Confirm Action') => new Promise((resolve) => {
    dialogResolverRef.current = resolve;
    setDialogState({ type: 'confirm', tone: 'danger', title, message });
  });

  const closeDialog = (result = false) => {
    if (dialogResolverRef.current) {
      dialogResolverRef.current(result);
      dialogResolverRef.current = null;
    }
    setDialogState(null);
  };

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
    fetchUpcomingCtfs();
    fetchAttendance();
    fetchAttendanceHolidays();
  }, []);

  const fetchUpcomingCtfs = async () => {
    try {
      const response = await fetch(UPCOMING_CTFS_API_URL);
      const data = await response.json();
      setUpcomingCtfs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch upcoming CTFs', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await fetch('/api/admin/attendance');
      const data = await response.json();
      setAttendanceStats(data);
    } catch (err) {
      console.error('Failed to fetch attendance', err);
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

  const fetchAttendanceHolidays = async () => {
    try {
      const response = await fetch('/api/admin/attendance-holidays');
      const data = await response.json();
      setAttendanceHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch attendance holidays', err);
    }
  };

  const getCurrentDayWork = (ind) => {
    if (ind.current_day_work) return ind.current_day_work;
    if (ind.daily_work) return ind.daily_work;
    return '';
  };

  const getFilteredIndividuals = () => {
    const query = individualSearchQuery.trim().toLowerCase();
    if (!query) return individuals;

    return individuals.filter(ind => [
      ind.name,
      ind.role,
      ind.department,
      ind.year_of_study,
      ind.studying_year ? `year ${ind.studying_year}` : '',
      ind.team_name,
      getCurrentDayWork(ind)
    ].some(value => String(value || '').toLowerCase().includes(query)));
  };

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

  const normalizeDetailItems = (items) => (
    parseJsonArray(items).filter(item => item && typeof item === 'object')
  );

  const formatWorkDate = (value) => {
    if (!value) return 'NO_DATE';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return date.toLocaleDateString('en-CA');
  };

  const formatCalendarMonth = (value) => {
    if (!value) return 'CURRENT MONTH';
    const date = new Date(`${value}-01T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  const getCalendarStatusClass = (status) => {
    switch (status) {
      case 'present':
        return 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200';
      case 'absent':
        return 'border-red-400/50 bg-red-500/20 text-red-200';
      case 'od':
        return 'border-yellow-300/60 bg-yellow-400/20 text-yellow-100';
      case 'upcoming':
        return 'border-outline/20 bg-surface-container text-outline';
      default:
        return 'border-outline/10 bg-background/60 text-outline/60';
    }
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
      showAlert('Failed to upload image');
    }
  };

  const handleCveChange = (e) => {
    setCveFormData({ ...cveFormData, [e.target.name]: e.target.value });
  };

  const handleAchievementChange = (e) => {
    if (e.target.name === 'reference_link') {
      setAchievementFormData({ ...achievementFormData, reference_link: [e.target.value] });
      return;
    }
    setAchievementFormData({ ...achievementFormData, [e.target.name]: e.target.value });
  };

  const handleCtfChange = (e) => {
    setCtfFormData({ ...ctfFormData, [e.target.name]: e.target.value });
  };

  const handleHolidayChange = (e) => {
    setHolidayFormData({ ...holidayFormData, [e.target.name]: e.target.value });
  };

  const handleOdChange = (e) => {
    setOdFormData({ ...odFormData, [e.target.name]: e.target.value });
  };

  const handleHolidaySubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/attendance-holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayFormData)
      });

      if (!response.ok) {
        showAlert('Failed to save holiday.');
        return;
      }

      setHolidayFormData({ holiday_date: '', title: '', holiday_type: 'Institute Holiday' });
      fetchAttendanceHolidays();
      fetchAttendance();
      showAlert('Holiday saved. Attendance percentages recalculated.');
    } catch (err) {
      console.error('Failed to save holiday', err);
      showAlert('Failed to save holiday. Check console.');
    }
  };

  const handleDeleteHoliday = async (holidayId) => {
    if (!(await showConfirm('Delete this holiday from attendance calendar?'))) return;

    try {
      const response = await fetch(`/api/admin/attendance-holidays/${holidayId}`, { method: 'DELETE' });
      if (!response.ok) {
        showAlert('Failed to delete holiday.');
        return;
      }
      fetchAttendanceHolidays();
      fetchAttendance();
    } catch (err) {
      console.error('Failed to delete holiday', err);
      showAlert('Failed to delete holiday. Check console.');
    }
  };

  const handleOdSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/attendance-od', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(odFormData)
      });

      if (!response.ok) {
        showAlert('Failed to save OD.');
        return;
      }

      setOdFormData({ user_id: '', od_date: '', reason: '' });
      fetchAttendance();
      showAlert('OD saved. It will not be considered absent.');
    } catch (err) {
      console.error('Failed to save OD', err);
      showAlert('Failed to save OD. Check console.');
    }
  };

  const handleDownloadWeeklyAttendance = () => {
    const week = attendanceExportWeek || getCurrentWeekValue();
    window.open(`/api/admin/attendance/weekly-export?week=${encodeURIComponent(week)}`, '_blank');
  };

  const handleDownloadRangeAttendance = () => {
    const today = getCurrentDateValue();
    const from = attendanceRange.from || getMonthStartValue();
    const to = attendanceRange.to && attendanceRange.to <= today ? attendanceRange.to : today;
    if (from > to) {
      showAlert('From date cannot be after To date.', 'error');
      return;
    }
    window.open(`/api/admin/attendance/range-export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, '_blank');
  };

  const formatDateTimeForDisplay = (value) => {
    if (!value) return 'TBA';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  };

  const handleCtfSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(UPCOMING_CTFS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctfFormData)
      });

      if (!response.ok) {
        showAlert('Failed to add upcoming CTF.');
        return;
      }

      setCtfFormData({ title: '', url: '', start_time: '', end_time: '', format: 'Jeopardy', location: 'Online', description: '' });
      fetchUpcomingCtfs();
      showAlert('Upcoming CTF added successfully.');
    } catch (err) {
      console.error('Failed to add upcoming CTF', err);
      showAlert('Failed to add upcoming CTF. Check console.');
    }
  };

  const handleDeleteCtf = async (ctf) => {
    if (ctf.source !== 'manual') {
      showAlert('CTFTIME events are external and cannot be deleted here.');
      return;
    }
    if (!(await showConfirm(`Delete ${ctf.title}?`))) return;

    try {
      const response = await fetch(`${UPCOMING_CTFS_API_URL}/${ctf.id}`, { method: 'DELETE' });
      if (!response.ok) {
        showAlert('Failed to delete upcoming CTF.');
        return;
      }
      fetchUpcomingCtfs();
    } catch (err) {
      console.error('Failed to delete upcoming CTF', err);
      showAlert('Failed to delete upcoming CTF. Check console.');
    }
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
      showAlert(`Project ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setFormData({
        id: '', title: '', status: 'ONGOING', priority: 'Red team', 
        description: '', shortDesc: '', image: '', stack: '', 
        beneficiaries: '', team: '', usage_desc: '', timeline: '', operatives: ''
      });
      setEditingId(null);
      setActiveAdminView('projects-list');
    } catch (err) {
      console.error('Failed to save project', err);
      showAlert('Error saving project. Check console.');
    }
  };

  const handleDelete = async (id) => {
    if (!(await showConfirm('Delete this product?'))) return;
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
      showAlert(`Team ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setTeamFormData({ name: '', description: '', technical_summary: '', current_objective: '' });
      setEditingId(null);
      setActiveAdminView('teams-list');
    } catch (err) {
      console.error('Failed to save team', err);
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!(await showConfirm('Delete this team?'))) return;
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
      daily_work: ind.daily_work || '',
      team_id: ind.team_id || '',
      achievements: ach,
      certificates: certs,
      research_work: research
    });
    setEditingId(ind.id);
    setActiveAdminView('add-individual');
  };

  const handleViewIndividual = async (ind, month = selectedAttendanceMonth || getCurrentMonthValue()) => {
    setSelectedIndividualLoading(true);
    setSelectedIndividual(null);
    setActiveAdminView('individual-detail');
    setSelectedAttendanceMonth(month);

    try {
      const response = await fetch(`${INDIVIDUALS_API_URL}/${ind.id}?month=${encodeURIComponent(month)}`);
      if (!response.ok) {
        showAlert('Failed to load individual details.');
        setActiveAdminView('individuals-list');
        return;
      }

      const data = await response.json();
      setSelectedIndividual(data);
    } catch (err) {
      console.error('Failed to load individual details', err);
      showAlert('Failed to load individual details. Check console.');
      setActiveAdminView('individuals-list');
    } finally {
      setSelectedIndividualLoading(false);
    }
  };

  const handleAttendanceMonthChange = (month) => {
    setSelectedAttendanceMonth(month);
    if (selectedIndividual?.id) {
      handleViewIndividual(selectedIndividual, month);
    }
  };

  const handleAttendanceMonthPartChange = (part, value) => {
    const [year, month] = (selectedAttendanceMonth || getCurrentMonthValue()).split('-');
    const nextMonth = part === 'year' ? `${value}-${month}` : `${year}-${value}`;
    handleAttendanceMonthChange(nextMonth);
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
      showAlert(`Individual ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setIndividualFormData({
        name: '', role: '', team_id: '', department: '', year_of_study: '', studying_year: '', daily_work: '', image: '',
        achievements: [], certificates: [], research_work: []
      });
      setEditingId(null);
      setActiveAdminView('individuals-list');
    } catch (err) {
      console.error('Failed to save individual', err);
    }
  };

  const handleDeleteIndividual = async (id) => {
    if (!(await showConfirm('Delete this individual?'))) return;
    try {
      await fetch(`${INDIVIDUALS_API_URL}/${id}`, { method: 'DELETE' });
      fetchIndividuals();
      if (selectedIndividual?.id === id) {
        setSelectedIndividual(null);
        setActiveAdminView('individuals-list');
      }
    } catch (err) {
      console.error('Failed to delete individual', err);
    }
  };

  const handleDailyWorkDraftChange = (id, value) => {
    setIndividuals(prev => prev.map(ind => (
      ind.id === id ? { ...ind, current_day_work: value, daily_work: value } : ind
    )));
  };

  const handleSelectedDailyWorkChange = (value) => {
    setSelectedIndividual(prev => prev ? { ...prev, current_day_work: value, daily_work: value } : prev);
  };

  const handleUpdateDailyWork = async (ind) => {
    try {
      const response = await fetch(`${INDIVIDUALS_API_URL}/${ind.id}/daily-work`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_work: getCurrentDayWork(ind) })
      });

      if (!response.ok) {
        showAlert('Failed to update daily work.');
        return;
      }

      fetchIndividuals();
      if (selectedIndividual?.id === ind.id) {
        handleViewIndividual(ind);
      }
      showAlert(`Current day work stored for ${ind.name}.`);
    } catch (err) {
      console.error('Failed to update daily work', err);
      showAlert('Failed to update daily work. Check console.');
    }
  };

  const handleUpdateOperativePassword = async (operative) => {
    const newPassword = window.prompt(`New password for ${operative.username}`);
    if (!newPassword) return;

    try {
      const response = await fetch('/api/admin/update-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: operative.username, newPassword })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        showAlert(data.message || 'Failed to update individual password.');
        return;
      }

      showAlert(`${operative.username} password updated. 2FA was reset for a fresh setup.`);
    } catch (err) {
      console.error('Failed to update operative password', err);
      showAlert('Failed to update operative password. Check console.');
    }
  };

  const handleDeleteOperativeUser = async (operative) => {
    if (!(await showConfirm(`Delete operative login for ${operative.username}? Attendance history for this login will also be removed.`))) return;

    try {
      const response = await fetch(`/api/admin/users/${operative.id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        showAlert(data.message || 'Failed to delete operative login.');
        return;
      }

      fetchAttendance();
      showAlert(`${operative.username} deleted from operative logins.`);
    } catch (err) {
      console.error('Failed to delete operative login', err);
      showAlert('Failed to delete operative login. Check console.');
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
      showAlert(`CVE ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setCveFormData({ cve_number: '', details: '', poc: '', reference_link: '', contributors: [] });
      setEditingId(null);
      setActiveAdminView('cves-list');
    } catch (err) {
      console.error('Failed to save CVE', err);
    }
  };

  const handleDeleteCve = async (id) => {
    if (!(await showConfirm('Delete this CVE?'))) return;
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
    let links = [''];
    try {
      links = ach.reference_link ? (typeof ach.reference_link === 'string' ? JSON.parse(ach.reference_link) : ach.reference_link) : [''];
      if (!Array.isArray(links)) links = [links];
    } catch(e) {
      links = [ach.reference_link].filter(Boolean);
    }
    setAchievementFormData({
      ...ach,
      reference_link: links,
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
      showAlert(`Achievement ${editingId ? 'Updated' : 'Added'} Successfully!`);
      setAchievementFormData({ title: '', description: '', date: '', reference_link: [''], future_scope: '', contributors: [] });
      setEditingId(null);
      setActiveAdminView('achievements-list');
    } catch (err) {
      console.error('Failed to save achievement', err);
    }
  };

  const handleDeleteAchievement = async (id) => {
    if (!(await showConfirm('Delete this achievement?'))) return;
    try {
      await fetch(`${ACHIEVEMENTS_API_URL}/${id}`, { method: 'DELETE' });
      fetchAchievements();
    } catch (err) {
      console.error('Failed to delete achievement', err);
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
        showAlert(`Future Scope ${editingId ? 'Updated' : 'Added'} Successfully!`);
        setFutureScopeFormData({ title: '', category: 'RESEARCH', priority: 'Normal', description: '', proposed_date: '', reference_link: [''] });
      } catch (err) {
        console.error('Error submitting future scope:', err);
        showAlert('Failed to save future scope. Please check the network tab.');
      }
    };

    const handleDeleteFutureScope = async (id) => {
    if (!(await showConfirm('Delete this future scope?'))) return;
    try {
      await fetch(`${FUTURE_SCOPES_API_URL}/${id}`, { method: 'DELETE' });
      fetchFutureScopes();
    } catch (err) {
      console.error('Failed to delete future scope', err);
    }
  };

  return (
    <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full flex flex-col gap-8 text-on-surface">
      {dialogState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface-container-highest border border-outline/30 rounded shadow-[0_0_40px_rgba(0,245,255,0.12)] overflow-hidden">
            <div className={`px-5 py-4 border-b border-outline/20 flex items-center gap-3 ${dialogState.tone === 'danger' || dialogState.tone === 'error' ? 'text-error' : 'text-primary'}`}>
              <span className="material-symbols-outlined text-xl">
                {dialogState.type === 'confirm' ? 'warning' : dialogState.tone === 'error' ? 'error' : 'info'}
              </span>
              <h2 className="font-headline text-xl font-bold tracking-wide">{dialogState.title}</h2>
            </div>
            <div className="p-5">
              <p className="font-mono text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{dialogState.message}</p>
            </div>
            <div className="px-5 py-4 bg-background/50 border-t border-outline/20 flex justify-end gap-3">
              {dialogState.type === 'confirm' && (
                <button
                  onClick={() => closeDialog(false)}
                  className="px-4 py-2 rounded border border-outline/30 text-outline hover:text-on-surface hover:border-outline font-mono text-xs transition-colors"
                >
                  CANCEL
                </button>
              )}
              <button
                onClick={() => closeDialog(dialogState.type === 'confirm')}
                className={`px-4 py-2 rounded font-mono text-xs font-bold transition-colors ${dialogState.type === 'confirm' ? 'bg-error/20 border border-error/40 text-error hover:bg-error hover:text-on-error' : 'bg-primary/20 border border-primary/40 text-primary hover:bg-primary hover:text-on-primary-fixed'}`}
              >
                {dialogState.type === 'confirm' ? 'CONFIRM' : 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {activeAdminView === 'individual-detail' && "Inspect individual details, current work, and stored daily work timeline."}
      </p>

      {/* DASHBOARD VIEW */}
      {activeAdminView === 'dashboard' && (
        <>
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

          {/* Upcoming CTFs Card */}
          <div 
            onClick={() => setActiveAdminView('upcoming-ctfs')}
            className="group cursor-pointer bg-surface-container-low p-6 rounded border ghost-border hover:border-primary-container hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all"
          >
            <div className="flex items-center gap-4 mb-4 text-primary-container group-hover:drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]">
              <span className="material-symbols-outlined text-3xl">flag</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">UPCOMING CTFs</h2>
            </div>
            <p className="font-mono text-sm text-on-surface-variant line-clamp-2">Track CTFTIME events and manually add lab-priority competitions.</p>
            <div className="mt-6 flex justify-between items-center text-outline text-[10px] font-mono">
              <span>{upcomingCtfs?.length || 0} Listed</span>
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

          {/* Attendance Stats Overview */}
          <div className="md:col-span-3 bg-surface-container-low p-6 rounded border ghost-border transition-all">
            <div className="flex items-center gap-4 mb-4 text-primary-container">
              <span className="material-symbols-outlined text-3xl">rule_folder</span>
              <h2 className="font-headline text-2xl font-bold tracking-wider">ATTENDANCE OVERVIEW</h2>
            </div>
            <p className="font-mono text-sm text-on-surface-variant mb-6">Operative check-in status mapping to tracking database. Sundays, first Saturdays, third Saturdays, holidays, and approved OD are handled in the calculation.</p>

            <div className="mb-6 bg-background border border-outline/20 rounded p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div>
                  <label className="text-outline block mb-1 font-mono text-xs uppercase">From</label>
                  <input
                    type="date"
                    value={attendanceRange.from}
                    max={getCurrentDateValue()}
                    onChange={(e) => setAttendanceRange({ ...attendanceRange, from: e.target.value })}
                    className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-outline block mb-1 font-mono text-xs uppercase">To</label>
                  <input
                    type="date"
                    value={attendanceRange.to}
                    max={getCurrentDateValue()}
                    onChange={(e) => setAttendanceRange({ ...attendanceRange, to: e.target.value })}
                    className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none font-mono text-xs"
                  />
                </div>
                <button
                  onClick={handleDownloadRangeAttendance}
                  className="bg-secondary/20 text-secondary border border-secondary/40 rounded px-4 py-2 font-mono text-xs font-bold hover:bg-secondary/30 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  DOWNLOAD RANGE
                </button>
              </div>

              <div className="flex flex-col md:flex-row md:items-end lg:justify-end gap-4">
              <div>
                <label className="text-outline block mb-1 font-mono text-xs uppercase">Weekly Report</label>
                <input
                  type="week"
                  value={attendanceExportWeek}
                  onChange={(e) => setAttendanceExportWeek(e.target.value)}
                  className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none font-mono text-xs"
                />
              </div>
              <button
                onClick={handleDownloadWeeklyAttendance}
                className="bg-primary/20 text-primary border border-primary/40 rounded px-4 py-2 font-mono text-xs font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                DOWNLOAD WEEKLY ATTENDANCE
              </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
              <form onSubmit={handleHolidaySubmit} className="bg-background border border-outline/20 rounded p-4 grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
                <div>
                  <label className="text-outline block mb-1">Holiday Date</label>
                  <input type="date" name="holiday_date" value={holidayFormData.holiday_date} onChange={handleHolidayChange} required className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-outline block mb-1">Title</label>
                  <input name="title" value={holidayFormData.title} onChange={handleHolidayChange} required className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none" placeholder="Holiday name" />
                </div>
                <div>
                  <label className="text-outline block mb-1">Type</label>
                  <select name="holiday_type" value={holidayFormData.holiday_type} onChange={handleHolidayChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none">
                    <option value="Institute Holiday">Institute Holiday</option>
                    <option value="Public Holiday">Public Holiday</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-primary/20 text-primary border border-primary/40 rounded p-2 font-bold hover:bg-primary/30 transition-colors">SAVE HOLIDAY</button>
                </div>
              </form>

              <form onSubmit={handleOdSubmit} className="bg-background border border-outline/20 rounded p-4 grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
                <div>
                  <label className="text-outline block mb-1">Operative</label>
                  <select name="user_id" value={odFormData.user_id} onChange={handleOdChange} required className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none">
                    <option value="">Select</option>
                    {attendanceStats.map(stat => (
                      <option key={stat.id} value={stat.id}>{stat.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-outline block mb-1">OD Date</label>
                  <input type="date" name="od_date" value={odFormData.od_date} onChange={handleOdChange} required className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="text-outline block mb-1">Reason</label>
                  <input name="reason" value={odFormData.reason} onChange={handleOdChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none" placeholder="On duty reason" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-secondary/20 text-secondary border border-secondary/40 rounded p-2 font-bold hover:bg-secondary/30 transition-colors">MARK OD</button>
                </div>
              </form>
            </div>

            {attendanceHolidays.length > 0 && (
              <div className="mb-6 bg-background border border-outline/20 rounded p-4">
                <div className="font-mono text-xs text-outline uppercase tracking-widest mb-3">Configured Holidays</div>
                <div className="flex flex-wrap gap-2">
                  {attendanceHolidays.slice(0, 12).map(holiday => (
                    <div key={holiday.id} className="flex items-center gap-2 bg-surface-container-low border border-outline/20 rounded px-3 py-2 font-mono text-xs">
                      <span className="text-primary">{String(holiday.holiday_date).slice(0, 10)}</span>
                      <span className="text-on-surface">{holiday.title}</span>
                      <span className="text-outline">({holiday.holiday_type})</span>
                      <button onClick={() => handleDeleteHoliday(holiday.id)} className="text-error hover:text-on-surface">
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead>
                  <tr className="border-b border-outline/30 text-outline">
                    <th className="pb-3 px-4">User ID</th>
                    <th className="pb-3 px-4">Operative</th>
                    <th className="pb-3 px-4 text-center">Year</th>
                    <th className="pb-3 px-4 text-center">Total Attendances</th>
                    <th className="pb-3 px-4 text-center">OD</th>
                    <th className="pb-3 px-4 text-center">Working Days</th>
                    <th className="pb-3 px-4 text-right">Attendance %</th>
                    <th className="pb-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceStats.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-outline">No attendance records found in the database.</td>
                    </tr>
                  ) : (
                    attendanceStats.map(stat => (
                      <tr key={stat.id} className="border-b border-outline/10 hover:bg-surface-container transition-colors">
                        <td className="py-4 px-4 text-primary-container">{stat.id}</td>
                        <td className="py-4 px-4 font-bold text-on-surface uppercase">{stat.username}</td>
                        <td className="py-4 px-4 text-center">{stat.studying_year ? `Year ${stat.studying_year}` : 'N/A'}</td>
                        <td className="py-4 px-4 text-center">{stat.attended_days}</td>
                        <td className="py-4 px-4 text-center">{stat.od_days || 0}</td>
                        <td className="py-4 px-4 text-center">{stat.working_days || 0}</td>
                        <td className="py-4 px-4 text-right">
                          <span className={`px-2 py-1 rounded border ${stat.percentage > 80 ? 'bg-primary-container/10 border-primary-container/30 text-primary-container' : stat.percentage > 50 ? 'bg-outline/10 border-outline/30 text-outline' : 'bg-error/10 border-error/30 text-error'}`}>
                            {stat.percentage}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateOperativePassword(stat)}
                              className="text-tertiary hover:bg-tertiary/10 px-3 py-1.5 rounded transition-colors font-mono text-[10px] flex items-center gap-1 border border-tertiary/20"
                            >
                              <span className="material-symbols-outlined text-sm">lock_reset</span>
                              PASSWORD
                            </button>
                            <button
                              onClick={() => handleDeleteOperativeUser(stat)}
                              className="text-error hover:bg-error/10 px-3 py-1.5 rounded transition-colors font-mono text-[10px] flex items-center gap-1 border border-error/20"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                              DELETE
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
        </>
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
                  name: '', role: '', team_id: '', department: '', year_of_study: '', studying_year: '', daily_work: '', image: '',
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

          <div className="bg-background border border-outline/20 rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <label className="flex-1">
              <div className="text-outline block mb-1 font-mono text-xs uppercase">Search Individuals</div>
              <div className="relative">
                <span className="material-symbols-outlined text-outline text-lg absolute left-3 top-1/2 -translate-y-1/2">search</span>
                <input
                  value={individualSearchQuery}
                  onChange={(e) => setIndividualSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline/30 rounded py-2.5 pl-10 pr-3 text-on-surface focus:border-primary focus:outline-none font-mono text-sm"
                  placeholder="Search by name, team, department, role, year, or work..."
                />
              </div>
            </label>
            <div className="font-mono text-xs text-outline">
              {getFilteredIndividuals().length} / {individuals.length} SHOWN
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {individuals.length === 0 ? (
              <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
                <p className="text-outline font-mono text-sm">No individuals found. Database is currently empty.</p>
              </div>
            ) : getFilteredIndividuals().length === 0 ? (
              <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
                <p className="text-outline font-mono text-sm">No individuals match the current search.</p>
              </div>
            ) : (
              getFilteredIndividuals().map(ind => (
                <div
                  key={ind.id}
                  onClick={() => handleViewIndividual(ind)}
                  className="bg-background border border-outline/20 p-5 rounded flex flex-col gap-4 hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex lg:items-start justify-between flex-col lg:flex-row gap-4">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="font-mono text-xs font-bold text-primary-container bg-primary-container/10 w-fit px-2 py-0.5 rounded tracking-widest">{ind.role || 'OPERATIVE'} / {ind.department || 'NO DEPT'}</div>
                    <div className="font-headline text-xl font-bold">{ind.name}</div>
                    <div className="font-mono text-xs text-outline">Team: {ind.team_name || 'UNASSIGNED'}</div>
                    <div className="font-mono text-xs text-on-surface-variant mt-2 max-w-3xl">
                      <span className="text-primary uppercase">Current Day Work:</span> {getCurrentDayWork(ind) || 'No work update recorded for today.'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 lg:mt-0 sm:gap-6">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-[10px] text-outline mb-0.5">STUDYING YEAR</div>
                      <div className="font-mono text-xs text-on-surface uppercase">{ind.studying_year ? `YEAR ${ind.studying_year}` : (ind.year_of_study || 'N/A')}</div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditIndividual(ind);
                      }}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      EDIT
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteIndividual(ind.id);
                      }}
                      className="text-error hover:bg-error/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-error/20"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      DELETE
                    </button>
                  </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 border-t border-outline/10 pt-4">
                    <textarea
                      value={getCurrentDayWork(ind)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleDailyWorkDraftChange(ind.id, e.target.value)}
                      rows="2"
                      className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors font-mono text-xs"
                      placeholder="Update current day work for this individual..."
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateDailyWork(ind);
                      }}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center justify-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      SAVE WORK
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* INDIVIDUAL DETAIL VIEW */}
      {activeAdminView === 'individual-detail' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container/50 p-6 rounded border ghost-border">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Individual Work File</h2>
              <p className="font-mono text-xs text-outline mt-1">Profile details and dated work timeline</p>
            </div>
            <button
              onClick={() => {
                setSelectedIndividual(null);
                setActiveAdminView('individuals-list');
              }}
              className="text-outline hover:text-on-surface text-sm font-mono transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              BACK TO INDIVIDUALS
            </button>
          </div>

          {selectedIndividualLoading ? (
            <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
              <p className="text-primary font-mono text-sm">LOADING INDIVIDUAL FILE...</p>
            </div>
          ) : !selectedIndividual ? (
            <div className="bg-surface-container-low p-8 text-center rounded border border-outline/20">
              <p className="text-error font-mono text-sm">Individual file not available.</p>
            </div>
          ) : (() => {
            const detailAchievements = normalizeDetailItems(selectedIndividual.linked_achievements);
            const detailCertificates = normalizeDetailItems(selectedIndividual.certificates);
            const detailResearch = normalizeDetailItems(selectedIndividual.research_work);
            const workTimeline = Array.isArray(selectedIndividual.work_timeline) ? selectedIndividual.work_timeline : [];
            const attendanceCalendar = Array.isArray(selectedIndividual.attendance_calendar) ? selectedIndividual.attendance_calendar : [];
            const firstCalendarDate = attendanceCalendar[0]?.date ? new Date(`${attendanceCalendar[0].date}T00:00:00`) : null;
            const leadingCalendarBlanks = firstCalendarDate && !Number.isNaN(firstCalendarDate.getTime()) ? firstCalendarDate.getDay() : 0;
            const [selectedYear, selectedMonth] = (selectedAttendanceMonth || getCurrentMonthValue()).split('-');

            return (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <section className="xl:col-span-5 bg-background border border-outline/20 rounded p-6 flex flex-col gap-5">
                  <div className="flex items-start gap-5">
                    <div className="w-24 h-24 bg-surface-container-low border border-outline/20 rounded overflow-hidden flex items-center justify-center shrink-0">
                      {selectedIndividual.image ? (
                        <img src={selectedIndividual.image} alt={selectedIndividual.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-4xl text-outline">person</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] text-primary tracking-widest">OP-{String(selectedIndividual.id).padStart(4, '0')}</div>
                      <h3 className="font-headline text-3xl font-bold text-on-surface break-words">{selectedIndividual.name}</h3>
                      <p className="font-mono text-xs text-outline uppercase mt-1">{selectedIndividual.role || 'OPERATIVE'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="bg-surface-container-low border border-outline/10 p-3 rounded">
                      <div className="text-outline text-[10px] uppercase mb-1">Team</div>
                      <div className="text-on-surface">{selectedIndividual.team_name || 'UNASSIGNED'}</div>
                    </div>
                    <div className="bg-surface-container-low border border-outline/10 p-3 rounded">
                      <div className="text-outline text-[10px] uppercase mb-1">Department</div>
                      <div className="text-on-surface">{selectedIndividual.department || 'NO DEPT'}</div>
                    </div>
                    <div className="bg-surface-container-low border border-outline/10 p-3 rounded">
                      <div className="text-outline text-[10px] uppercase mb-1">Year / Experience</div>
                      <div className="text-on-surface">{selectedIndividual.year_of_study || 'N/A'}</div>
                    </div>
                    <div className="bg-surface-container-low border border-outline/10 p-3 rounded">
                      <div className="text-outline text-[10px] uppercase mb-1">Studying Year</div>
                      <div className="text-on-surface">{selectedIndividual.studying_year ? `Year ${selectedIndividual.studying_year}` : 'N/A'}</div>
                    </div>
                    <div className="bg-surface-container-low border border-outline/10 p-3 rounded">
                      <div className="text-outline text-[10px] uppercase mb-1">Records</div>
                      <div className="text-on-surface">{detailAchievements.length} achievements / {detailCertificates.length} certs</div>
                    </div>
                  </div>

                  <div className="border-t border-outline/10 pt-5">
                    <label className="text-outline block mb-2 font-mono text-xs uppercase">Current Day Work</label>
                    <textarea
                      value={getCurrentDayWork(selectedIndividual)}
                      onChange={(e) => handleSelectedDailyWorkChange(e.target.value)}
                      rows="4"
                      className="w-full bg-surface-container-low border border-outline/30 rounded p-3 text-on-surface focus:border-primary focus:outline-none transition-colors font-mono text-xs"
                      placeholder="Update current day work..."
                    />
                    <button
                      onClick={() => handleUpdateDailyWork(selectedIndividual)}
                      className="mt-3 text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      SAVE CURRENT WORK
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 border-t border-outline/10 pt-5">
                    <button
                      onClick={() => handleEditIndividual(selectedIndividual)}
                      className="text-primary hover:bg-primary/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-primary/20"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      EDIT DETAILS
                    </button>
                    <button
                      onClick={() => handleDeleteIndividual(selectedIndividual.id)}
                      className="text-error hover:bg-error/10 px-4 py-2 rounded transition-colors font-mono text-xs flex items-center gap-2 border border-error/20"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                      DELETE INDIVIDUAL
                    </button>
                  </div>
                </section>

                <section className="xl:col-span-7 bg-surface-container-lowest border border-outline/20 rounded overflow-hidden flex flex-col min-h-[520px]">
                  <div className="bg-surface-bright px-5 py-4 border-b border-outline/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-primary">terminal</span>
                      <span className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">WORK_TIMELINE :: OP-{selectedIndividual.id}</span>
                    </div>
                    <span className="font-mono text-[10px] text-outline">{workTimeline.length} LOGS</span>
                  </div>

                  <div className="flex-1 p-5 overflow-y-auto terminal-scroll font-mono text-xs leading-relaxed text-on-surface-variant flex flex-col gap-4">
                    {workTimeline.length === 0 ? (
                      <div className="flex gap-4">
                        <span className="text-outline shrink-0">NO_LOG</span>
                        <span>&gt; No daily work history stored yet.</span>
                      </div>
                    ) : (
                      workTimeline.map(log => (
                        <div key={log.id || `${log.work_date}-${log.work_text}`} className="border-l-2 border-primary/30 pl-4 pb-4">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-primary">{formatWorkDate(log.work_date)}</span>
                            <span className="text-outline text-[10px]">UPDATED {formatWorkDate(log.updated_at)}</span>
                          </div>
                          <p className="text-on-surface-variant whitespace-pre-wrap">&gt; {log.work_text}</p>
                        </div>
                      ))
                    )}
                    <div className="flex gap-4">
                      <span className="text-outline shrink-0">TODAY</span>
                      <span className="animate-pulse">_</span>
                    </div>
                  </div>
                </section>

                <section className="xl:col-span-12 bg-background border border-outline/20 rounded overflow-hidden">
                  <div className="bg-surface-bright px-5 py-4 border-b border-outline/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                      <span className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">ATTENDANCE_CALENDAR :: {formatCalendarMonth(selectedIndividual.attendance_calendar_month)}</span>
                      <span className="font-mono text-[10px] text-outline uppercase border border-outline/20 rounded px-2 py-1">
                        {selectedIndividual.attendance_calendar_source === 'no_user_match' ? 'NO USER ID MATCH' : `ATTENDANCE ${selectedIndividual.attendance_calendar_source || 'DB'}`}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedMonth}
                          onChange={(e) => handleAttendanceMonthPartChange('month', e.target.value)}
                          className="bg-background border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none font-mono text-xs"
                        >
                          {MONTH_OPTIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                        <select
                          value={selectedYear}
                          onChange={(e) => handleAttendanceMonthPartChange('year', e.target.value)}
                          className="bg-background border border-outline/30 rounded p-2 text-on-surface focus:border-primary focus:outline-none font-mono text-xs"
                        >
                          {getYearOptions().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-outline">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70"></span>PRESENT</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/70"></span>ABSENT</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400/70"></span>OD</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-outline/30"></span>OFF / UPCOMING</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-7 gap-2 mb-2 font-mono text-[10px] text-outline text-center uppercase">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day}>{day}</div>
                      ))}
                    </div>

                    {attendanceCalendar.length === 0 ? (
                      <div className="border border-outline/10 rounded p-6 text-center font-mono text-xs text-outline">No attendance calendar data available.</div>
                    ) : (
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: leadingCalendarBlanks }).map((_, idx) => (
                          <div key={`blank-${idx}`} className="aspect-square rounded border border-transparent"></div>
                        ))}
                        {attendanceCalendar.map(day => (
                          <div
                            key={day.date}
                            title={`${day.date} - ${day.label}`}
                            className={`aspect-square min-h-14 rounded border p-2 flex flex-col justify-between transition-colors ${getCalendarStatusClass(day.status)}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-sm font-bold">{String(Number(day.date.slice(8, 10)))}</span>
                              <span className="font-mono text-[9px] uppercase opacity-80">{day.day}</span>
                            </div>
                            <div className="font-mono text-[9px] uppercase truncate">
                              {day.status === 'present' ? 'Present' : day.status === 'absent' ? 'Absent' : day.status === 'od' ? 'OD' : day.status === 'upcoming' ? 'Next' : 'Off'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>

                {(detailAchievements.length > 0 || detailCertificates.length > 0 || detailResearch.length > 0) && (
                  <section className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-background border border-outline/20 rounded p-5">
                      <h4 className="font-headline text-lg font-bold text-primary mb-4">Achievements</h4>
                      <div className="space-y-3">
                        {detailAchievements.length === 0 ? <p className="font-mono text-xs text-outline">No achievements recorded.</p> : detailAchievements.slice(0, 6).map((item, idx) => (
                          <div key={idx} className="border-b border-outline/10 pb-3 last:border-b-0">
                            <div className="font-mono text-xs text-on-surface">{item.title || item.name || item.event || 'Achievement'}</div>
                            {item.description && <div className="font-mono text-[11px] text-on-surface-variant mt-1 leading-relaxed">{item.description}</div>}
                            <div className="font-mono text-[10px] text-outline mt-1">{item.date || item.year || 'NO DATE'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-background border border-outline/20 rounded p-5">
                      <h4 className="font-headline text-lg font-bold text-primary mb-4">Certificates</h4>
                      <div className="space-y-3">
                        {detailCertificates.length === 0 ? <p className="font-mono text-xs text-outline">No certificates recorded.</p> : detailCertificates.slice(0, 6).map((item, idx) => (
                          <div key={idx} className="border-b border-outline/10 pb-3 last:border-b-0">
                            <div className="font-mono text-xs text-on-surface">{item.title || item.name || 'Certificate'}</div>
                            <div className="font-mono text-[10px] text-outline mt-1">{item.issued_by || item.issuer || 'NO ISSUER'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-background border border-outline/20 rounded p-5">
                      <h4 className="font-headline text-lg font-bold text-primary mb-4">Research / Work</h4>
                      <div className="space-y-3">
                        {detailResearch.length === 0 ? <p className="font-mono text-xs text-outline">No research records.</p> : detailResearch.slice(0, 6).map((item, idx) => (
                          <div key={idx} className="border-b border-outline/10 pb-3 last:border-b-0">
                            <div className="font-mono text-xs text-on-surface">{item.title || item.name || 'Research item'}</div>
                            <div className="font-mono text-[10px] text-outline mt-1">{item.publisher || item.date || 'NO META'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            );
          })()}
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
                <label className="text-outline block mb-1">Studying Year</label>
                <select name="studying_year" value={individualFormData.studying_year || ''} onChange={handleIndividualChange} className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors">
                  <option value="">-- Select Year --</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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

            <div>
              <label className="text-outline block mb-1">Current Day Work</label>
              <textarea
                name="daily_work"
                value={individualFormData.daily_work || ''}
                onChange={handleIndividualChange}
                rows="3"
                className="w-full bg-background border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none transition-colors"
                placeholder="Summarize the individual's current day work..."
              />
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

      {/* UPCOMING CTFS VIEW */}
      {activeAdminView === 'upcoming-ctfs' && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-surface-container-low p-6 rounded border ghost-border">
            <div>
              <h2 className="font-headline text-2xl font-bold tracking-wider text-primary-container">UPCOMING CTF DIRECTORY</h2>
              <p className="font-mono text-sm text-on-surface-variant">Live CTFTIME feed plus manually tracked lab events.</p>
            </div>
            <button
              onClick={fetchUpcomingCtfs}
              className="bg-primary/20 hover:bg-primary/30 text-primary px-5 py-2.5 font-bold font-mono text-xs border border-primary/50 transition-all rounded flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              REFRESH CTFTIME
            </button>
          </div>

          <form onSubmit={handleCtfSubmit} className="bg-background border border-outline/20 rounded p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 font-mono text-xs">
            <div className="lg:col-span-3">
              <label className="text-outline block mb-1">CTF Title</label>
              <input name="title" value={ctfFormData.title} onChange={handleCtfChange} required className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" placeholder="e.g. Internal Boot2Root Sprint" />
            </div>
            <div className="lg:col-span-3">
              <label className="text-outline block mb-1">URL</label>
              <input name="url" value={ctfFormData.url} onChange={handleCtfChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" placeholder="https://..." />
            </div>
            <div className="lg:col-span-2">
              <label className="text-outline block mb-1">Start</label>
              <input type="datetime-local" name="start_time" value={ctfFormData.start_time} onChange={handleCtfChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" />
            </div>
            <div className="lg:col-span-2">
              <label className="text-outline block mb-1">End</label>
              <input type="datetime-local" name="end_time" value={ctfFormData.end_time} onChange={handleCtfChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" />
            </div>
            <div className="lg:col-span-1">
              <label className="text-outline block mb-1">Format</label>
              <input name="format" value={ctfFormData.format} onChange={handleCtfChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" />
            </div>
            <div className="lg:col-span-1">
              <label className="text-outline block mb-1">Location</label>
              <input name="location" value={ctfFormData.location} onChange={handleCtfChange} className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" />
            </div>
            <div className="lg:col-span-10">
              <label className="text-outline block mb-1">Notes</label>
              <textarea name="description" value={ctfFormData.description} onChange={handleCtfChange} rows="2" className="w-full bg-surface-container-low border border-outline/30 rounded p-2.5 text-on-surface focus:border-primary focus:outline-none" placeholder="Why this CTF matters for the lab, team assignment, categories to focus..." />
            </div>
            <div className="lg:col-span-2 flex items-end">
              <button type="submit" className="w-full bg-primary-container text-on-primary-fixed px-4 py-3 rounded font-headline font-bold hover:shadow-[0_0_18px_rgba(0,245,255,0.35)] transition-all">
                ADD CTF
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingCtfs.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 bg-surface-container-low p-8 text-center rounded border border-outline/20">
                <p className="text-outline font-mono text-sm">No upcoming CTFs found. Add one manually or refresh CTFTIME.</p>
              </div>
            ) : (
              upcomingCtfs.map(ctf => (
                <article key={`${ctf.source}-${ctf.id}`} className="bg-background border border-outline/20 rounded p-5 flex flex-col gap-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`font-mono text-[10px] uppercase tracking-widest mb-2 ${ctf.source === 'ctftime' ? 'text-secondary' : 'text-primary'}`}>
                        {ctf.source === 'ctftime' ? 'CTFTIME API' : 'MANUAL ENTRY'}
                      </div>
                      <h3 className="font-headline text-xl font-bold text-on-surface">{ctf.title}</h3>
                    </div>
                    {ctf.source === 'manual' && (
                      <button onClick={() => handleDeleteCtf(ctf)} className="text-error hover:bg-error/10 p-2 rounded border border-error/20">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 font-mono text-xs text-on-surface-variant">
                    <div><span className="text-outline uppercase">Start:</span> {formatDateTimeForDisplay(ctf.start_time)}</div>
                    <div><span className="text-outline uppercase">End:</span> {formatDateTimeForDisplay(ctf.end_time)}</div>
                    <div><span className="text-outline uppercase">Format:</span> {ctf.format || 'CTF'}</div>
                    <div><span className="text-outline uppercase">Location:</span> {ctf.location || 'Online'}</div>
                  </div>

                  {ctf.description && (
                    <p className="font-body text-xs text-on-surface-variant line-clamp-3">{ctf.description}</p>
                  )}

                  {ctf.url && (
                    <a href={ctf.url} target="_blank" rel="noreferrer" className="mt-auto text-primary font-mono text-xs flex items-center gap-1 hover:underline">
                      OPEN EVENT <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  )}
                </article>
              ))
            )}
          </div>
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
              onClick={() => { setEditingId(null); setAchievementFormData({ title: '', description: '', date: '', reference_link: [''], future_scope: '', contributors: [] }); setActiveAdminView('add-achievement'); }}
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
                  <div className="text-[10px] font-mono text-outline uppercase mb-1">{ach.date ? formatWorkDate(ach.date) : 'NO DATE'}</div>
                  <div className="text-sm font-mono text-on-surface line-clamp-2">{ach.description}</div>
                  {ach.future_scope && <div className="text-xs font-mono text-on-surface-variant line-clamp-1 mt-1">Next: {ach.future_scope}</div>}
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
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Achievement Date</div>
                <input type="date" name="date" value={achievementFormData.date ? String(achievementFormData.date).slice(0, 10) : ''} onChange={handleAchievementChange} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" />
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Future Scope / Next Steps</div>
                <textarea name="future_scope" value={achievementFormData.future_scope} onChange={handleAchievementChange} rows="2" className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="How this scales out logically going forward..."></textarea>
              </label>

              <label>
                <div className="text-outline font-bold mb-1 ml-1 text-xs">Reference / Press Link</div>
                <input name="reference_link" value={Array.isArray(achievementFormData.reference_link) ? (achievementFormData.reference_link[0] || '') : (achievementFormData.reference_link || '')} onChange={handleAchievementChange} className="w-full bg-background border border-outline/30 focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-on-surface rounded p-3" placeholder="https://..." />
              </label>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                      if (data.success) { showAlert('Password changed successfully'); e.target.reset(); }
                      else { showAlert('Error: ' + data.message); }
                    } catch(err) { console.error(err); showAlert('Failed to connect to server'); }
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
                      if (data.success) { showAlert('Admin created successfully'); e.target.reset(); }
                      else { showAlert('Error: ' + data.message); }
                    } catch(err) { console.error(err); showAlert('Failed to connect to server'); }
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

                  {/* Create New Operative (User) Block */}
                  <div className="bg-surface-container border border-outline/20 p-6 rounded md:col-span-2 lg:col-span-1">
                    <h3 className="font-headline text-xl text-emerald-400 border-b border-outline/30 pb-4 mb-4">CREATE OPERATIVE</h3>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const newUsername = e.target.newUsername.value;
                      const newPassword = e.target.newPassword.value;
                      try {
                        const res = await fetch('/api/admin/create-user', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ newUsername, newPassword })
                        });
                        const data = await res.json();
                        if (data.success) { showAlert('Operative profile created successfully'); e.target.reset(); }
                        else { showAlert('Error: ' + data.message); }
                      } catch(err) { console.error(err); showAlert('Failed to connect to server'); }
                    }} className="space-y-4">
                      <div>
                        <label className="block text-xs font-mono mb-1 text-on-surface-variant">Operative Username</label>
                        <input name="newUsername" type="text" required className="w-full bg-surface-dim border border-outline/50 p-2 text-sm font-mono text-on-surface focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-mono mb-1 text-on-surface-variant">Assigned Password</label>
                        <input name="newPassword" type="password" required className="w-full bg-surface-dim border border-outline/50 p-2 text-sm font-mono text-on-surface focus:outline-none focus:border-emerald-400" />
                      </div>
                      <button type="submit" className="w-full bg-emerald-400/20 text-emerald-400 border border-emerald-400/50 py-2 font-mono text-sm hover:bg-emerald-400 hover:text-on-surface transition-colors">AUTHORIZE OPERATIVE</button>
                    </form>
                  </div>

                </div>
              </div>
            )}
      </div>
    );
  }
  
export default AdminPanel;


