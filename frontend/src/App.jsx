import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell, Boxes, ChevronDown, ChevronRight, ClipboardCheck, ClipboardList, FolderTree, LayoutDashboard, LogOut, Menu, Package, Search, Settings, ShieldCheck, Truck, UserRound, UsersRound, Warehouse, X } from 'lucide-react';
import api from './lib/api';
import { useAuth } from './lib/auth';
import { ROLE } from './components/UI';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Catalog from './pages/Catalog';
import StockLevels from './pages/StockLevels';
import StockOperations from './pages/StockOperations';
import Audits from './pages/Audits';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const sections = [
  { label: 'KHÔNG GIAN LÀM VIỆC', links: [
    ['dashboard','Tổng quan',LayoutDashboard],
    ['products','Sản phẩm',Package], ['categories','Danh mục',FolderTree],
    ['warehouses','Kho hàng',Warehouse], ['suppliers','Nhà cung cấp',Truck],
  ] },
  { label: 'VẬN HÀNH KHO', links: [
    ['stock-levels','Tồn kho hiện tại',Boxes], ['stock-in','Nhập kho',ArrowDownLeft],
    ['stock-out','Xuất kho',ArrowUpRight], ['stock-transfers','Chuyển kho',ArrowLeftRight],
    ['stock-audits','Kiểm kê',ClipboardCheck],
  ] },
  { label: 'THỐNG KÊ & QUẢN TRỊ', links: [
    ['alerts','Cảnh báo',Bell], ['movements','Lịch sử & báo cáo',ClipboardList],
    ['users','Nhân viên',UsersRound, 'super_admin'], ['profile','Tài khoản',UserRound],
  ] },
];

const pageName = Object.fromEntries(sections.flatMap(group => group.links.map(([id,name]) => [id,name])));

export default function App() {
  const session = useAuth(s=>s.session);
  const signOut = useAuth(s=>s.signOut);
  const [page,setPage] = useState('dashboard');
  const [sidebar,setSidebar] = useState(false);
  const [alerts,setAlerts] = useState(0);
  useEffect(() => {
    if (!session) return;
    api.get('/users/me').catch(()=>{});
    api.get('/alerts').then(r=>setAlerts(r.data.items.length)).catch(()=>{});
  },[session]);
  function navigate(target) {setPage(target);setSidebar(false);window.scrollTo({top:0,behavior:'smooth'});}
  async function logout(){try{await api.post('/auth/logout',{refreshToken:session?.refreshToken});}catch{}signOut();setPage('dashboard');}
  if(!session)return <Login/>;
  const {user}=session;
  const today=new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  return <div className="app-shell">
    {sidebar && <button className="sidebar-shade" aria-label="Đóng menu" onClick={()=>setSidebar(false)}/>}
    <aside className={`sidebar ${sidebar?'show':''}`}>
      <div className="sidebar-top"><div className="brand"><div className="brand-mark"><Boxes size={23}/></div><span>inventra<span className="brand-period">.</span></span></div><button className="sidebar-close icon-button" onClick={()=>setSidebar(false)}><X size={20}/></button></div>
      <div className="sidebar-company"><div className="company-icon"><Warehouse size={19}/></div><div><strong>Inventory Workspace</strong><small>Quản lý hàng hóa nội bộ</small></div><ChevronDown size={15}/></div>
      <nav className="sidebar-nav" aria-label="Điều hướng chính">{sections.map(group=><div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.links.filter(([, , , required])=>!required || required === user.role).map(([id,name,Icon])=><button type="button" className={`nav-link ${page===id?'active':''}`} key={id} onClick={()=>navigate(id)}><Icon size={19} strokeWidth={page===id?2.3:1.8}/><span>{name}</span>{id==='alerts' && alerts>0 && <span className="nav-count">{alerts}</span>}{page===id && <span className="active-stripe"/>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-help"><span className="sidebar-help-icon"><ShieldCheck size={21}/></span><strong>Quản lý an toàn</strong><p>Các thay đổi số lượng đều được ghi nhận trong nhật ký tồn kho.</p></div><div className="side-version">INVENTRA <span>V1.0 · INTERNSHIP</span></div></div>
    </aside>
    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu icon-button" onClick={()=>setSidebar(true)} aria-label="Mở menu"><Menu size={22}/></button><span className="breadcrumbs">Workspace <ChevronRight size={15}/> <strong>{pageName[page]}</strong></span></div><div className="topbar-right"><span className="topbar-date">{today}</span><button className="topbar-alert icon-button" aria-label="Xem cảnh báo" onClick={()=>navigate('alerts')}><Bell size={20}/>{alerts>0&&<span className="notification-dot"/>}</button><div className="topbar-sep"/><button className="user-dropdown" onClick={()=>navigate('profile')}><div className="user-avatar">{user.fullName?.charAt(0)?.toUpperCase()||'U'}</div><div><strong>{user.fullName}</strong><span>{ROLE[user.role]||user.role}</span></div><ChevronDown size={15}/></button><button className="top-logout icon-button" title="Đăng xuất" onClick={logout}><LogOut size={19}/></button></div></header>
      <div className="main-content">
        {page==='dashboard'&&<Dashboard role={user.role} navigate={navigate}/>}
        {['products','categories','warehouses','suppliers','users'].includes(page)&&<Catalog key={page} kind={page} role={user.role}/>}
        {page==='stock-levels'&&<StockLevels/>}
        {['stock-in','stock-out','stock-transfers'].includes(page)&&<StockOperations key={page} kind={page} role={user.role}/>}
        {page==='stock-audits'&&<Audits role={user.role}/>}
        {page==='alerts'&&<Alerts role={user.role}/>}
        {page==='movements'&&<Reports role={user.role}/>}
        {page==='profile'&&<Profile/>}
        <footer className="app-footer"><span>© {new Date().getFullYear()} Inventra · Inventory Management System</span><span>Express.js / MongoDB / React</span></footer>
      </div>
    </div>
  </div>;
}
