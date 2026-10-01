import { useEffect, useState } from 'react';
import { Download, Search, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import api, { downloadExcel, errMessage } from '../lib/api';
import { Empty, Loading, MANAGER, Message, MOVEMENT, Pager, SectionTitle, date, num } from '../components/UI';

const types = ['', 'stock_in','stock_out','transfer_in','transfer_out','audit_adjustment'];
export default function Reports({ role }) {
  const [items,setItems]=useState([]);
  const [warehouses,setWarehouses]=useState([]);
  const [filters,setFilters]=useState({type:'',warehouse:'',from:'',to:''});
  const [page,setPage]=useState(1);
  const [pages,setPages]=useState(1);
  const [total,setTotal]=useState(0);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{api.get('/warehouses',{params:{limit:200}}).then(r=>setWarehouses(r.data.items)).catch(()=>{});},[]);
  useEffect(()=>{let active=true;setLoading(true);api.get('/reports/movements',{params:{...filters,page,limit:30}}).then(r=>{if(active){setItems(r.data.items);setTotal(r.data.total);setPages(r.data.pages);}}).catch(e=>active&&setError(errMessage(e))).finally(()=>active&&setLoading(false));return()=>{active=false;};},[filters,page]);
  function set(key,value){setPage(1);setFilters(s=>({...s,[key]:value}));}
  async function exportFile(){setBusy(true);try{await downloadExcel('movements',filters);}catch(e){setError(errMessage(e));}finally{setBusy(false);}}
  return <><SectionTitle label="KIỂM SOÁT HÀNG HÓA" title="Lịch sử & báo cáo" description="Nhật ký đầy đủ của mọi giao dịch làm thay đổi số lượng tồn kho." actions={MANAGER.includes(role)&&<button className="button primary" disabled={busy} onClick={exportFile}><Download size={17}/> Xuất Excel</button>}/>
    <Message variant="error" text={error} clear={()=>setError('')}/>
    <section className="panel listing-panel"><div className="toolbar wrap"><select value={filters.type} onChange={e=>set('type',e.target.value)}><option value="">Tất cả loại</option>{types.slice(1).map(x=><option key={x} value={x}>{MOVEMENT[x]}</option>)}</select><select value={filters.warehouse} onChange={e=>set('warehouse',e.target.value)}><option value="">Tất cả kho</option>{warehouses.map(w=><option key={w._id} value={w._id}>{w.name}</option>)}</select><label className="inline-date">Từ <input type="date" value={filters.from} onChange={e=>set('from',e.target.value)}/></label><label className="inline-date">Đến <input type="date" value={filters.to} onChange={e=>set('to',e.target.value)}/></label><span className="result-counter">{num(total)} dòng</span></div>
    {loading ? <Loading/> : items.length ? <div className="table-scroll"><table><thead><tr><th>Ngày</th><th>Sản phẩm</th><th>Kho</th><th>Loại biến động</th><th>Thay đổi</th><th>Trước</th><th>Sau</th><th>Người thực hiện</th></tr></thead><tbody>{items.map(m=><tr key={m._id}><td className="muted-small">{date(m.createdAt)}</td><td><strong>{m.product?.name||'—'}</strong><small>{m.product?.sku}</small></td><td>{m.warehouse?.name||'—'}</td><td><span className="movement-name">{MOVEMENT[m.type] || m.type}</span></td><td><span className={m.quantityChange>=0?'change-plus':'change-minus'}>{m.quantityChange>0?'+':''}{num(m.quantityChange)}</span></td><td>{num(m.quantityBefore)}</td><td><strong>{num(m.quantityAfter)}</strong></td><td>{m.createdBy?.fullName||'—'}</td></tr>)}</tbody></table></div>:<Empty title="Không có biến động trong khoảng thời gian đã chọn"/>}<Pager page={page} pages={pages} setPage={setPage} total={total}/></section>
  </>;
}
