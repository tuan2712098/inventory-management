import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X, LoaderCircle, PackageOpen } from 'lucide-react';

export const money = value => `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} ₫`;
export const num = value => new Intl.NumberFormat('vi-VN').format(Number(value || 0));
export const date = value => value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
export const ROLE = { super_admin: 'Quản trị hệ thống', warehouse_manager: 'Quản lý kho', warehouse_staff: 'Nhân viên kho', viewer: 'Người xem' };
export const MOVEMENT = { stock_in: 'Nhập kho', stock_out: 'Xuất kho', transfer_in: 'Nhận chuyển', transfer_out: 'Chuyển đi', audit_adjustment: 'Điều chỉnh' };
export const MANAGER = ['super_admin', 'warehouse_manager'];
export const OPERATOR = [...MANAGER, 'warehouse_staff'];

export function SectionTitle({ label, title, description, actions }) {
  return <div className="section-title"><div><span className="eyebrow">{label}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="section-actions">{actions}</div>}</div>;
}

export function Empty({ title = 'Chưa có dữ liệu', hint = 'Dữ liệu sẽ hiển thị tại đây khi có phát sinh.' }) {
  return <div className="empty"><div className="empty-icon"><PackageOpen size={27}/></div><strong>{title}</strong><p>{hint}</p></div>;
}

export function Loading() { return <div className="loading"><LoaderCircle className="spin" size={24}/><span>Đang tải dữ liệu...</span></div>; }

export function Badge({ status, children }) {
  const color = ['active', 'confirmed', 'completed', 'resolved'].includes(status) ? 'green' : status === 'open' || status === 'in_progress' ? 'orange' : 'slate';
  return <span className={`badge ${color}`}><span className="badge-dot"/>{children || ({ active: 'Hoạt động', inactive: 'Ngừng', confirmed: 'Đã xác nhận', completed: 'Hoàn tất', resolved: 'Đã xử lý', open: 'Cần xử lý', in_progress: 'Đang kiểm kê' }[status] || status)}</span>;
}

export function Modal({ title, subtitle, onClose, children, width = 580 }) {
  useEffect(() => {
    const listener = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19}/></button></div>
      {children}
    </section>
  </div>;
}

export function Message({ variant = 'success', text, clear }) {
  if (!text) return null;
  return <div className={`inline-message ${variant}`} role="alert">{variant === 'error' ? <AlertCircle size={18}/> : <CheckCircle2 size={18}/>}<span>{text}</span>{clear && <button onClick={clear} aria-label="Đóng"><X size={16}/></button>}</div>;
}

export function Field({ label, required, children, hint }) {
  return <label className="field"><span className="field-label">{label}{required && <span className="required"> *</span>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Pager({ page, pages, setPage, total }) {
  if (!pages || pages < 2) return null;
  return <div className="pagination"><span>{num(total)} kết quả</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><span>{page} / {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</button></div></div>;
}
