import { useEffect, useState } from 'react';
import { ClipboardCheck, CirclePlus, CheckCheck, RefreshCcw } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { Badge, Empty, Field, Loading, MANAGER, Message, OPERATOR, SectionTitle, date, num } from '../components/UI';

export default function Audits({ role }) {
  const [warehouses,setWarehouses]=useState([]);
  const [warehouse,setWarehouse]=useState('');
  const [audits,setAudits]=useState([]);
  const [selected,setSelected]=useState('');
  const [actual,setActual]=useState({});
  const [note,setNote]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  async function reload() {
    try { const {data}=await api.get('/stock-audits');setAudits(data.items); }
    catch(e){setError(errMessage(e));}
  }
  useEffect(()=>{Promise.all([api.get('/warehouses',{params:{status:'active',limit:200}}),api.get('/stock-audits')]).then(([w,a])=>{setWarehouses(w.data.items);setAudits(a.data.items);}).catch(e=>setError(errMessage(e))).finally(()=>setLoading(false));},[]);
  const active = audits.find(x=>x._id===selected) || audits.find(x=>x.status==='in_progress');
  async function start() {
    setBusy(true);setError('');setSuccess('');
    try { const {data}=await api.post('/stock-audits',{warehouse});await reload();setSelected(data._id);setActual({});setSuccess('Đã tạo phiếu kiểm kê. Nhập số lượng thực tế để xác nhận.'); }
    catch(e){setError(errMessage(e));}finally{setBusy(false);}
  }
  async function confirm() {
    if(!active)return;
    const rows=active.items.map(x=>({product:x.product?._id||x.product,actualQuantity:Number(actual[x.product?._id||x.product] ?? x.expectedQuantity)}));
    if(rows.some(r=>!Number.isSafeInteger(r.actualQuantity)||r.actualQuantity<0)){setError('Số lượng thực tế phải là số nguyên không âm');return;}
    if(rows.some((r,i)=>r.actualQuantity!==active.items[i].expectedQuantity) && !note.trim()){setError('Kiểm kê có chênh lệch cần nhập lý do');return;}
    if(!window.confirm('Xác nhận kiểm kê và điều chỉnh tồn kho theo số lượng thực tế?'))return;
    setBusy(true);setError('');setSuccess('');
    try { await api.patch(`/stock-audits/${active._id}/confirm`,{items:rows,note});setSelected('');setActual({});setNote('');setSuccess('Kiểm kê hoàn tất. Tồn kho và nhật ký đã được cập nhật.');await reload(); }
    catch(e){setError(errMessage(e));}finally{setBusy(false);}
  }
  return <><SectionTitle label="ĐỐI SOÁT KHO HÀNG" title="Kiểm kê kho" description="Chụp số dư hệ thống, nhập số lượng thực tế và xác nhận điều chỉnh chênh lệch." actions={<button className="button outline" onClick={reload}><RefreshCcw size={17}/> Làm mới</button>}/>
    <Message variant="error" text={error} clear={()=>setError('')}/><Message text={success} clear={()=>setSuccess('')}/>
    {loading ? <Loading/> : <div className="audit-grid"><div className="audit-main">
      {OPERATOR.includes(role) && <section className="panel form-panel"><div className="panel-head"><div><span className="eyebrow">TẠO PHIẾU</span><h2>Mở kiểm kê</h2></div><ClipboardCheck size={20} color="#8293ab"/></div><div className="audit-create"><Field label="Chọn kho cần kiểm kê" required><select value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option value="">Chọn kho...</option>{warehouses.map(w=><option key={w._id} value={w._id}>{w.name}</option>)}</select></Field><button className="button primary" disabled={!warehouse||busy} onClick={start}><CirclePlus size={18}/> Tạo phiếu</button></div></section>}
      {active && active.status==='in_progress' && <section className="panel form-panel audit-count-panel"><div className="panel-head"><div><span className="eyebrow">PHIẾU ĐANG KIỂM KÊ</span><h2>{active.code}</h2><p>{active.warehouse?.name}</p></div><Badge status="in_progress"/></div><div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Tồn hệ thống</th><th>Thực tế</th><th>Chênh lệch</th></tr></thead><tbody>{active.items.map(x=>{const id=x.product?._id||x.product;const quantity=Number(actual[id] ?? x.expectedQuantity);const diff=quantity-x.expectedQuantity;return <tr key={id}><td><strong>{x.product?.name||'Sản phẩm'}</strong><small>{x.product?.sku}</small></td><td>{num(x.expectedQuantity)}</td><td><input className="audit-qty" type="number" min="0" step="1" disabled={!MANAGER.includes(role)} value={actual[id]??x.expectedQuantity} onChange={e=>setActual(s=>({...s,[id]:e.target.value}))}/></td><td><span className={diff>0?'change-plus':diff<0?'change-minus':''}>{diff>0?'+':''}{diff}</span></td></tr>})}</tbody></table></div>{MANAGER.includes(role)?<><Field label="Lý do chênh lệch (bắt buộc nếu có điều chỉnh)"><textarea rows="3" value={note} onChange={e=>setNote(e.target.value)} placeholder="VD: Hàng hư hỏng trong quá trình lưu trữ..."/></Field><button className="button primary" disabled={busy} onClick={confirm}><CheckCheck size={18}/> {busy?'Đang xác nhận...':'Xác nhận kiểm kê'}</button></>:<p className="hint">Nhân viên kho có thể mở phiếu. Quản lý kho hoặc Super Admin thực hiện xác nhận và điều chỉnh tồn.</p>}</section>}
    </div><section className="panel history-panel"><div className="panel-head"><div><span className="eyebrow">LỊCH SỬ ĐỐI SOÁT</span><h2>Các phiếu kiểm kê</h2></div></div>{audits.length ? <div className="receipt-list">{audits.map(a=><button key={a._id} className={`audit-history ${active?._id===a._id?'selected':''}`} onClick={()=>{setSelected(a._id);setActual({});setNote('');}}><div><strong>{a.code}</strong><Badge status={a.status}/></div><p>{a.warehouse?.name} · {num(a.items.length)} mặt hàng</p><small>{date(a.createdAt)}</small></button>)}</div>:<Empty title="Chưa có phiếu kiểm kê"/>}</section></div>}
  </>;
}
