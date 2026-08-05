import React, { useEffect, useState } from 'react';

const parseEditableArray = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return value ? [value] : [];
    }
  }
  return [];
};

const linesToArray = (value) => value.split('\n').map(line => line.trim()).filter(Boolean);
const arrayToLines = (items) => parseEditableArray(items).map(item => (
  typeof item === 'string' ? item : item.title || item.name || item.label || ''
)).filter(Boolean).join('\n');
const getCurrentMonthValue = () => {
  const current = new Date();
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
};
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
const getYearOptions = (selectedYear) => {
  const currentYear = new Date().getFullYear();
  const years = new Set(Array.from({ length: 12 }, (_, index) => currentYear - 8 + index));
  const parsedSelectedYear = Number(selectedYear);
  if (Number.isInteger(parsedSelectedYear)) years.add(parsedSelectedYear);
  return [...years].sort((a, b) => b - a);
};
const formatCalendarMonth = (value) => {
  if (!value) return 'CURRENT MONTH';
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
};
const formatTimeForDisplay = (value) => {
  if (!value) return '';
  if (/^\d{2}:\d{2}/.test(String(value))) return String(value).slice(0, 5);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(String(value))) return String(value).slice(11, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(11, 16) || String(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

function StudentDashboard({ onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [projectForms, setProjectForms] = useState({});
  const [achievementForms, setAchievementForms] = useState({});
  const [newAchievementForm, setNewAchievementForm] = useState({ title: '', description: '', date: '', future_scope: '', reference_link: '' });
  const [teamForm, setTeamForm] = useState(null);
  const [dailyWorkText, setDailyWorkText] = useState('');
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState(getCurrentMonthValue());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDailyWork, setSavingDailyWork] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = sessionStorage.getItem('studentToken') || '';

  const fetchDashboardForMonth = async (month) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/student/dashboard?month=${encodeURIComponent(month)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to load student dashboard');
        return;
      }
      setDashboard(data);
      setDailyWorkText(data.student.current_day_work || '');
      setSelectedAttendanceMonth(data.attendance_calendar_month || month);
      setProfileForm({
        name: data.student.name || '',
        department: data.student.department || '',
        year_of_study: data.student.year_of_study || '',
        studying_year: data.student.studying_year || '',
        image: data.student.image || '',
        certificates: parseEditableArray(data.student.certificates),
        research_work: parseEditableArray(data.student.research_work)
      });
      setProjectForms(Object.fromEntries((data.projects || []).map(project => [project.id, {
        title: project.title || '',
        status: project.status || '',
        shortDesc: project.shortDesc || '',
        description: project.description || '',
        image: project.image || '',
        usage_desc: project.usage_desc || '',
        stack: arrayToLines(project.stack),
        timeline: arrayToLines(project.timeline)
      }])));
      setAchievementForms(Object.fromEntries((data.achievements || []).map(achievement => [achievement.id, {
        title: achievement.title || '',
        description: achievement.description || '',
        date: String(achievement.date || '').slice(0, 10),
        future_scope: achievement.future_scope || '',
        reference_link: arrayToLines(achievement.reference_link)
      }])));
      setTeamForm(data.team ? {
        name: data.team.name || '',
        description: data.team.description || '',
        technical_summary: data.team.technical_summary || '',
        current_objective: data.team.current_objective || ''
      } : null);
    } catch (err) {
      console.error(err);
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardForMonth(selectedAttendanceMonth);
  }, []);

  const handleAttendanceMonthPartChange = (part, value) => {
    const [year, month] = (selectedAttendanceMonth || getCurrentMonthValue()).split('-');
    const nextMonth = part === 'year' ? `${value}-${month}` : `${year}-${value}`;
    setSelectedAttendanceMonth(nextMonth);
    fetchDashboardForMonth(nextMonth);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/student/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update profile');
        return;
      }
      setMessage(data.message || 'Profile updated');
      await fetchDashboardForMonth(selectedAttendanceMonth);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleArrayTextChange = (field, value) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value.split('\n').map(line => line.trim()).filter(Boolean).map(title => ({ title }))
    }));
  };

  const arrayToText = (items) => (
    parseEditableArray(items).map(item => item.title || item.name || item).filter(Boolean).join('\n')
  );

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok || !data.imageUrl) {
        setError(data.error || 'Failed to upload profile image');
        return;
      }
      setProfileForm(prev => ({ ...prev, image: data.imageUrl }));
      setMessage('Image uploaded. Save profile to send it for admin approval.');
    } catch (err) {
      console.error(err);
      setError('Failed to upload profile image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveProject = async (projectId) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const form = projectForms[projectId];
      const response = await fetch(`/api/student/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          stack: linesToArray(form.stack),
          timeline: linesToArray(form.timeline)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update project');
        return;
      }
      setMessage(data.message || 'Project updated');
      await fetchDashboardForMonth(selectedAttendanceMonth);
    } catch (err) {
      console.error(err);
      setError('Failed to update project.');
    } finally {
      setSaving(false);
    }
  };

  const saveAchievement = async (achievementId) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const form = achievementForms[achievementId];
      const response = await fetch(`/api/student/achievements/${achievementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, reference_link: linesToArray(form.reference_link) })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update achievement');
        return;
      }
      setMessage(data.message || 'Achievement updated');
      await fetchDashboardForMonth(selectedAttendanceMonth);
    } catch (err) {
      console.error(err);
      setError('Failed to update achievement.');
    } finally {
      setSaving(false);
    }
  };

  const addAchievement = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/student/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...newAchievementForm, reference_link: linesToArray(newAchievementForm.reference_link) })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to add achievement');
        return;
      }
      setMessage(data.message || 'Achievement added');
      setNewAchievementForm({ title: '', description: '', date: '', future_scope: '', reference_link: '' });
      await fetchDashboardForMonth(selectedAttendanceMonth);
    } catch (err) {
      console.error(err);
      setError('Failed to add achievement.');
    } finally {
      setSaving(false);
    }
  };

  const saveTeam = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/student/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(teamForm)
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update team');
        return;
      }
      setMessage(data.message || 'Team updated');
      await fetchDashboardForMonth(selectedAttendanceMonth);
    } catch (err) {
      console.error(err);
      setError('Failed to update team.');
    } finally {
      setSaving(false);
    }
  };

  const saveDailyWork = async (e) => {
    e.preventDefault();
    setSavingDailyWork(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/student/daily-work', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ work_text: dailyWorkText })
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to update daily work');
        return;
      }
      setMessage(data.message || 'Daily work updated');
      await fetchDashboardForMonth(selectedAttendanceMonth);
    } catch (err) {
      console.error(err);
      setError('Failed to update daily work.');
    } finally {
      setSavingDailyWork(false);
    }
  };

  const formatDate = (value) => String(value || '').slice(0, 10) || 'NO DATE';

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-primary font-mono text-sm">
        LOADING STUDENT DASHBOARD...
      </div>
    );
  }

  if (error && !dashboard) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-error font-mono text-sm uppercase">{error}</div>
        <button onClick={onLogout} className="text-outline border border-outline/30 rounded px-4 py-2 font-mono text-xs hover:text-primary">RETURN</button>
      </div>
    );
  }

  const { student, stats, achievements, daily_work_settings: dailyWorkSettings = {} } = dashboard;
  const canUpdateDailyWork = Boolean(dailyWorkSettings.can_update);
  const attendanceCalendar = Array.isArray(dashboard.attendance_calendar) ? dashboard.attendance_calendar : [];
  const workUpdateCalendar = Array.isArray(dashboard.work_update_calendar) ? dashboard.work_update_calendar : [];
  const firstCalendarDate = attendanceCalendar[0]?.date ? new Date(`${attendanceCalendar[0].date}T00:00:00`) : null;
  const leadingCalendarBlanks = firstCalendarDate && !Number.isNaN(firstCalendarDate.getTime()) ? firstCalendarDate.getDay() : 0;
  const [selectedYear, selectedMonth] = (selectedAttendanceMonth || getCurrentMonthValue()).split('-');

  return (
    <div className="min-h-screen p-6 md:p-10 animate-fade-slide">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-outline/20 bg-surface-container-low/60 rounded p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded overflow-hidden border border-outline/20 bg-background flex items-center justify-center">
              {student.image ? <img src={student.image} alt={student.name} className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline text-3xl">person</span>}
            </div>
            <div>
              <div className="font-mono text-[10px] text-secondary uppercase tracking-widest">STUDENT DASHBOARD</div>
              <h1 className="font-headline text-3xl font-bold text-on-surface">{student.name}</h1>
              <p className="font-mono text-xs text-outline uppercase">{student.team_name || 'UNASSIGNED'} / {student.department || 'NO DEPT'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="self-start md:self-auto text-outline border border-outline/30 rounded px-4 py-2 font-mono text-xs hover:text-error hover:border-error/40"
          >
            LOGOUT
          </button>
        </div>

        {(message || error) && (
          <div className={`border rounded p-3 font-mono text-xs uppercase ${error ? 'border-error/40 bg-error/10 text-error' : 'border-primary/40 bg-primary/10 text-primary'}`}>
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            ['Attendance', `${stats.attendance_percentage}%`],
            ['Present Days', stats.attended_days],
            ['OD Days', stats.od_days],
            ['Achievements', stats.achievements],
            ['Projects', stats.projects],
            ['Participations', stats.participations]
          ].map(([label, value]) => (
            <div key={label} className="bg-background border border-outline/20 rounded p-4 hover:border-primary/30 transition-colors">
              <div className="font-mono text-[10px] text-outline uppercase tracking-widest">{label}</div>
              <div className="font-headline text-3xl font-bold text-primary mt-2">{value}</div>
            </div>
          ))}
        </div>

        <section className="bg-background border border-outline/20 rounded p-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 text-primary">
                <span className="material-symbols-outlined text-2xl">edit_calendar</span>
                <h2 className="font-headline text-2xl font-bold text-on-surface">Daily Work Update</h2>
              </div>
              <div className="mt-2 font-mono text-xs text-outline uppercase tracking-widest">
                Opens after {dailyWorkSettings.start_time || '16:30'} IST / {canUpdateDailyWork ? 'Update window active' : 'Waiting for allowed time'}
              </div>
              <p className="mt-3 font-mono text-sm text-on-surface-variant">
                Current status: <span className="text-primary">{student.current_work_label || 'Not updated'}</span>
              </p>
            </div>
            <form onSubmit={saveDailyWork} className="w-full lg:max-w-2xl space-y-3 font-mono text-xs">
              <textarea
                value={dailyWorkText}
                onChange={(e) => setDailyWorkText(e.target.value)}
                rows={4}
                className="w-full bg-surface-container-low border border-outline/30 rounded p-3 text-on-surface focus:border-primary focus:outline-none"
                placeholder="Enter today's completed work, blockers, or lab progress"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className={canUpdateDailyWork ? 'text-primary' : 'text-outline'}>
                  {canUpdateDailyWork ? 'READY TO SUBMIT' : `LOCKED UNTIL ${dailyWorkSettings.start_time || '16:30'} IST`}
                </span>
                <button
                  disabled={savingDailyWork || !canUpdateDailyWork}
                  className="bg-primary/20 text-primary border border-primary/40 rounded px-5 py-2.5 font-bold hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingDailyWork ? 'SAVING...' : 'SAVE DAILY WORK'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="bg-background border border-outline/20 rounded overflow-hidden">
          <div className="bg-surface-bright px-5 py-4 border-b border-outline/20 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
              <div>
                <div className="font-mono text-xs text-on-surface-variant tracking-widest uppercase">ATTENDANCE_CALENDAR :: {formatCalendarMonth(dashboard.attendance_calendar_month)}</div>
                <div className="font-mono text-[10px] text-outline uppercase mt-1">Read-only personal attendance ledger</div>
              </div>
            </div>
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
                {getYearOptions(selectedYear).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-outline mb-4">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> PRESENT</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> ABSENT</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-300"></span> OD</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-outline"></span> OFF / UPCOMING</span>
              </div>
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
                      title={`${day.date} - ${day.label}${day.entry_time || day.entry_at ? ` | In: ${formatTimeForDisplay(day.entry_time || day.entry_at)}` : ''}${day.exit_time || day.exit_at ? ` | Exit: ${formatTimeForDisplay(day.exit_time || day.exit_at)}` : ''}`}
                      className={`min-h-24 rounded border p-2 flex flex-col justify-between text-left ${getCalendarStatusClass(day.status)}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-sm font-bold">{String(Number(day.date.slice(8, 10)))}</span>
                        <span className="font-mono text-[9px] uppercase opacity-80">{day.day}</span>
                      </div>
                      <div className="font-mono text-[9px] uppercase">
                        <div className="truncate">{day.status === 'present' ? 'Present' : day.status === 'absent' ? 'Absent' : day.status === 'od' ? 'OD' : day.status === 'upcoming' ? 'Next' : 'Off'}</div>
                        {day.status === 'present' && (
                          <div className="mt-1 space-y-0.5 leading-tight text-[8px]">
                            <div className="truncate">IN {day.entry_time || day.entry_at ? formatTimeForDisplay(day.entry_time || day.entry_at) : '-'}</div>
                            <div className="truncate">OUT {day.exit_time || day.exit_at ? formatTimeForDisplay(day.exit_time || day.exit_at) : '-'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="xl:col-span-4 bg-surface-container-low border border-outline/20 rounded p-4 max-h-[620px] overflow-y-auto">
              <div className="font-mono text-xs text-primary uppercase tracking-widest mb-3">Work Update Timeline</div>
              {workUpdateCalendar.length === 0 ? (
                <div className="border border-outline/10 rounded p-4 font-mono text-xs text-outline">No work update data available for this month.</div>
              ) : (
                <div className="space-y-3">
                  {workUpdateCalendar.map(log => (
                    <div key={log.id || `${log.work_date}-${log.status}`} className="border-l-2 border-primary/30 pl-3 pb-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-primary">{formatDate(log.work_date)}</span>
                        <span className={`font-mono text-[9px] uppercase border rounded px-2 py-0.5 ${getCalendarStatusClass(log.status)}`}>{log.label}</span>
                      </div>
                      <p className="font-mono text-xs text-on-surface-variant whitespace-pre-wrap">{log.work_text || log.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-5 bg-background border border-outline/20 rounded p-5">
            <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Student Details</h2>
            <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
              <label className="block">
                <span className="text-outline uppercase">Name</span>
                <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" required />
              </label>
              <label className="block">
                <span className="text-outline uppercase">Department</span>
                <input value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-outline uppercase">Year / Info</span>
                  <input value={profileForm.year_of_study} onChange={(e) => setProfileForm({ ...profileForm, year_of_study: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                </label>
                <label className="block">
                  <span className="text-outline uppercase">Studying Year</span>
                  <select value={profileForm.studying_year || ''} onChange={(e) => setProfileForm({ ...profileForm, studying_year: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface">
                    <option value="">N/A</option>
                    <option value="1">I</option>
                    <option value="2">II</option>
                    <option value="3">III</option>
                    <option value="4">IV</option>
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-outline uppercase">Profile Image</span>
                <div className="mt-2 grid grid-cols-[72px_1fr] gap-3 items-start">
                  <div className="w-16 h-16 rounded overflow-hidden border border-outline/30 bg-surface-container-low flex items-center justify-center">
                    {profileForm.image ? <img src={profileForm.image} alt="Profile preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-outline">person</span>}
                  </div>
                  <div className="space-y-2">
                    <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                    <input value={profileForm.image} onChange={(e) => setProfileForm({ ...profileForm, image: e.target.value })} className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" placeholder="Or paste image URL" />
                    <p className="text-outline text-[10px] uppercase">
                      {uploadingImage ? 'Uploading image...' : 'New images become visible after admin approval.'}
                    </p>
                    {student.pending_profile_image && (
                      <p className="text-secondary text-[10px] uppercase">Pending image approval already submitted.</p>
                    )}
                  </div>
                </div>
              </label>
              <label className="block">
                <span className="text-outline uppercase">Certificates</span>
                <textarea value={arrayToText(profileForm.certificates)} onChange={(e) => handleArrayTextChange('certificates', e.target.value)} rows={3} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" placeholder="One certificate per line" />
              </label>
              <label className="block">
                <span className="text-outline uppercase">Research / Work</span>
                <textarea value={arrayToText(profileForm.research_work)} onChange={(e) => handleArrayTextChange('research_work', e.target.value)} rows={3} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" placeholder="One item per line" />
              </label>
              <button disabled={saving} className="w-full bg-primary/20 text-primary border border-primary/40 rounded px-4 py-3 font-bold hover:bg-primary/30 disabled:opacity-50">
                {saving ? 'SAVING...' : 'SAVE PROFILE'}
              </button>
            </form>
          </section>

          <section className="xl:col-span-7 bg-background border border-outline/20 rounded p-5 space-y-5">
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Attendance</h2>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="border border-outline/20 rounded p-3"><span className="text-outline uppercase">Today Work:</span><div className="text-on-surface mt-1">{student.current_work_label}</div></div>
                <div className="border border-outline/20 rounded p-3"><span className="text-outline uppercase">Entry:</span><div className="text-on-surface mt-1">{stats.today_entry_at || '-'}</div></div>
                <div className="border border-outline/20 rounded p-3"><span className="text-outline uppercase">Exit:</span><div className="text-on-surface mt-1">{stats.today_exit_at || '-'}</div></div>
              </div>
            </div>

            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface mb-3">Achievements</h2>
              {achievements.length === 0 ? (
                <div className="border border-outline/20 rounded p-4 font-mono text-xs text-outline">No linked achievements yet.</div>
              ) : (
                <div className="space-y-3">
                  {achievements.map(achievement => (
                    <div key={achievement.id} className="border border-outline/20 rounded p-4">
                      <div className="font-headline text-lg font-bold text-primary">{achievement.title}</div>
                      <div className="font-mono text-[10px] text-outline mt-1">{formatDate(achievement.date)}</div>
                      <p className="font-mono text-xs text-on-surface-variant mt-2 line-clamp-3">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="bg-background border border-outline/20 rounded p-5">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Linked Projects</h2>
          {dashboard.projects.length === 0 ? (
            <div className="border border-outline/20 rounded p-4 font-mono text-xs text-outline">No linked projects found.</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {dashboard.projects.map(project => {
                const form = projectForms[project.id] || {};
                return (
                  <div key={project.id} className="border border-outline/20 rounded p-4 font-mono text-xs space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label>
                        <span className="text-outline uppercase">Title</span>
                        <input value={form.title || ''} onChange={(e) => setProjectForms({ ...projectForms, [project.id]: { ...form, title: e.target.value } })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                      </label>
                      <label>
                        <span className="text-outline uppercase">Status</span>
                        <input value={form.status || ''} onChange={(e) => setProjectForms({ ...projectForms, [project.id]: { ...form, status: e.target.value } })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-outline uppercase">Short Description</span>
                      <input value={form.shortDesc || ''} onChange={(e) => setProjectForms({ ...projectForms, [project.id]: { ...form, shortDesc: e.target.value } })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                    </label>
                    <label className="block">
                      <span className="text-outline uppercase">Full Description</span>
                      <textarea value={form.description || ''} onChange={(e) => setProjectForms({ ...projectForms, [project.id]: { ...form, description: e.target.value } })} rows={4} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                    </label>
                    <label className="block">
                      <span className="text-outline uppercase">Tech Stack</span>
                      <textarea value={form.stack || ''} onChange={(e) => setProjectForms({ ...projectForms, [project.id]: { ...form, stack: e.target.value } })} rows={2} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" placeholder="One item per line" />
                    </label>
                    <label className="block">
                      <span className="text-outline uppercase">Usage / Notes</span>
                      <textarea value={form.usage_desc || ''} onChange={(e) => setProjectForms({ ...projectForms, [project.id]: { ...form, usage_desc: e.target.value } })} rows={2} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                    </label>
                    <button type="button" disabled={saving} onClick={() => saveProject(project.id)} className="w-full bg-primary/20 text-primary border border-primary/40 rounded px-4 py-2 font-bold hover:bg-primary/30 disabled:opacity-50">SAVE PROJECT</button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-background border border-outline/20 rounded p-5">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Team Details</h2>
          {!teamForm ? (
            <div className="border border-outline/20 rounded p-4 font-mono text-xs text-outline">No team is linked to your profile.</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs">
              <label>
                <span className="text-outline uppercase">Team Name</span>
                <input value={teamForm.name} onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
              </label>
              <label>
                <span className="text-outline uppercase">Current Objective</span>
                <input value={teamForm.current_objective} onChange={(e) => setTeamForm({ ...teamForm, current_objective: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
              </label>
              <label className="lg:col-span-2">
                <span className="text-outline uppercase">Description</span>
                <textarea value={teamForm.description} onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })} rows={3} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
              </label>
              <label className="lg:col-span-2">
                <span className="text-outline uppercase">Technical Summary</span>
                <textarea value={teamForm.technical_summary} onChange={(e) => setTeamForm({ ...teamForm, technical_summary: e.target.value })} rows={3} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
              </label>
              <button type="button" disabled={saving} onClick={saveTeam} className="lg:col-span-2 bg-primary/20 text-primary border border-primary/40 rounded px-4 py-2 font-bold hover:bg-primary/30 disabled:opacity-50">SAVE TEAM</button>
            </div>
          )}
        </section>

        <section className="bg-background border border-outline/20 rounded p-5">
          <h2 className="font-headline text-xl font-bold text-on-surface mb-4">Manage Achievements</h2>
          <form onSubmit={addAchievement} className="mb-5 border border-outline/20 rounded p-4 grid grid-cols-1 lg:grid-cols-2 gap-3 font-mono text-xs">
            <input value={newAchievementForm.title} onChange={(e) => setNewAchievementForm({ ...newAchievementForm, title: e.target.value })} className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" placeholder="New achievement title" required />
            <input type="date" value={newAchievementForm.date} onChange={(e) => setNewAchievementForm({ ...newAchievementForm, date: e.target.value })} className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
            <textarea value={newAchievementForm.description} onChange={(e) => setNewAchievementForm({ ...newAchievementForm, description: e.target.value })} rows={3} className="lg:col-span-2 bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" placeholder="Achievement description" />
            <button disabled={saving} className="lg:col-span-2 bg-secondary/20 text-secondary border border-secondary/40 rounded px-4 py-2 font-bold hover:bg-secondary/30 disabled:opacity-50">ADD ACHIEVEMENT</button>
          </form>
          <div className="space-y-3">
            {dashboard.achievements.map(achievement => {
              const form = achievementForms[achievement.id] || {};
              return (
                <div key={achievement.id} className="border border-outline/20 rounded p-4 font-mono text-xs space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
                    <input value={form.title || ''} onChange={(e) => setAchievementForms({ ...achievementForms, [achievement.id]: { ...form, title: e.target.value } })} className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                    <input type="date" value={form.date || ''} onChange={(e) => setAchievementForms({ ...achievementForms, [achievement.id]: { ...form, date: e.target.value } })} className="bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                  </div>
                  <textarea value={form.description || ''} onChange={(e) => setAchievementForms({ ...achievementForms, [achievement.id]: { ...form, description: e.target.value } })} rows={3} className="w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
                  <button type="button" disabled={saving} onClick={() => saveAchievement(achievement.id)} className="w-full bg-primary/20 text-primary border border-primary/40 rounded px-4 py-2 font-bold hover:bg-primary/30 disabled:opacity-50">SAVE ACHIEVEMENT</button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StudentDashboard;
