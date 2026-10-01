import { useEffect, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { Badge, Empty, Loading, Message, SectionTitle, MANAGER, date, num } from '../components/UI';

export default function Alerts({ role }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function reload() {
    setLoading(true);
    try { const {data}=await api.get('/alerts',{params:{status}});setItems(data.items); }
    catch(e){setError(errMessage(e));}finally{setLoading(false);}
  }
  useEffect(()=>{reload();},[status]);
  async function resolve(id) { if(!window.confirm('Đánh dấu cảnh báo này đã được xử lý?'))return;try{await api.patch(`/alerts/${id}/resolve`);setSuccess('Đã xử lý cảnh báo');reload();}catch(e){setError(errMessage(e));} }
  return <><SectionTitle label="CẢNH BÁO TỒN KHO" title="Cần xử lý" description="Tự động phát hiện tồn kho thấp hơn ngưỡng tối thiểu sau các biến động hàng hóa." actions={<button className="button outline" onClick={reload}><RotateCcw size={17}/> Làm mới</button>}/>
  <Message variant="error" text={error} clear={()=>setError('')}/><Message text={success} clear={()=>setSuccess('')}/>
  <div className="filter-pills"><button className={status==='open'?'selected':''} onClick={()=>setStatus('open')}>Đang mở</button><button className={status==='resolved'?'selected':''} onClick={()=>setStatus('resolved')}>Đã xử lý</button></div>
  {loading ? <Loading/> : items.length ? <div className="alert-grid">{items.map(a=><article className="alert-card" key={a._id}><div className="alert-card-head"><div className="alert-icon"><AlertTriangle size={21}/></div><Badge status={a.status}/></div><h3>{a.product?.name || 'Sản phẩm'}</h3><span className="sku">{a.product?.sku}</span><div className="alert-stock"><div><small>Tồn hiện tại</small><strong>{num(a.quantity)}</strong></div><div><small>Ngưỡng cảnh báo</small><strong>{num(a.threshold)}</strong></div></div><p>Kho: <strong>{a.warehouse?.name || '—'}</strong></p><small className="muted-small">Ghi nhận: {date(a.createdAt)}</small>{a.status==='open' && MANAGER.includes(role) && <button className="button outline full" onClick={()=>resolve(a._id)}><Check size={17}/> Đánh dấu đã xử lý</button>}</article>)}</div> : <Empty title={status==='open'?'Không có cảnh báo đang mở':'Chưa có cảnh báo được xử lý'} hint="Cảnh báo sẽ xuất hiện khi số lượng xuống dưới ngưỡng tối thiểu."/>}
  </>;
}
