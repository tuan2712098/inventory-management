import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Boxes, ChartNoAxesCombined, ShieldCheck, Warehouse, LockKeyhole, Mail, LoaderCircle } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';

const accounts = [
  ['Admin', 'admin@inventory.local'], ['Quản lý', 'manager@inventory.local'],
  ['Nhân viên', 'staff@inventory.local'], ['Người xem', 'viewer@inventory.local'],
];

export default function Login() {
  const [email, setEmail] = useState('admin@inventory.local');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const signIn = useAuth(s => s.signIn);
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      signIn(data);
    } catch (e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  }
  return <main className="auth-screen">
    <section className="auth-story">
      <div className="auth-logo"><span className="auth-logo-icon"><Boxes size={23}/></span><span>inventra<span className="auth-logo-dot">.</span></span></div>
      <div className="auth-story-content">
        <div className="auth-overline"><span className="pulse-dot"/> HỆ THỐNG QUẢN LÝ KHO</div>
        <h1>Mọi chuyển động.<br/><span>Trong tầm kiểm soát.</span></h1>
        <p>Một không gian làm việc để quản lý sản phẩm, điều phối tồn kho và theo dõi mọi giao dịch hàng hóa.</p>
        <div className="auth-feature-list">
          <div><div className="auth-feature-icon"><Warehouse size={20}/></div><span><strong>Quản lý đa kho</strong><small>Tồn kho đồng bộ theo từng địa điểm</small></span></div>
          <div><div className="auth-feature-icon"><ChartNoAxesCombined size={20}/></div><span><strong>Báo cáo trực quan</strong><small>Theo dõi nhập xuất và giá trị hàng hóa</small></span></div>
          <div><div className="auth-feature-icon"><ShieldCheck size={20}/></div><span><strong>Phân quyền & lịch sử</strong><small>Ghi nhận và tra cứu mọi biến động</small></span></div>
        </div>
      </div>
      <div className="auth-story-footer"><span>INVENTRA / INVENTORY OS</span><span>DEMO VERSION 1.0 <ArrowUpRight size={14}/></span></div>
      <div className="story-orbit one"/><div className="story-orbit two"/>
    </section>
    <section className="auth-form-panel">
      <div className="auth-form-card">
        <div className="auth-form-top"><span className="auth-eyebrow">WELCOME BACK</span><span className="auth-form-symbol"><Boxes size={23}/></span></div>
        <h2>Đăng nhập hệ thống</h2>
        <p>Nhập thông tin tài khoản để tiếp tục quản lý kho hàng.</p>
        <form onSubmit={login} className="auth-form">
          <label>Email <div className="input-icon"><Mail size={18}/><input type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required/></div></label>
          <label>Mật khẩu <div className="input-icon"><LockKeyhole size={18}/><input type="password" autoComplete="current-password" placeholder="Nhập mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required/></div></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="button primary large" disabled={busy} type="submit">{busy ? <><LoaderCircle size={19} className="spin"/> Đang đăng nhập...</> : <>Đăng nhập <ArrowRight size={19}/></>}</button>
        </form>
        <div className="auth-demo"><div className="auth-demo-label"><span>TÀI KHOẢN DEMO</span><span>CHỌN NHANH</span></div><div className="auth-demo-accounts">{accounts.map(([label, value]) => <button key={value} className={email === value ? 'selected' : ''} onClick={() => { setEmail(value); setError(''); }}>{label}</button>)}</div><p>Mật khẩu demo được hiển thị trong Terminal sau khi chạy lệnh seed.</p></div>
        <div className="auth-note">Dự án thực tập · Express.js · MongoDB · React</div>
      </div>
    </section>
  </main>;
}
