import { useEffect, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { Badge, Empty, Loading, Message, SectionTitle, money, num } from '../components/UI';

export default function StockLevels() {
  const [levels, setLevels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState('');
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/warehouses', { params: { limit: 200 } }).then(r=>setWarehouses(r.data.items)).catch(()=>{}); }, []);
  useEffect(() => {
    let active = true; setBusy(true);
    api.get(onlyLow ? '/stock-levels/low-stock' : '/stock-levels', { params: { warehouse: warehouse || undefined } })
      .then(r=>{ if(active) { setLevels(r.data.items); setBusy(false); } })
      .catch(e=>{ if(active) { setError(errMessage(e)); setBusy(false); } });
    return () => { active = false; };
  }, [warehouse, onlyLow]);
  const items = levels.filter(l=>`${l.product?.name} ${l.product?.sku}`.toLowerCase().includes(q.toLowerCase()));
  const total = items.reduce((n,l)=>n+l.quantity*(l.product?.costPrice || 0),0);
  return <><SectionTitle label="DỮ LIỆU TỒN KHO" title="Tồn kho hiện tại" description="Số lượng hàng hóa theo từng sản phẩm và từng kho, cập nhật sau mỗi phiếu."/>
    <Message variant="error" text={error} clear={()=>setError('')}/>
    <section className="panel listing-panel"><div className="toolbar"><div className="search-box"><Search size={18}/><input placeholder="Tìm tên hoặc SKU..." value={q} onChange={e=>setQ(e.target.value)}/></div><select value={warehouse} onChange={e=>setWarehouse(e.target.value)}><option value="">Tất cả kho</option>{warehouses.map(w=><option key={w._id} value={w._id}>{w.name}</option>)}</select><label className="toggle-label"><input type="checkbox" checked={onlyLow} onChange={e=>setOnlyLow(e.target.checked)}/><span>Chỉ sắp hết</span></label></div>
    {busy ? <Loading/> : items.length ? <><div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Kho</th><th>SKU</th><th>Tồn hiện tại</th><th>Ngưỡng</th><th>Giá trị vốn</th><th>Trạng thái</th></tr></thead><tbody>{items.map(l=><tr key={l._id}><td><strong>{l.product?.name || '—'}</strong></td><td>{l.warehouse?.name}</td><td className="sku">{l.product?.sku}</td><td><strong>{num(l.quantity)}</strong> <span className="muted-small">{l.product?.unit}</span></td><td>{num(l.product?.minStockThreshold)}</td><td>{money(l.quantity*(l.product?.costPrice||0))}</td><td>{l.product && l.quantity < l.product.minStockThreshold ? <span className="badge orange"><AlertTriangle size={13}/> Sắp hết</span> : <Badge status="active">Đủ hàng</Badge>}</td></tr>)}</tbody></table></div><div className="table-summary"><span>Tổng giá trị các dòng đang hiển thị</span><strong>{money(total)}</strong></div></> : <Empty title="Không tìm thấy tồn kho" hint="Thử thay đổi bộ lọc hoặc tạo phiếu nhập kho mới."/>}</section>
  </>;
}
