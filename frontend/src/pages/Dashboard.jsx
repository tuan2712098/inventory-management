import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, Boxes, Download, PackageCheck, TrendingUp, Warehouse } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api, { downloadExcel, errMessage } from '../lib/api';
import { Badge, Empty, Loading, Message, MOVEMENT, SectionTitle, date, money, num, MANAGER } from '../components/UI';

export default function Dashboard({ role, navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/reports/summary').then(r => setData(r.data)).catch(e => setError(errMessage(e))); }, []);
  const t = data?.totals || {};
  const stats = [
    { label: 'Sản phẩm đang quản lý', value: num(t.products), icon: Boxes, tint: 'blue', foot: 'Đang hoạt động' },
    { label: 'Tổng giá trị tồn kho', value: money(t.inventoryValue), icon: TrendingUp, tint: 'violet', foot: `${num(t.totalQuantity)} đơn vị hàng` },
    { label: 'Kho hàng', value: num(t.warehouses), icon: Warehouse, tint: 'mint', foot: 'Kho đang hoạt động' },
    { label: 'Cần chú ý', value: num(t.lowStock), icon: AlertTriangle, tint: 'orange', foot: `${num(t.openAlerts)} cảnh báo đang mở` },
  ];
  return <>
    <SectionTitle label="TỔNG QUAN HỆ THỐNG" title="Bảng điều khiển" description="Dữ liệu tồn kho được cập nhật từ MongoDB theo các phiếu đã xác nhận." actions={<button className="button outline" disabled={busy || !MANAGER.includes(role)} onClick={async () => { setBusy(true); try { await downloadExcel('inventory'); } catch(e) { setError(errMessage(e)); } finally { setBusy(false); } }}><Download size={17}/> Xuất báo cáo</button>}/>
    <Message variant="error" text={error} clear={() => setError('')}/>
    {!data ? <Loading/> : <>
      <div className="stat-grid">{stats.map(({ label, value, icon: Icon, tint, foot }) => <article key={label} className="stat-card"><div className="stat-card-top"><span>{label}</span><div className={`stat-icon ${tint}`}><Icon size={20}/></div></div><strong>{value}</strong><div className="stat-foot"><span className={`tiny-dot ${tint}`}/>{foot}</div></article>)}</div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head"><div><span className="eyebrow">PHÂN TÍCH HÀNG HÓA</span><h2>Biến động nhập / xuất</h2><p>6 tháng gần đây · Số lượng sản phẩm</p></div><span className="period-pill">6 tháng</span></div>
          <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthly} margin={{ top: 15, right: 15, left: -10, bottom: 0 }} barGap={5}><CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#edf1f7"/><XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8794aa' }} axisLine={false} tickLine={false} tickFormatter={x=>x.slice(5)+'/ '+x.slice(2,4)}/><YAxis tick={{ fontSize: 11, fill: '#8794aa' }} axisLine={false} tickLine={false}/><Tooltip cursor={{ fill: '#f7f9fd' }} formatter={(v, key)=>[num(v), key === 'stockIn' ? 'Nhập kho' : 'Xuất kho']} contentStyle={{ borderRadius: 12, border: '1px solid #e3eaf5', boxShadow: '0 14px 40px #1a376719' }}/><Legend formatter={v => v === 'stockIn' ? 'Nhập kho' : 'Xuất kho'} wrapperStyle={{ fontSize: 12, paddingTop: 14 }}/><Bar dataKey="stockIn" fill="#4164d8" radius={[5,5,0,0]} maxBarSize={26}/><Bar dataKey="stockOut" fill="#8ec8ef" radius={[5,5,0,0]} maxBarSize={26}/></BarChart></ResponsiveContainer></div>
        </section>
        <section className="panel snapshot-panel"><div className="panel-head"><div><span className="eyebrow">HOẠT ĐỘNG HÔM NAY</span><h2>Nhập xuất trong ngày</h2></div><Activity size={20} color="#98a7bd"/></div><div className="mini-metric"><div className="mini-metric-icon green"><ArrowDownLeft size={23}/></div><div><span>Phiếu nhập kho</span><strong>{num(t.stockInsToday)}</strong></div><span className="mini-metric-tag green">Nhập</span></div><div className="mini-metric"><div className="mini-metric-icon orange"><ArrowUpRight size={23}/></div><div><span>Phiếu xuất kho</span><strong>{num(t.stockOutsToday)}</strong></div><span className="mini-metric-tag orange">Xuất</span></div><div className="snapshot-footer"><PackageCheck size={19}/><span>Hệ thống có {num(t.suppliers)} nhà cung cấp và {num(t.categories)} danh mục.</span></div></section>
      </div>
      <div className="dashboard-grid bottom">
        <section className="panel table-panel"><div className="panel-head"><div><span className="eyebrow">NHẬT KÝ HÀNG HÓA</span><h2>Hoạt động gần đây</h2></div><button className="link-button" onClick={() => navigate('movements')}>Xem tất cả <ArrowRight size={16}/></button></div>{data.recentMovements?.length ? <div className="table-scroll"><table><thead><tr><th>Sản phẩm</th><th>Loại</th><th>Biến động</th><th>Thời gian</th></tr></thead><tbody>{data.recentMovements.map(m => <tr key={m._id}><td><strong>{m.product?.name || 'Sản phẩm'}</strong><small>{m.warehouse?.name}</small></td><td><span className="movement-name">{MOVEMENT[m.type] || m.type}</span></td><td><span className={m.quantityChange >= 0 ? 'change-plus' : 'change-minus'}>{m.quantityChange > 0 ? '+' : ''}{m.quantityChange}</span></td><td className="muted-small">{date(m.createdAt)}</td></tr>)}</tbody></table></div> : <Empty/>}</section>
        <section className="panel warning-panel"><div className="panel-head"><div><span className="eyebrow">GIÁM SÁT TỒN KHO</span><h2>Hàng sắp hết</h2></div><span className="warning-count">{data.lowStock?.length || 0} sản phẩm</span></div>{data.lowStock?.length ? <div className="warning-list">{data.lowStock.slice(0, 5).map(x => <div className="warning-item" key={x._id}><div className="small-product-icon"><Boxes size={17}/></div><div><strong>{x.product?.name}</strong><small>{x.warehouse?.name}</small></div><div className="warning-qty"><b>{x.quantity}</b><small>/ {x.product?.minStockThreshold}</small></div></div>)}</div> : <div className="healthy"><PackageCheck size={31}/><strong>Tồn kho đang ổn định</strong><p>Chưa có sản phẩm thấp hơn ngưỡng cảnh báo.</p></div>}<button className="text-link" onClick={() => navigate('alerts')}>Xem tất cả cảnh báo <ArrowRight size={16}/></button></section>
      </div>
      {data.topOut?.length > 0 && <section className="panel top-products"><div className="panel-head"><div><span className="eyebrow">XU HƯỚNG THÁNG NÀY</span><h2>Sản phẩm xuất nhiều</h2></div></div><div className="top-product-grid">{data.topOut.map((x,i)=><div key={x._id}><span className="rank">#{String(i+1).padStart(2,'0')}</span><strong>{x.product}</strong><small>{x.sku}</small><b>{num(x.quantity)} <span>đơn vị</span></b></div>)}</div></section>}
    </>}
  </>;
}
