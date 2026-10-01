import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CirclePlus, ClipboardList, Plus, Trash2 } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { Badge, Empty, Field, Loading, Message, SectionTitle, date, MANAGER, OPERATOR, money, num } from '../components/UI';

const info = {
  'stock-in': { title: 'Nhập kho', label: 'GIAO DỊCH HÀNG HÓA', description: 'Tạo phiếu nhập hàng và cộng tồn kho ngay sau khi xác nhận.', icon: ArrowDownLeft, button: 'Xác nhận nhập kho' },
  'stock-out': { title: 'Xuất kho', label: 'GIAO DỊCH HÀNG HÓA', description: 'Kiểm tra tồn kho trước khi xuất, không cho phép xuất quá số lượng.', icon: ArrowUpRight, button: 'Xác nhận xuất kho' },
  'stock-transfers': { title: 'Chuyển kho', label: 'ĐIỀU PHỐI HÀNG HÓA', description: 'Điều chuyển hàng giữa hai kho và ghi nhật ký ở cả kho nguồn, kho đích.', icon: ArrowLeftRight, button: 'Xác nhận chuyển kho' },
};
const emptyRow = () => ({ product: '', quantity: 1, costPrice: 0 });

export default function StockOperations({ kind, role }) {
  const c = info[kind];
  const permitted = kind === 'stock-transfers' ? MANAGER.includes(role) : OPERATOR.includes(role);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);
  const [levels, setLevels] = useState([]);
  const [form, setForm] = useState({ warehouse: '', fromWarehouse: '', toWarehouse: '', supplier: '', invoiceNo: '', reason: '', note: '', items: [emptyRow()] });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const [receipt, level] = await Promise.all([api.get(`/${kind}`, { params: { limit: 25 } }), api.get('/stock-levels')]);
      setHistory(receipt.data.items); setLevels(level.data.items);
    } catch(e) { setError(errMessage(e)); }
  }
  useEffect(() => {
    let active = true;
    Promise.all([api.get('/products', { params: { status: 'active', limit: 200 } }), api.get('/warehouses', { params: { status: 'active', limit: 200 } }), api.get('/suppliers', { params: { status: 'active', limit: 200 } }), api.get(`/${kind}`, { params: { limit: 25 } }), api.get('/stock-levels')])
      .then(([p,w,s,h,l]) => { if (active) { setProducts(p.data.items); setWarehouses(w.data.items); setSuppliers(s.data.items); setHistory(h.data.items); setLevels(l.data.items); setLoading(false); } })
      .catch(e => { if (active) { setError(errMessage(e)); setLoading(false); } });
    return () => { active = false; };
  }, [kind]);
  function setValue(key, value) { setForm(s => ({...s,[key]:value})); }
  function setItem(i,key,value) { setForm(s=>({...s,items:s.items.map((row,j)=>i===j ? {...row,[key]:value} : row)})); }
  const source = kind === 'stock-transfers' ? form.fromWarehouse : form.warehouse;
  function available(productId) { return levels.find(l => l.product?._id === productId && l.warehouse?._id === source)?.quantity || 0; }
  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      if (kind === 'stock-transfers' && form.fromWarehouse === form.toWarehouse) throw new Error('Kho nguồn và kho đích phải khác nhau');
      const body = { note: form.note, items: form.items.map(row => ({ product: row.product, quantity: Number(row.quantity), ...(kind === 'stock-in' ? { costPrice: Number(row.costPrice) } : {}) })) };
      if (kind === 'stock-in') Object.assign(body, { warehouse: form.warehouse, supplier: form.supplier, invoiceNo: form.invoiceNo });
      if (kind === 'stock-out') Object.assign(body, { warehouse: form.warehouse, reason: form.reason });
      if (kind === 'stock-transfers') Object.assign(body, { fromWarehouse: form.fromWarehouse, toWarehouse: form.toWarehouse });
      const { data } = await api.post(`/${kind}`, body);
      setSuccess(`Đã xác nhận ${c.title.toLowerCase()} thành công · Mã phiếu ${data.code}`);
      setForm(s=>({...s,invoiceNo:'',reason:'',note:'',items:[emptyRow()]}));
      await refresh();
    } catch(e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  }
  function warehouseName(value) { return typeof value === 'object' ? value?.name : warehouses.find(w=>w._id===value)?.name || '—'; }
  return <>
    <SectionTitle label={c.label} title={c.title} description={c.description}/>
    {loading ? <Loading/> : <div className="operation-grid">
      {permitted && <section className="panel op-form-panel"><div className="panel-head"><div><span className="eyebrow">TẠO PHIẾU MỚI</span><h2>Thông tin {c.title.toLowerCase()}</h2></div><div className="op-icon"><c.icon size={20}/></div></div>
        <form className="form-vertical" onSubmit={submit}>
          {kind !== 'stock-transfers' ? <Field label="Kho hàng" required><select value={form.warehouse} required onChange={e=>setValue('warehouse',e.target.value)}><option value="">Chọn kho</option>{warehouses.map(w=><option key={w._id} value={w._id}>{w.name} ({w.code})</option>)}</select></Field> : <div className="form-grid"><Field label="Kho nguồn" required><select required value={form.fromWarehouse} onChange={e=>setValue('fromWarehouse',e.target.value)}><option value="">Chọn kho nguồn</option>{warehouses.map(w=><option key={w._id} value={w._id}>{w.name}</option>)}</select></Field><Field label="Kho đích" required><select required value={form.toWarehouse} onChange={e=>setValue('toWarehouse',e.target.value)}><option value="">Chọn kho đích</option>{warehouses.map(w=><option key={w._id} value={w._id}>{w.name}</option>)}</select></Field></div>}
          {kind === 'stock-in' && <div className="form-grid"><Field label="Nhà cung cấp" required><select required value={form.supplier} onChange={e=>setValue('supplier',e.target.value)}><option value="">Chọn nhà cung cấp</option>{suppliers.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}</select></Field><Field label="Số hóa đơn"><input placeholder="VD: HD-2026-001" value={form.invoiceNo} onChange={e=>setValue('invoiceNo',e.target.value)}/></Field></div>}
          {kind === 'stock-out' && <Field label="Lý do xuất kho" required><select required value={form.reason} onChange={e=>setValue('reason',e.target.value)}><option value="">Chọn lý do</option><option value="Bán hàng">Bán hàng</option><option value="Xuất nội bộ">Xuất nội bộ</option><option value="Hàng lỗi, hư hỏng">Hàng lỗi, hư hỏng</option><option value="Xuất theo yêu cầu">Xuất theo yêu cầu</option></select></Field>}
          <div className="line-head"><strong>Danh sách sản phẩm</strong><button type="button" className="small-add" onClick={()=>setValue('items',[...form.items,emptyRow()])}><Plus size={15}/> Thêm dòng</button></div>
          {form.items.map((row,i)=><div className="line-item" key={i}><div className="line-item-header"><strong>Dòng {i+1}</strong>{form.items.length>1 && <button type="button" className="icon-button danger" onClick={()=>setValue('items',form.items.filter((_,j)=>j!==i))}><Trash2 size={15}/></button>}</div><div className="form-grid"><Field label="Sản phẩm" required><select required value={row.product} onChange={e=>{ setItem(i,'product',e.target.value); const p=products.find(x=>x._id===e.target.value); if (p && kind==='stock-in') setItem(i,'costPrice',p.costPrice); }}><option value="">Chọn sản phẩm</option>{products.map(p=><option key={p._id} value={p._id}>{p.sku} · {p.name}</option>)}</select></Field><Field label="Số lượng" required><input type="number" min="1" step="1" value={row.quantity} onChange={e=>setItem(i,'quantity',e.target.value)} required/></Field></div>{kind === 'stock-in' ? <Field label="Giá vốn / đơn vị (VNĐ)" required><input type="number" min="0" step="any" value={row.costPrice} onChange={e=>setItem(i,'costPrice',e.target.value)} required/></Field> : <div className="stock-availability">Tồn khả dụng ở kho nguồn: <strong>{num(available(row.product))}</strong></div>}</div>)}
          <Field label="Ghi chú"><textarea rows={3} placeholder="Ghi chú thêm về phiếu..." maxLength={500} value={form.note} onChange={e=>setValue('note',e.target.value)}/></Field>
          <Message variant="error" text={error}/><Message text={success}/>
          <button className="button primary full" type="submit" disabled={busy || !products.length || !warehouses.length}>{busy ? 'Đang xử lý...' : <><CirclePlus size={18}/>{c.button}</>}</button>
        </form>
      </section>}
      <section className="panel history-panel"><div className="panel-head"><div><span className="eyebrow">NHẬT KÝ PHIẾU</span><h2>Lịch sử {c.title.toLowerCase()}</h2></div><span className="period-pill">{history.length} phiếu</span></div>
        {history.length ? <div className="receipt-list">{history.map(h=><div className="receipt-card" key={h._id}><div className="receipt-header"><strong>{h.code}</strong><Badge status={h.status}/></div><div className="receipt-details"><div><span>Thời gian</span><strong>{date(h.createdAt)}</strong></div><div><span>{kind === 'stock-transfers' ? 'Điều chuyển' : 'Kho hàng'}</span><strong>{kind === 'stock-transfers' ? `${warehouseName(h.fromWarehouse)} → ${warehouseName(h.toWarehouse)}` : warehouseName(h.warehouse)}</strong></div><div><span>Sản phẩm</span><strong>{h.items?.length || 0} mặt hàng</strong></div><div><span>Tổng số lượng</span><strong>{num(h.items?.reduce((n,x)=>n+x.quantity,0))}</strong></div></div>{h.note && <p className="receipt-note">{h.note}</p>}</div>)}</div> : <Empty title="Chưa có phiếu nào"/>}</section>
    </div>}
  </>;
}
