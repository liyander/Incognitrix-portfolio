/* Designed and engineered by liyander Rishwanth (CyberGhost05) */
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const PUBLIC_API_URL = '/api/public';
const API_KEY = 'incognitrix_public_api_8c8a1c5f2c9d4a21b9f0e6a7d3c2';

const DASHBOARD_HEADERS = {
  'x-api-key': API_KEY,
  'Content-Type': 'application/json'
};

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [levelStats, setLevelStats] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch summary
        const summaryRes = await fetch(`${PUBLIC_API_URL}/summary`, { headers: DASHBOARD_HEADERS });
        if (!summaryRes.ok) throw new Error('Failed to fetch summary');
        const summaryData = await summaryRes.json();
        setSummary({
          totalStudents: summaryData.totals?.students || 0,
          totalCertificates: summaryData.totals?.certificates || 0,
          activeStudyPaths: summaryData.totals?.studyPaths || 0
        });

        // Fetch level stats
        const levelsRes = await fetch(`${PUBLIC_API_URL}/students/levels`, { headers: DASHBOARD_HEADERS });
        if (!levelsRes.ok) throw new Error('Failed to fetch level stats');
        const levelsData = await levelsRes.json();
        
        // Transform for charts
        const parsedLevels = levelsData.items || levelsData.levels || levelsData;
        if (Array.isArray(parsedLevels)) {
          setLevelStats(parsedLevels.map(l => ({ name: l.level || l.name || 'Unknown', count: l.count || 0 })));
        }

        // Fetch detailed students
        const studentsRes = await fetch(`${PUBLIC_API_URL}/students`, { headers: DASHBOARD_HEADERS });
        if (!studentsRes.ok) throw new Error('Failed to fetch students data');
        const studentsData = await studentsRes.json();
        const parsedStudents = studentsData.items || studentsData.students || studentsData.data || studentsData;
        setStudents(Array.isArray(parsedStudents) ? parsedStudents : []);

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const COLORS = ['#00F5FF', '#10B981', '#3B82F6', '#8B5CF6', '#8A2BE2', '#F43F5E'];

  if (loading) {
    return (
      <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full text-center">
        <span className="material-symbols-outlined text-primary text-6xl animate-spin">data_usage</span>
        <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface mt-4">INITIALIZING TELEMETRY...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full text-center">
        <span className="material-symbols-outlined text-error text-6xl">error</span>
        <h2 className="font-headline text-2xl font-bold tracking-tight text-error mt-4">TELEMETRY FAILURE</h2>
        <p className="font-mono text-sm text-outline mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="pt-12 pb-12 px-6 lg:px-12 max-w-7xl mx-auto w-full flex flex-col gap-8 text-on-surface animate-fade-slide">
      <header className="mb-4">
        <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tight mb-2 uppercase text-primary">GLOBAL TELEMETRY DASHBOARD</h1>
        <p className="text-on-surface-variant max-w-2xl text-sm md:text-base opacity-80 leading-relaxed font-mono">
          Real-time metrics tracking operative levels, population density, and system-wide progress.
        </p>
      </header>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-container to-transparent opacity-50"></div>
          <span className="material-symbols-outlined text-primary-container text-4xl mb-2">groups</span>
          <h3 className="font-mono text-xs uppercase tracking-widest text-outline mb-1">Total Operatives</h3>
          <span className="font-headline text-5xl font-bold text-on-surface">
            {summary?.totalStudents || students.length || 0}
          </span>
        </div>
        
        <div className="bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50"></div>
          <span className="material-symbols-outlined text-emerald-400 text-4xl mb-2">emoji_events</span>
          <h3 className="font-mono text-xs uppercase tracking-widest text-outline mb-1">Total Certificates</h3>
          <span className="font-headline text-5xl font-bold text-on-surface">
            {summary?.totalCertificates || 0}
          </span>
        </div>

        <div className="bg-surface-container-low p-6 rounded border ghost-border relative overflow-hidden flex flex-col items-center text-center">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
          <span className="material-symbols-outlined text-blue-500 text-4xl mb-2">hub</span>
          <h3 className="font-mono text-xs uppercase tracking-widest text-outline mb-1">Active Study Paths</h3>
          <span className="font-headline text-5xl font-bold text-on-surface">
            {summary?.totalStudyPaths || 0}
          </span>
        </div>
      </div>

      {/* Visualizations Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Bar Chart */}
        <div className="bg-surface-container-lowest p-6 rounded border ghost-border">
          <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">bar_chart</span>
            Operatives per Level
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fontFamily: 'monospace', fontSize: 12}} />
                <YAxis stroke="rgba(255,255,255,0.5)" tick={{fontFamily: 'monospace', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#00F5FF', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#00F5FF' }}
                />
                <Bar dataKey="count" fill="#00F5FF" radius={[4, 4, 0, 0]}>
                  {levelStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info or Doughnut */}
        <div className="bg-surface-container-lowest p-6 rounded border ghost-border">
          <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-container">donut_large</span>
            Level Distribution
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={levelStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                  stroke="none"
                >
                  {levelStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111317', borderColor: '#00F5FF', fontFamily: 'monospace' }}
                  itemStyle={{ color: '#00F5FF' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontFamily: 'monospace', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-surface-container-low p-6 rounded flex flex-col gap-4 border ghost-border">
        <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary-container">table_view</span>
          Operative Ledger
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono whitespace-nowrap">
            <thead className="text-outline uppercase tracking-wider border-b border-outline/20">
              <tr>
                <th className="px-4 py-3">ID / Display Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Current Level</th>
                <th className="px-4 py-3">Completed Paths</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10 text-on-surface-variant">
              {students && students.map((s) => (
                <tr key={s.id} className="hover:bg-surface-bright transition-colors group">
                  <td className="px-4 py-3 text-on-surface font-headline font-bold">
                    {s.displayName || `Op-${s.id}`}
                  </td>
                  <td className="px-4 py-3">{s.username || s.name || 'UNKNOWN'}</td>
                  <td className="px-4 py-3">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] uppercase">
                      LEVEL {s.level || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-emerald-400">
                    {s.completedPaths || 0} Paths
                  </td>
                  <td className="px-4 py-3 group-hover:text-primary transition-colors">
                    ACTIVE
                  </td>
                </tr>
              ))}
              {(!students || students.length === 0) && (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-outline">
                    No operating personnel data retrieved.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;