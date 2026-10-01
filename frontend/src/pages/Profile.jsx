import { useEffect, useState } from 'react';
import { KeyRound, Save, UserRound } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Field, Message, ROLE, SectionTitle } from '../components/UI';

export default function Profile() {
  const session=useAuth(s=>s.session);
  const updateUser=useAuth(s=>s.updateUser);
  const signOut=useAuth(s=>s.signOut);
  const [form,setForm]=useState({fullName:session?.user?.fullName||'',phone:''});
  const [pw,setPw]=useState({oldPassword:'',newPassword:'',confirm:''});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  useEffect(()=>{api.get('/users/me').then(r=>setForm({fullName:r.data.fullName||'',phone:r.data.phone||''})).catch(()=>{});},[]);
  async function save(e){e.preventDefault();setError('');setSuccess('');setBusy(true);try{const {data}=await api.patch('/users/me',form);updateUser({...session.user,fullName:data.fullName});setSuccess('Đã lưu thông tin cá nhân');}catch(e){setError(errMessage(e));}finally{setBusy(false);}}
  async function password(e){e.preventDefault();setError('');setSuccess('');if(pw.newPassword!==pw.confirm){setError('Hai mật khẩu mới không khớp');return;}setBusy(true);try{await api.post('/auth/change-password',{oldPassword:pw.oldPassword,newPassword:pw.newPassword});await api.post('/auth/logout',{refreshToken:session.refreshToken}).catch(()=>{});signOut();}catch(e){setError(errMessage(e));}finally{setBusy(false);}}
  return <><SectionTitle label="TÀI KHOẢN & BẢO MẬT" title="Thông tin cá nhân" description="Cập nhật hồ sơ và thay đổi mật khẩu đăng nhập."/><Message variant="error" text={error} clear={()=>setError('')}/><Message text={success} clear={()=>setSuccess('')}/><div className="profile-grid"><section className="panel form-panel"><div className="panel-head"><div><span className="eyebrow">HỒ SƠ NHÂN VIÊN</span><h2>Thông tin tài khoản</h2></div><UserRound size={22} color="#8b99af"/></div><div className="profile-identity"><div className="profile-avatar">{session.user.fullName[0]}</div><div><strong>{session.user.fullName}</strong><span>{ROLE[session.user.role]}</span></div></div><form className="form-vertical" onSubmit={save}><Field label="Họ và tên" required><input required value={form.fullName} onChange={e=>setForm(s=>({...s,fullName:e.target.value}))}/></Field><Field label="Email"><input disabled value={session.user.email}/></Field><Field label="Số điện thoại"><input value={form.phone} onChange={e=>setForm(s=>({...s,phone:e.target.value}))}/></Field><button className="button primary" disabled={busy}><Save size={17}/> Lưu hồ sơ</button></form></section><section className="panel form-panel"><div className="panel-head"><div><span className="eyebrow">BẢO MẬT</span><h2>Đổi mật khẩu</h2></div><KeyRound size={22} color="#8b99af"/></div><p className="hint">Mật khẩu mới cần ít nhất 8 ký tự. Bạn sẽ cần đăng nhập lại sau khi đổi.</p><form className="form-vertical" onSubmit={password}><Field label="Mật khẩu hiện tại" required><input type="password" required value={pw.oldPassword} onChange={e=>setPw(s=>({...s,oldPassword:e.target.value}))}/></Field><Field label="Mật khẩu mới" required><input type="password" minLength={8} required value={pw.newPassword} onChange={e=>setPw(s=>({...s,newPassword:e.target.value}))}/></Field><Field label="Nhập lại mật khẩu mới" required><input type="password" minLength={8} required value={pw.confirm} onChange={e=>setPw(s=>({...s,confirm:e.target.value}))}/></Field><button className="button outline" disabled={busy}><KeyRound size={17}/> Cập nhật mật khẩu</button></form></section></div></>;
}
