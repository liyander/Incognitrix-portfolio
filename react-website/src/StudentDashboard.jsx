import React, { useEffect, useState } from 'react';

const parseEditableArray = (value) => {
  if (Array.isArray(value)) return value;
  return [];
};

function StudentDashboard({ onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = sessionStorage.getItem('studentToken') || '';

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/student/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'Failed to load student dashboard');
        return;
      }
      setDashboard(data);
      setProfileForm({
        name: data.student.name || '',
        department: data.student.department || '',
        year_of_study: data.student.year_of_study || '',
        studying_year: data.student.studying_year || '',
        image: data.student.image || '',
        certificates: parseEditableArray(data.student.certificates),
        research_work: parseEditableArray(data.student.research_work)
      });
    } catch (err) {
      console.error(err);
      setError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

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
      await fetchDashboard();
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

  const { student, stats, achievements } = dashboard;

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

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            ['Attendance', `${stats.attendance_percentage}%`],
            ['Present Days', stats.attended_days],
            ['OD Days', stats.od_days],
            ['Achievements', stats.achievements],
            ['Participations', stats.participations]
          ].map(([label, value]) => (
            <div key={label} className="bg-background border border-outline/20 rounded p-4">
              <div className="font-mono text-[10px] text-outline uppercase tracking-widest">{label}</div>
              <div className="font-headline text-3xl font-bold text-primary mt-2">{value}</div>
            </div>
          ))}
        </div>

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
                <span className="text-outline uppercase">Image URL</span>
                <input value={profileForm.image} onChange={(e) => setProfileForm({ ...profileForm, image: e.target.value })} className="mt-1 w-full bg-surface-container-low border border-outline/30 rounded p-2 text-on-surface" />
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
      </div>
    </div>
  );
}

export default StudentDashboard;
