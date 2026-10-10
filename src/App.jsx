import React, { useEffect, useMemo, useState } from 'react';
import api from './api';

const uid = () => localStorage.getItem('userId');
const today = () => new Date().toISOString().slice(0, 10);

const emptyFarm = { farmName: '', location: '', area: '', soilType: '', waterAvailability: '' };
const emptyCrop = { cropName: '', status: 'Active', sowingDate: today(), expectedHarvestDate: '', expectedYield: '', expectedRevenue: '', farmId: '' };
const emptyExpense = { category: 'Seeds', amount: '', expenseDate: today(), farmId: '' };
const emptyFertilizer = { fertilizerName: '', quantity: '', applicationDate: today(), cropId: '' };
const emptyIrrigation = { irrigationDate: today(), waterQuantity: '', method: 'Drip', cropId: '' };

function App() {
  const [page, setPage] = useState(localStorage.getItem('userId') ? 'dashboard' : 'login');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fertilizers, setFertilizers] = useState([]);
  const [irrigations, setIrrigations] = useState([]);
  const [stats, setStats] = useState({ farms: 0, crops: 0, activeCrops: 0, irrigationActivities: 0, totalExpenses: 0, expectedRevenue: 0, expectedProfit: 0 });
  const [loading, setLoading] = useState(false);

  const logged = !!uid();

  useEffect(() => {
    if (logged && !['login', 'register'].includes(page)) refreshAll();
  }, [page, logged]);

  function clearNotice() { setMsg(''); setError(''); }
  function notify(text) { setMsg(text); setError(''); }
  function fail(text) { setError(text); setMsg(''); }

  async function refreshAll() {
    setLoading(true);
    try {
      const farmList = (await api.get(`/farms/${uid()}`)).data;
      setFarms(farmList);
      const cropGroups = await Promise.all(farmList.map(f => api.get(`/crops/farm/${f.id}`)));
      const cropList = cropGroups.flatMap(r => r.data);
      setCrops(cropList);
      const expenseGroups = await Promise.all(farmList.map(f => api.get(`/expenses/farm/${f.id}`)));
      setExpenses(expenseGroups.flatMap(r => r.data));
      const fertilizerGroups = await Promise.all(cropList.map(c => api.get(`/fertilizers/crop/${c.id}`)));
      setFertilizers(fertilizerGroups.flatMap(r => r.data));
      const irrigationGroups = await Promise.all(cropList.map(c => api.get(`/irrigation/crop/${c.id}`)));
      setIrrigations(irrigationGroups.flatMap(r => r.data));
      const dashboard = (await api.get(`/agri/dashboard/${uid()}`)).data;
      setStats(dashboard);
    } catch (e) {
      fail(e.response?.data?.message || 'Could not load AgriSmart data. Check that the backend is running.');
    } finally { setLoading(false); }
  }

  async function register(form) {
    try {
      await api.post('/users/register', form);
      notify('Registration successful. Please login.');
      setPage('login');
    } catch (e) { fail(e.response?.data?.message || 'Registration failed. Email may already exist.'); }
  }

  async function login(form) {
    try {
      const r = (await api.post('/users/login', form)).data;
      localStorage.setItem('token', r.token);
      localStorage.setItem('userId', r.userId);
      localStorage.setItem('name', r.name);
      clearNotice();
      setPage('dashboard');
    } catch (e) { fail(e.response?.data?.message || 'Invalid email or password'); }
  }

  function logout() { localStorage.clear(); setFarms([]); setCrops([]); setExpenses([]); setFertilizers([]); setIrrigations([]); setPage('login'); }

  if (page === 'login') return <AuthPage mode="login" onSubmit={login} onSwitch={() => { clearNotice(); setPage('register'); }} msg={msg} error={error} />;
  if (page === 'register') return <AuthPage mode="register" onSubmit={register} onSwitch={() => { clearNotice(); setPage('login'); }} msg={msg} error={error} />;

  const titles = {
    dashboard: ['Dashboard', 'Complete overview of your farm operations'],
    farms: ['Farm Management', 'Add, edit and organize your farms'],
    crops: ['Crop Management', 'Track crops, sowing, harvest, yield and revenue'],
    fertilizers: ['Fertilizer Management', 'Get suggestions and record fertilizer applications'],
    irrigation: ['Irrigation Scheduling', 'Plan and track water application for every crop'],
    expenses: ['Expense Management', 'Record and monitor farming expenses'],
    recommendation: ['Crop Recommendation', 'Select a crop using soil, water and season conditions'],
    profit: ['Profit Estimation', 'Understand expected revenue, expenses and profit']
  };

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span>🌱</span><div><strong>AgriSmart</strong><small>Smart Agriculture</small></div></div>
      <nav>
        <NavButton active={page === 'dashboard'} onClick={() => { clearNotice(); setPage('dashboard'); }}>🏠 Dashboard</NavButton>
        <NavButton active={page === 'farms'} onClick={() => { clearNotice(); setPage('farms'); }}>🌾 Farms</NavButton>
        <NavButton active={page === 'crops'} onClick={() => { clearNotice(); setPage('crops'); }}>🌱 Crops</NavButton>
        <NavButton active={page === 'fertilizers'} onClick={() => { clearNotice(); setPage('fertilizers'); }}>🧪 Fertilizers</NavButton>
        <NavButton active={page === 'irrigation'} onClick={() => { clearNotice(); setPage('irrigation'); }}>💧 Irrigation</NavButton>
        <NavButton active={page === 'expenses'} onClick={() => { clearNotice(); setPage('expenses'); }}>💰 Expenses</NavButton>
        <NavButton active={page === 'recommendation'} onClick={() => { clearNotice(); setPage('recommendation'); }}>🤖 Crop Recommendation</NavButton>
        <NavButton active={page === 'profit'} onClick={() => { clearNotice(); setPage('profit'); }}>📈 Profit</NavButton>
      </nav>
      <button className="logout" onClick={logout}>↪ Logout</button>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><h1>{titles[page][0]}</h1><p>{titles[page][1]}</p></div>
        <div className="profile"><div className="avatar">{(localStorage.getItem('name') || 'U').charAt(0).toUpperCase()}</div><span>{localStorage.getItem('name')}</span></div>
      </header>
      {msg && <div className="notice success">✓ {msg}</div>}
      {error && <div className="notice error">⚠ {error}</div>}
      {loading && <div className="loading">Loading your farm data...</div>}

      {page === 'dashboard' && <Dashboard stats={stats} farms={farms} crops={crops} expenses={expenses} irrigations={irrigations} onNavigate={setPage} />}
      {page === 'farms' && <FarmsPage farms={farms} onRefresh={refreshAll} notify={notify} fail={fail} />}
      {page === 'crops' && <CropsPage farms={farms} crops={crops} onRefresh={refreshAll} notify={notify} fail={fail} />}
      {page === 'fertilizers' && <FertilizerPage crops={crops} fertilizers={fertilizers} onRefresh={refreshAll} notify={notify} fail={fail} />}
      {page === 'irrigation' && <IrrigationPage crops={crops} irrigations={irrigations} onRefresh={refreshAll} notify={notify} fail={fail} />}
      {page === 'expenses' && <ExpensesPage farms={farms} expenses={expenses} onRefresh={refreshAll} notify={notify} fail={fail} />}
      {page === 'recommendation' && <RecommendationPage notify={notify} fail={fail} />}
      {page === 'profit' && <ProfitPage farms={farms} stats={stats} />}
    </main>
  </div>;
}

function NavButton({ active, children, onClick }) { return <button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>{children}</button>; }

function AuthPage({ mode, onSubmit, onSwitch, msg, error }) {
  const [form, setForm] = useState(mode === 'login' ? { email: '', password: '' } : { name: '', email: '', password: '', phone: '' });
  const set = (k, v) => setForm({ ...form, [k]: v });
  return <div className="auth-shell"><div className="auth-card">
    <div className="auth-logo">🌱</div><h1>AgriSmart</h1><p className="subtitle">Smart Agriculture Management & Crop Recommendation System</p>
    <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }}>
      {mode === 'register' && <Field label="Full Name" value={form.name} onChange={v => set('name', v)} required />}
      <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} required />
      <Field label="Password" type="password" value={form.password} onChange={v => set('password', v)} required />
      {mode === 'register' && <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />}
      <button className="primary full">{mode === 'login' ? 'Login' : 'Register'}</button>
    </form>
    {msg && <div className="notice success">✓ {msg}</div>}{error && <div className="notice error">⚠ {error}</div>}
    <button className="link-btn" onClick={onSwitch}>{mode === 'login' ? 'New farmer? Create an account' : 'Already have an account? Login'}</button>
  </div></div>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value ?? ''} required={required} placeholder={placeholder} onChange={e => onChange(e.target.value)} /></label>;
}
function SelectField({ label, value, onChange, options, required = false }) {
  return <label className="field"><span>{label}</span><select value={value ?? ''} required={required} onChange={e => onChange(e.target.value)}><option value="">Select {label}</option>{options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select></label>;
}
function Section({ title, children, actions }) { return <section className="panel"><div className="panel-head"><h2>{title}</h2>{actions}</div>{children}</section>; }
function Empty({ text }) { return <div className="empty">📋 {text}</div>; }
function money(v) { return `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`; }

function Dashboard({ stats, farms, crops, expenses, irrigations, onNavigate }) {
  const active = crops.filter(c => (c.status || '').toLowerCase() === 'active').length;
  const recentExpenses = [...expenses].sort((a, b) => String(b.expenseDate).localeCompare(String(a.expenseDate))).slice(0, 5);
  return <>
    <div className="hero"><div><span className="eyebrow">SMART FARMING COMMAND CENTER</span><h2>Welcome to your digital farm.</h2><p>Manage crops, water, fertilizers, expenses and expected profits from one place.</p></div><button className="primary" onClick={() => onNavigate('farms')}>＋ Add New Farm</button></div>
    <div className="stats-grid">
      <Stat icon="🌾" value={stats.farms} label="Total Farms" onClick={() => onNavigate('farms')} />
      <Stat icon="🌱" value={stats.activeCrops ?? active} label="Active Crops" onClick={() => onNavigate('crops')} />
      <Stat icon="💧" value={stats.irrigationActivities ?? irrigations.length} label="Irrigation Activities" onClick={() => onNavigate('irrigation')} />
      <Stat icon="💰" value={money(stats.totalExpenses)} label="Total Expenses" onClick={() => onNavigate('expenses')} />
      <Stat icon="📈" value={money(stats.expectedRevenue)} label="Expected Revenue" onClick={() => onNavigate('profit')} />
      <Stat icon="💹" value={money(stats.expectedProfit)} label="Expected Profit" onClick={() => onNavigate('profit')} />
    </div>
    <div className="dashboard-grid">
      <Section title="Your Farms"><div className="mini-list">{farms.length ? farms.slice(0, 4).map(f => <div className="list-row" key={f.id}><div><b>{f.farmName}</b><small>📍 {f.location} · {f.area} acres</small></div><span className="tag">{f.soilType || 'Soil not set'}</span></div>) : <Empty text="No farms added yet." />}</div></Section>
      <Section title="Quick Actions"><div className="quick-grid"><button onClick={() => onNavigate('crops')}>🌱<span>Add Crop</span></button><button onClick={() => onNavigate('fertilizers')}>🧪<span>Fertilizer</span></button><button onClick={() => onNavigate('irrigation')}>💧<span>Schedule Water</span></button><button onClick={() => onNavigate('expenses')}>💰<span>Add Expense</span></button><button onClick={() => onNavigate('recommendation')}>🤖<span>Recommend Crop</span></button><button onClick={() => onNavigate('profit')}>📊<span>View Profit</span></button></div></Section>
    </div>
    <Section title="Recent Expenses">{recentExpenses.length ? <DataTable headers={['Category', 'Farm', 'Date', 'Amount']} rows={recentExpenses.map(e => [e.category, farms.find(f => f.id === e.farm?.id)?.farmName || 'Farm', e.expenseDate, money(e.amount)])} /> : <Empty text="No expenses recorded yet." />}</Section>
  </>;
}
function Stat({ icon, value, label, onClick }) { return <button className="stat-card" onClick={onClick}><span className="stat-icon">{icon}</span><b>{value}</b><span>{label}</span></button>; }
function DataTable({ headers, rows, actions }) { return <div className="table-wrap"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}{actions && <th>Actions</th>}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j}>{v}</td>)}{actions && <td>{actions(i)}</td>}</tr>)}</tbody></table></div>; }

function FarmsPage({ farms, onRefresh, notify, fail }) {
  const [form, setForm] = useState(emptyFarm); const [editing, setEditing] = useState(null);
  const save = async e => { e.preventDefault(); try { const data = { ...form, area: Number(form.area) }; if (editing) await api.put(`/farms/one/${editing}`, data); else await api.post(`/farms/${uid()}`, data); setForm(emptyFarm); setEditing(null); notify(editing ? 'Farm updated successfully.' : 'Farm added successfully.'); await onRefresh(); } catch (e) { fail(e.response?.data?.message || 'Could not save farm.'); } };
  const edit = f => { setEditing(f.id); setForm({ farmName: f.farmName || '', location: f.location || '', area: f.area || '', soilType: f.soilType || '', waterAvailability: f.waterAvailability || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const remove = async id => { if (!confirm('Delete this farm and its related records?')) return; try { await api.delete(`/farms/one/${id}`); notify('Farm deleted.'); await onRefresh(); } catch (e) { fail('Could not delete farm.'); } };
  return <div className="two-col"><Section title={editing ? 'Edit Farm' : 'Add Farm'}><form onSubmit={save}><Field label="Farm Name" value={form.farmName} onChange={v => setForm({ ...form, farmName: v })} required /><Field label="Location" value={form.location} onChange={v => setForm({ ...form, location: v })} required /><Field label="Area (acres)" type="number" value={form.area} onChange={v => setForm({ ...form, area: v })} required /><SelectField label="Soil Type" value={form.soilType} onChange={v => setForm({ ...form, soilType: v })} options={['Black','Alluvial','Red','Loamy','Sandy','Clay','Other']} required /><SelectField label="Water Availability" value={form.waterAvailability} onChange={v => setForm({ ...form, waterAvailability: v })} options={['High','Medium','Low','Rain-fed']} required /><div className="form-actions"><button className="primary">{editing ? 'Update Farm' : 'Add Farm'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm(emptyFarm); }}>Cancel</button>}</div></form></Section>
    <Section title={`Your Farms (${farms.length})`}>{farms.length ? farms.map(f => <div className="record-card" key={f.id}><div><h3>{f.farmName}</h3><p>📍 {f.location} · {f.area} acres</p><div className="chips"><span>{f.soilType}</span><span>💧 {f.waterAvailability}</span></div></div><div className="actions"><button className="small secondary" onClick={() => edit(f)}>Edit</button><button className="small danger" onClick={() => remove(f.id)}>Delete</button></div></div>) : <Empty text="Add your first farm to start managing crops." />}</Section></div>;
}

function CropsPage({ farms, crops, onRefresh, notify, fail }) {
  const [form, setForm] = useState(emptyCrop); const [editing, setEditing] = useState(null);
  useEffect(() => { if (!form.farmId && farms[0]) setForm(f => ({ ...f, farmId: farms[0].id })); }, [farms]);
  const save = async e => { e.preventDefault(); try { const data = { ...form, farmId: Number(form.farmId), expectedYield: form.expectedYield ? Number(form.expectedYield) : null, expectedRevenue: form.expectedRevenue ? Number(form.expectedRevenue) : null }; if (editing) await api.put(`/crops/${editing}`, data); else await api.post('/crops', data); setForm({ ...emptyCrop, farmId: farms[0]?.id || '' }); setEditing(null); notify(editing ? 'Crop updated successfully.' : 'Crop added successfully.'); await onRefresh(); } catch (e) { fail(e.response?.data?.message || 'Could not save crop.'); } };
  const remove = async id => { if (!confirm('Delete this crop?')) return; try { await api.delete(`/crops/${id}`); notify('Crop deleted.'); await onRefresh(); } catch { fail('Could not delete crop.'); } };
  return <div className="two-col"><Section title={editing ? 'Edit Crop' : 'Add Crop'}><form onSubmit={save}>{farms.length ? <SelectField label="Farm" value={form.farmId} onChange={v => setForm({ ...form, farmId: v })} options={farms.map(f => ({ value: f.id, label: f.farmName }))} required /> : <Empty text="Add a farm first." />}<Field label="Crop Name" value={form.cropName} onChange={v => setForm({ ...form, cropName: v })} required /><SelectField label="Status" value={form.status} onChange={v => setForm({ ...form, status: v })} options={['Active','Planned','Harvested','Paused']} required /><Field label="Sowing Date" type="date" value={form.sowingDate} onChange={v => setForm({ ...form, sowingDate: v })} /><Field label="Expected Harvest Date" type="date" value={form.expectedHarvestDate} onChange={v => setForm({ ...form, expectedHarvestDate: v })} /><Field label="Expected Yield (kg)" type="number" value={form.expectedYield} onChange={v => setForm({ ...form, expectedYield: v })} /><Field label="Expected Revenue (₹)" type="number" value={form.expectedRevenue} onChange={v => setForm({ ...form, expectedRevenue: v })} /><div className="form-actions"><button className="primary" disabled={!farms.length}>{editing ? 'Update Crop' : 'Add Crop'}</button>{editing && <button type="button" className="secondary" onClick={() => { setEditing(null); setForm({ ...emptyCrop, farmId: farms[0]?.id || '' }); }}>Cancel</button>}</div></form></Section>
    <Section title={`Crop Records (${crops.length})`}>{crops.length ? <DataTable headers={['Crop','Farm','Status','Sowing','Harvest','Yield','Revenue']} rows={crops.map(c => [c.cropName, farms.find(f => f.id === c.farm?.id)?.farmName || 'Farm', <span className="tag">{c.status}</span>, c.sowingDate || '-', c.expectedHarvestDate || '-', `${c.expectedYield || 0} kg`, money(c.expectedRevenue)])} actions={i => <><button className="small secondary" onClick={() => { const c = crops[i]; setEditing(c.id); setForm({ cropName: c.cropName || '', status: c.status || 'Active', sowingDate: c.sowingDate || '', expectedHarvestDate: c.expectedHarvestDate || '', expectedYield: c.expectedYield || '', expectedRevenue: c.expectedRevenue || '', farmId: c.farm?.id || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button className="small danger" onClick={() => remove(crops[i].id)}>Delete</button></>} /> : <Empty text="No crops added yet." />}</Section></div>;
}

function FertilizerPage({ crops, fertilizers, onRefresh, notify, fail }) {
  const [form, setForm] = useState(emptyFertilizer); const [rec, setRec] = useState(null);
  useEffect(() => { if (!form.cropId && crops[0]) setForm(f => ({ ...f, cropId: crops[0].id })); }, [crops]);
  const save = async e => { e.preventDefault(); try { await api.post('/fertilizers', { ...form, cropId: Number(form.cropId), quantity: Number(form.quantity) }); setForm({ ...emptyFertilizer, cropId: crops[0]?.id || '' }); notify('Fertilizer application recorded.'); await onRefresh(); } catch (e) { fail(e.response?.data?.message || 'Could not save fertilizer record.'); } };
  const recommend = async () => { const crop = crops.find(c => String(c.id) === String(form.cropId)); if (!crop) return; try { setRec((await api.get('/agri/fertilizer-recommendation', { params: { cropName: crop.cropName } })).data); } catch { fail('Could not get fertilizer recommendation.'); } };
  return <div className="two-col"><div><Section title="Fertilizer Recommendation"><p className="helper">Choose a crop to receive a starter fertilizer suggestion.</p><SelectField label="Crop" value={form.cropId} onChange={v => setForm({ ...form, cropId: v })} options={crops.map(c => ({ value: c.id, label: c.cropName }))} /> <button className="secondary" onClick={recommend} disabled={!crops.length}>Get Recommendation</button>{rec && <div className="recommend-box"><b>{rec.fertilizer}</b><p>{rec.reason}</p><small>{rec.note}</small></div>}</Section><Section title="Record Fertilizer Application"><form onSubmit={save}><SelectField label="Crop" value={form.cropId} onChange={v => setForm({ ...form, cropId: v })} options={crops.map(c => ({ value: c.id, label: c.cropName }))} required /><Field label="Fertilizer Name" value={form.fertilizerName} onChange={v => setForm({ ...form, fertilizerName: v })} placeholder="e.g. Urea, DAP, NPK" required /><Field label="Quantity (kg)" type="number" value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} required /><Field label="Application Date" type="date" value={form.applicationDate} onChange={v => setForm({ ...form, applicationDate: v })} required /><button className="primary" disabled={!crops.length}>Save Application</button></form></Section></div><Section title={`Fertilizer Applications (${fertilizers.length})`}>{fertilizers.length ? fertilizers.map(f => <div className="record-card" key={f.id}><div><h3>{f.fertilizerName}</h3><p>{crops.find(c => c.id === f.crop?.id)?.cropName || 'Crop'} · {f.quantity} kg · {f.applicationDate}</p></div></div>) : <Empty text="No fertilizer applications recorded." />}</Section></div>;
}

function IrrigationPage({ crops, irrigations, onRefresh, notify, fail }) {
  const [form, setForm] = useState(emptyIrrigation); const [plan, setPlan] = useState(null);
  useEffect(() => { if (!form.cropId && crops[0]) setForm(f => ({ ...f, cropId: crops[0].id })); }, [crops]);
  const save = async e => { e.preventDefault(); try { await api.post('/irrigation', { ...form, cropId: Number(form.cropId), waterQuantity: Number(form.waterQuantity) }); setForm({ ...emptyIrrigation, cropId: crops[0]?.id || '' }); notify('Irrigation schedule saved.'); await onRefresh(); } catch (e) { fail(e.response?.data?.message || 'Could not save irrigation schedule.'); } };
  const getPlan = async () => { const crop = crops.find(c => String(c.id) === String(form.cropId)); if (!crop) return; try { setPlan((await api.get('/agri/irrigation-plan', { params: { cropName: crop.cropName } })).data); } catch { fail('Could not generate irrigation plan.'); } };
  return <div className="two-col"><div><Section title="Smart Irrigation Plan"><p className="helper">Generate a simple starter schedule based on crop type.</p><SelectField label="Crop" value={form.cropId} onChange={v => setForm({ ...form, cropId: v })} options={crops.map(c => ({ value: c.id, label: c.cropName }))} /><button className="secondary" onClick={getPlan} disabled={!crops.length}>Generate Plan</button>{plan && <div className="recommend-box"><b>{plan.frequency}</b><p>Suggested water: {plan.waterQuantity} L/acre</p><small>{plan.method}. {plan.note}</small></div>}</Section><Section title="Schedule Irrigation"><form onSubmit={save}><SelectField label="Crop" value={form.cropId} onChange={v => setForm({ ...form, cropId: v })} options={crops.map(c => ({ value: c.id, label: c.cropName }))} required /><Field label="Irrigation Date" type="date" value={form.irrigationDate} onChange={v => setForm({ ...form, irrigationDate: v })} required /><Field label="Water Quantity (L)" type="number" value={form.waterQuantity} onChange={v => setForm({ ...form, waterQuantity: v })} required /><SelectField label="Method" value={form.method} onChange={v => setForm({ ...form, method: v })} options={['Drip','Sprinkler','Flood','Rain-fed','Other']} required /><button className="primary" disabled={!crops.length}>Save Schedule</button></form></Section></div><Section title={`Irrigation Activities (${irrigations.length})`}>{irrigations.length ? <DataTable headers={['Crop','Date','Water','Method']} rows={irrigations.map(i => [crops.find(c => c.id === i.crop?.id)?.cropName || 'Crop', i.irrigationDate, `${i.waterQuantity} L`, i.method])} /> : <Empty text="No irrigation activities recorded." />}</Section></div>;
}

function ExpensesPage({ farms, expenses, onRefresh, notify, fail }) {
  const [form, setForm] = useState(emptyExpense);
  useEffect(() => { if (!form.farmId && farms[0]) setForm(f => ({ ...f, farmId: farms[0].id })); }, [farms]);
  const save = async e => { e.preventDefault(); try { await api.post('/expenses', { ...form, farmId: Number(form.farmId), amount: Number(form.amount) }); setForm({ ...emptyExpense, farmId: farms[0]?.id || '' }); notify('Expense recorded successfully.'); await onRefresh(); } catch (e) { fail(e.response?.data?.message || 'Could not save expense.'); } };
  return <div className="two-col"><Section title="Add Expense"><form onSubmit={save}><SelectField label="Farm" value={form.farmId} onChange={v => setForm({ ...form, farmId: v })} options={farms.map(f => ({ value: f.id, label: f.farmName }))} required /><SelectField label="Category" value={form.category} onChange={v => setForm({ ...form, category: v })} options={['Seeds','Fertilizer','Irrigation','Labour','Pesticide','Equipment','Transport','Other']} required /><Field label="Amount (₹)" type="number" value={form.amount} onChange={v => setForm({ ...form, amount: v })} required /><Field label="Expense Date" type="date" value={form.expenseDate} onChange={v => setForm({ ...form, expenseDate: v })} required /><button className="primary" disabled={!farms.length}>Add Expense</button></form></Section><Section title={`Expense Records (${expenses.length})`}>{expenses.length ? <DataTable headers={['Category','Farm','Date','Amount']} rows={expenses.map(e => [e.category, farms.find(f => f.id === e.farm?.id)?.farmName || 'Farm', e.expenseDate, money(e.amount)])} /> : <Empty text="No expenses recorded." />}</Section></div>;
}

function RecommendationPage({ notify, fail }) {
  const [form, setForm] = useState({ soilType: '', waterAvailability: '', season: 'Kharif' }); const [r, setR] = useState(null);
  const recommend = async e => { e.preventDefault(); try { setR((await api.get('/agri/recommendation', { params: form })).data); notify('Crop recommendation generated.'); } catch { fail('Recommendation failed.'); } };
  return <Section title="Smart Crop Recommendation"><p className="helper">Enter your field conditions. AgriSmart uses a rule-based starter model to suggest a suitable crop.</p><form onSubmit={recommend} className="recommend-form"><SelectField label="Soil Type" value={form.soilType} onChange={v => setForm({ ...form, soilType: v })} options={['Black','Alluvial','Red','Loamy','Sandy','Clay','Other']} required /><SelectField label="Water Availability" value={form.waterAvailability} onChange={v => setForm({ ...form, waterAvailability: v })} options={['High','Medium','Low','Rain-fed']} required /><SelectField label="Season" value={form.season} onChange={v => setForm({ ...form, season: v })} options={['Kharif','Rabi','Summer']} required /><button className="primary">🤖 Recommend Crop</button></form>{r && <div className="big-result"><span>Recommended Crop</span><h2>🌾 {r.recommendedCrop}</h2><p>{r.reason}</p><small>{r.note}</small></div>}</Section>;
}

function ProfitPage({ farms, stats }) {
  const [farmId, setFarmId] = useState(''); const [r, setR] = useState(null);
  const load = async id => { setFarmId(id); if (id) setR((await api.get(`/agri/profit/${id}`)).data); else setR(null); };
  return <><Section title="Profit Estimation"><p className="helper">Select a farm to calculate expected revenue minus recorded expenses.</p><SelectField label="Farm" value={farmId} onChange={load} options={farms.map(f => ({ value: f.id, label: f.farmName }))} />{r && <div className="profit-grid"><div><span>Expected Revenue</span><b>{money(r.expectedRevenue)}</b></div><div><span>Total Expenses</span><b>{money(r.totalExpenses)}</b></div><div className={r.estimatedProfit >= 0 ? 'positive' : 'negative'}><span>Estimated Profit</span><b>{money(r.estimatedProfit)}</b></div></div>}</Section><div className="hero compact"><div><span className="eyebrow">PORTFOLIO SUMMARY</span><h2>All-farm expected profit: {money(stats.expectedProfit)}</h2><p>Keep crop revenue estimates and expenses updated for a more useful projection.</p></div></div></>;
}

export default App;
