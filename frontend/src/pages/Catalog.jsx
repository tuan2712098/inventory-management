import { useEffect, useState } from 'react';
import { Boxes, CirclePlus, Pencil, Search, Trash2, UsersRound } from 'lucide-react';
import api, { errMessage } from '../lib/api';
import { Badge, Empty, Field, Loading, Message, Modal, Pager, ROLE, SectionTitle, MANAGER, money, num } from '../components/UI';

const config = {
  products: { title: 'Sản phẩm', label: 'DANH MỤC HÀNG HÓA', description: 'Thông tin sản phẩm, giá vốn và ngưỡng cảnh báo.', titleSingular: 'sản phẩm', fields: [
    ['name', 'Tên sản phẩm', 'text', true], ['sku', 'Mã SKU', 'text', true], ['category', 'Danh mục', 'category', true],
    ['unit', 'Đơn vị tính', 'text', true], ['costPrice', 'Giá vốn (VNĐ)', 'number', true], ['salePrice', 'Giá bán (VNĐ)', 'number', true],
    ['minStockThreshold', 'Ngưỡng tồn tối thiểu', 'number', true], ['description', 'Mô tả', 'textarea'], ['imageUrl', 'URL ảnh sản phẩm', 'text']
  ], cols: [['sku', 'SKU'], ['name', 'Tên sản phẩm'], ['category', 'Danh mục'], ['unit', 'Đơn vị'], ['costPrice', 'Giá vốn'], ['minStockThreshold', 'Ngưỡng tối thiểu']] },
  categories: { title: 'Danh mục', label: 'PHÂN LOẠI SẢN PHẨM', description: 'Danh mục cha / con giúp tổ chức hàng hóa.', titleSingular: 'danh mục', fields: [
    ['name', 'Tên danh mục', 'text', true], ['code', 'Mã danh mục', 'text', true], ['parent', 'Danh mục cha', 'categoryParent']
  ], cols: [['code','Mã'],['name','Danh mục'],['parent','Danh mục cha']] },
  warehouses: { title: 'Kho hàng', label: 'HỆ THỐNG KHO', description: 'Theo dõi các địa điểm lưu trữ và nhân viên.', titleSingular: 'kho', fields: [
    ['name', 'Tên kho', 'text', true], ['code', 'Mã kho', 'text', true], ['address', 'Địa chỉ', 'text']
  ], cols: [['code','Mã kho'],['name','Tên kho'],['address','Địa chỉ']] },
  suppliers: { title: 'Nhà cung cấp', label: 'QUẢN LÝ ĐỐI TÁC', description: 'Thông tin liên hệ và đối tác nhập hàng.', titleSingular: 'nhà cung cấp', fields: [
    ['name', 'Tên nhà cung cấp', 'text', true], ['code', 'Mã đối tác', 'text', true], ['contactName', 'Người liên hệ', 'text'],
    ['phone', 'Số điện thoại', 'text'], ['email', 'Email', 'email'], ['address', 'Địa chỉ', 'text'], ['taxCode', 'Mã số thuế', 'text']
  ], cols: [['code','Mã'],['name','Nhà cung cấp'],['contactName','Liên hệ'],['phone','Điện thoại'],['email','Email']] },
  users: { title: 'Nhân viên', label: 'PHÂN QUYỀN HỆ THỐNG', description: 'Quản lý tài khoản và quyền truy cập kho.', titleSingular: 'nhân viên', fields: [
    ['fullName','Họ và tên','text', true],['email','Email','email',true],['role','Vai trò','role',true],['phone','Số điện thoại','text']
  ], cols: [['fullName','Họ và tên'],['email','Email'],['role','Vai trò'],['phone','Điện thoại']] },
};
const asId = value => value && typeof value === 'object' ? value._id : value || '';
const EMPTY = { name: '', code: '', sku: '', category: '', parent: '', unit: 'cái', costPrice: 0, salePrice: 0, minStockThreshold: 10, description: '', imageUrl: '', address: '', contactName: '', phone: '', email: '', taxCode: '', fullName: '', role: 'warehouse_staff' };

export default function Catalog({ kind, role }) {
  const c = config[kind];
  const canEdit = kind === 'users' ? role === 'super_admin' : MANAGER.includes(role);
  const [items, setItems] = useState([]);
  const [lookups, setLookups] = useState({ categories: [], warehouses: [] });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [tempPassword, setTempPassword] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get(`/${kind}`, { params: { page, limit: 30, status, q } });
      setItems(data.items); setTotal(data.total); setPages(data.pages);
    } catch (e) { setError(errMessage(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, [kind, page, status, q]);
  useEffect(() => {
    if (kind !== 'products' && kind !== 'categories') return;
    api.get('/categories', { params: { limit: 200, status: 'active' } }).then(r => setLookups(s => ({ ...s, categories: r.data.items }))).catch(() => {});
  }, [kind]);

  function openModal(item = null) {
    setTempPassword(''); setError(''); setModal(item || 'new');
    const next = { ...EMPTY };
    if (item) for (const [key] of c.fields) next[key] = ['parent','category'].includes(key) ? asId(item[key]) : item[key] ?? '';
    if (item) next.status = item.status;
    setForm(next);
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('');
    try {
      const body = {};
      for (const [key,, type] of c.fields) {
        body[key] = type === 'number' ? Number(form[key]) : ['category','categoryParent'].includes(type) ? (form[key] || null) : form[key];
      }
      if (modal !== 'new') body.status = form.status;
      if (modal === 'new' && kind === 'users') {
        const { data } = await api.post('/users', body);
        setTempPassword(data.temporaryPassword);
        setSuccess('Đã tạo nhân viên. Hãy lưu mật khẩu tạm bên dưới trước khi đóng.');
      } else {
        if (modal === 'new') await api.post(`/${kind}`, body);
        else await api.patch(`/${kind}/${modal._id}`, body);
        setModal(null);
        setSuccess(modal === 'new' ? 'Đã tạo thành công' : 'Đã cập nhật thành công');
      }
      refresh();
    } catch (e) { setError(errMessage(e)); }
    finally { setBusy(false); }
  }
  async function remove(item) {
    if (!window.confirm(`Ngừng sử dụng ${c.titleSingular} "${item.name || item.fullName}"? Dữ liệu lịch sử được giữ lại.`)) return;
    setError('');
    try {
      if (kind === 'users') await api.patch(`/users/${item._id}/status`, { status: 'inactive' });
      else await api.delete(`/${kind}/${item._id}`);
      setSuccess('Đã ngừng sử dụng mục đã chọn'); refresh();
    } catch (e) { setError(errMessage(e)); }
  }
  function cell(item, key) {
    const val = item[key];
    if (key === 'role') return ROLE[val] || val;
    if (key === 'category' || key === 'parent') return val?.name || '—';
    if (key === 'costPrice') return money(val);
    if (key === 'minStockThreshold') return `${num(val)} ${item.unit || ''}`;
    if (key === 'name' || key === 'fullName') return <strong>{val}</strong>;
    if (key === 'sku' || key === 'code') return <span className="sku">{val}</span>;
    return val || '—';
  }
  return <>
    <SectionTitle label={c.label} title={c.title} description={c.description} actions={canEdit && <button className="button primary" onClick={() => openModal()}><CirclePlus size={18}/> Thêm {c.titleSingular}</button>}/>
    <Message variant="error" text={!modal && error} clear={() => setError('')}/><Message text={!modal && success} clear={() => setSuccess('')}/>
    <section className="panel listing-panel"><div className="toolbar"><div className="search-box"><Search size={18}/><input placeholder={`Tìm kiếm ${c.titleSingular}...`} value={q} onChange={e => { setQ(e.target.value); setPage(1); }}/></div><select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} aria-label="Trạng thái"><option value="active">Đang hoạt động</option><option value="inactive">Đã ngừng</option><option value="">Tất cả</option></select><span className="result-counter">{num(total)} kết quả</span></div>
    {loading ? <Loading/> : items.length ? <div className="table-scroll"><table><thead><tr><th>#</th>{c.cols.map(([,title])=><th key={title}>{title}</th>)}<th>Trạng thái</th>{canEdit && <th className="right">Thao tác</th>}</tr></thead><tbody>{items.map((item,i)=><tr key={item._id}><td className="row-index">{(page-1)*30+i+1}</td>{c.cols.map(([key])=><td key={key}>{cell(item,key)}</td>)}<td><Badge status={item.status}/></td>{canEdit && <td className="row-actions"><button onClick={() => openModal(item)} title="Chỉnh sửa" className="icon-button"><Pencil size={16}/></button>{item.status === 'active' && <button onClick={() => remove(item)} title="Ngừng sử dụng" className="icon-button danger"><Trash2 size={16}/></button>}</td>}</tr>)}</tbody></table></div> : <Empty title={`Chưa có ${c.titleSingular}`} hint={canEdit ? 'Chọn nút thêm để bắt đầu tạo dữ liệu.' : 'Danh sách hiện trống.'}/>}
    <Pager page={page} pages={pages} setPage={setPage} total={total}/></section>
    {modal && <Modal title={modal === 'new' ? `Thêm ${c.titleSingular}` : `Cập nhật ${c.titleSingular}`} subtitle="Điền đầy đủ thông tin bắt buộc trước khi lưu." onClose={() => { setModal(null); setError(''); setSuccess(''); }}>
      {tempPassword ? <div className="temp-password"><h3>Tài khoản đã được tạo</h3><p>Mật khẩu tạm của nhân viên (chỉ hiển thị một lần):</p><code>{tempPassword}</code><p>Hãy sao chép và chuyển riêng cho nhân viên. Không gửi mật khẩu lên GitHub.</p><button className="button primary" onClick={() => { setModal(null); setSuccess('Đã tạo nhân viên thành công'); }}>Đã lưu mật khẩu</button></div> : <form className="modal-form" onSubmit={save}>
      <div className="form-grid">{c.fields.map(([key,label,type,required])=><Field key={key} label={label} required={required}>
        {type === 'textarea' ? <textarea rows={3} value={form[key] || ''} onChange={e=>setForm(s=>({...s,[key]:e.target.value}))}/> : ['category','categoryParent','role'].includes(type) ? <select required={required} value={form[key] ?? ''} onChange={e=>setForm(s=>({...s,[key]:e.target.value}))}><option value="">{type === 'categoryParent' ? 'Không có danh mục cha' : 'Chọn...'}</option>{type === 'role' ? Object.entries(ROLE).map(([value,l])=><option key={value} value={value}>{l}</option>) : lookups.categories.filter(x=>x._id !== modal?._id).map(x=><option key={x._id} value={x._id}>{x.name}</option>)}</select> : <input type={type === 'number' ? 'number' : type === 'email' ? 'email' : 'text'} min={type === 'number' ? '0' : undefined} step={type === 'number' ? key === 'minStockThreshold' ? '1' : 'any' : undefined} required={required} value={form[key] ?? ''} onChange={e=>setForm(s=>({...s,[key]:e.target.value}))}/>}
      </Field>)}{modal !== 'new' && <Field label="Trạng thái"><select value={form.status} onChange={e=>setForm(s=>({...s,status:e.target.value}))}><option value="active">Hoạt động</option><option value="inactive">Ngừng</option></select></Field>}</div>
      {error && <Message variant="error" text={error}/>}
      <div className="modal-actions"><button type="button" className="button outline" onClick={()=>setModal(null)}>Hủy</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : modal === 'new' ? 'Tạo mới' : 'Lưu thay đổi'}</button></div>
      </form>}
    </Modal>}
  </>;
}
