import { useState, useEffect, type FormEvent } from 'react';
import { BarChart3, CalendarDays, CheckCheck, CircleSlash, Clock3, Inbox, ListFilter, Plus, RefreshCw, Save, Search, Ticket, Users, UtensilsCrossed, UserRound, LockKeyhole, ShieldCheck, Settings, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Choice, EmptyData, Field, ImageUpload, Notice, PageHeading, PasswordField } from './form-parts';
import { bookingHours, bookingMinutes, partySizes, passwordsMatch } from './booking-rules';
import { easyEatApi, type QueueItem, type MenuItem, type Member, type RestaurantSettings } from '@/lib/easy-eat-api';
import { isThaiPhone, normalizeThaiPhone } from '@/lib/phone';

function Metrics({ items }: { items: {label: string; icon: LucideIcon; tone: string; value?: number | string}[] }) {
  return <div className="metrics-grid">{items.map(({label,icon:Icon,tone,value}) => <div className="metric-item" key={label}><span className={`metric-icon ${tone}`}><Icon size={20}/></span><span className="text-muted-foreground text-xs">{label}</span><strong>{value !== undefined ? value : '—'}</strong></div>)}</div>;
}

function SearchField({ placeholder, value, onChange }: {placeholder: string; value: string; onChange: (value: string) => void}) {
  return <div className="relative w-full sm:max-w-80"><Search size={17} className="absolute left-3 top-3 text-muted-foreground"/><Input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} className="pl-10 h-11 bg-card"/></div>;
}

export function AdminQueueScreen() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); 
  const [status, setStatus] = useState('all'); 
  const [sortBy, setSortBy] = useState('default');
  const [open, setOpen] = useState(false); 
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<QueueItem | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newHour, setNewHour] = useState('11');
  const [newMinute, setNewMinute] = useState('00');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState(''); 
  const [hour, setHour] = useState('11'); 
  const [minute, setMinute] = useState('00'); 
  const [people, setPeople] = useState('2');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadQueues = async () => {
    setLoading(true);
    const data = await easyEatApi.getQueues();
    if (data) setQueues(data);
    setLoading(false);
  };

  useEffect(() => { loadQueues(); }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (newStatus === 'S5') {
      const target = queues.find(q => q.id === id);
      if (target) {
        setSelectedQueue(target);
        const resolvedDate = (target.date ? target.date : new Date().toISOString().split('T')[0]) as string;
        setNewDate(resolvedDate);
        setRescheduleOpen(true);
      }
      return;
    }
    const res = await easyEatApi.updateQueueStatus(id, newStatus);
    if (res && res.success) {
      loadQueues();
    } else {
      alert('ไม่สามารถอัปเดตสถานะคิวได้');
    }
  };

  const submitReschedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedQueue) return;
    const fullDateTime = `${newDate} ${newHour}:${newMinute}:00`;
    const res = await easyEatApi.updateQueueTime(selectedQueue.id, 'S5', fullDateTime);
    if (res && res.success) {
      setRescheduleOpen(false);
      loadQueues();
    } else {
      alert('ไม่สามารถเลื่อนเวลาคิวได้');
    }
  };

  const filteredQueues = queues.filter(q => {
    const matchSearch = (q.queue_number || '').toLowerCase().includes(search.toLowerCase()) || 
                        (q.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'all' || q.status === status;
    return matchSearch && matchStatus;
  }).sort((a: any, b: any) => {
    if (sortBy === 'time_asc') {
      return (a.service_datetime || a.date || '').localeCompare(b.service_datetime || b.date || '');
    } else if (sortBy === 'time_desc') {
      return (b.service_datetime || b.date || '').localeCompare(a.service_datetime || a.date || '');
    } else if (sortBy === 'people') {
      return Number(b.people) - Number(a.people);
    }
    return 0;
  });

  const totalCount = queues.length;
  const waitingCount = queues.filter(q => q.status === 'S1').length;
  const callingCount = queues.filter(q => q.status === 'S2').length;
  const completedCount = queues.filter(q => q.status === 'S3').length;

  async function add(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const serviceDatetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setSaving(true);
    setMessage('');
    const res = await easyEatApi.addWalkInQueue({
      firstname: firstName.trim(),
      lastname: lastName.trim(),
      people: Number(people),
      service_datetime: serviceDatetime,
    });
    setSaving(false);
    if (res && res.success) {
      setOpen(false);
      loadQueues();
    } else {
      setMessage(res?.message ?? 'ไม่สามารถเพิ่มคิวหน้างานได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  return (
    <>
      <PageHeading title="จัดการคิว" eyebrow="RESTAURANT OPERATIONS" description="รายการจองและคิวเข้ารับบริการของ Easy Eat" icon={Ticket}>
        <Button onClick={() => { setMessage(''); setFirstName(''); setLastName(''); setPeople('2'); setOpen(true); }}><Plus/>เพิ่มคิวหน้างาน</Button>
      </PageHeading>
      <Metrics items={[
        {label:'คิวทั้งหมด', icon:Ticket, tone:'tone-info', value: totalCount},
        {label:'รอคิว', icon:Clock3, tone:'tone-warm', value: waitingCount},
        {label:'กำลังเรียก', icon:Users, tone:'tone-info', value: callingCount},
        {label:'ใช้บริการแล้ว', icon:CheckCheck, tone:'tone-primary', value: completedCount}
      ]}/>
      <div className="management-toolbar flex flex-wrap gap-3 items-center justify-between">
        <SearchField placeholder="ค้นหาหมายเลขคิว หรือชื่อผู้จอง" value={search} onChange={setSearch}/>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <ListFilter size={18} className="text-muted-foreground"/>
            <div className="w-40">
              <Choice label="สถานะคิว" id="queue-filter" value={status} onChange={setStatus} options={[
                {value:'all',label:'ทุกสถานะ'},{value:'S1',label:'รอคิว'},{value:'S2',label:'กำลังเรียก'},
                {value:'S3',label:'ใช้บริการแล้ว'},{value:'S4',label:'ยกเลิก'},{value:'S5',label:'เลื่อนเวลา'}
              ]}/>
            </div>
          </div>
          <div className="w-40">
            <Choice label="จัดเรียงตาม" id="queue-sort" value={sortBy} onChange={setSortBy} options={[
              {value:'default',label:'ค่าเริ่มต้น'},
              {value:'time_asc',label:'เวลา (เก่า -> ใหม่)'},
              {value:'time_desc',label:'เวลา (ใหม่ -> เก่า)'},
              {value:'people',label:'จำนวนคน (มาก -> น้อย)'}
            ]}/>
          </div>
          <Button variant="outline" size="icon" title="รีเฟรชรายการ" aria-label="รีเฟรชรายการ" onClick={loadQueues}><RefreshCw/></Button>
        </div>
      </div>
      <div className="table-scroll rounded-md border bg-card shadow-sm mt-4">
        <table className="management-table w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="p-3">รหัสคิว</th>
              <th className="p-3">หมายเลขคิว</th>
              <th className="p-3">ชื่อผู้จอง</th>
              <th className="p-3">จำนวนคน</th>
              <th className="p-3">เวลาเข้ารับบริการ</th>
              <th className="p-3">สถานะคิว</th>
              <th className="p-3 text-right">จัดการคิว</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredQueues.length > 0 ? (
              filteredQueues.map(q => {
                const isFinishedOrCancelled = ['S3', 'S4'].includes(q.status);
                return (
                  <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{q.id}</td>
                    <td className="p-3"><strong className="text-primary">{q.queue_number}</strong></td>
                    <td className="p-3">{q.customer_name || 'ลูกค้าทั่วไป'}</td>
                    <td className="p-3">{q.people} ท่าน</td>
                    <td className="p-3">{q.date} {q.time}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                        ${q.status === 'S1' ? 'bg-amber-100 text-amber-800' : ''}
                        ${q.status === 'S2' ? 'bg-blue-100 text-blue-800' : ''}
                        ${q.status === 'S3' ? 'bg-emerald-100 text-emerald-800' : ''}
                        ${q.status === 'S4' ? 'bg-rose-100 text-rose-800' : ''}
                        ${q.status === 'S5' ? 'bg-purple-100 text-purple-800' : ''}
                      `}>
                        {q.status === 'S1' && 'รอคิว'}
                        {q.status === 'S2' && 'กำลังเรียก'}
                        {q.status === 'S3' && 'ใช้บริการแล้ว'}
                        {q.status === 'S4' && 'ยกเลิก'}
                        {q.status === 'S5' && 'เลื่อนเวลา'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50" disabled={isFinishedOrCancelled} onClick={() => handleStatusChange(q.id, 'S2')} title="กำลังเรียก">เรียก</Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-purple-600 hover:bg-purple-50" disabled={isFinishedOrCancelled} onClick={() => handleStatusChange(q.id, 'S5')} title="เลื่อนเวลา">เลื่อน</Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-emerald-600 hover:bg-emerald-50" disabled={isFinishedOrCancelled} onClick={() => handleStatusChange(q.id, 'S3')} title="สำเร็จ">สำเร็จ</Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs text-rose-600 hover:bg-rose-50" disabled={isFinishedOrCancelled} onClick={() => handleStatusChange(q.id, 'S4')} title="ยกเลิก">ยกเลิก</Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={7} className="p-6 text-center"><EmptyData icon={Inbox} title={loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบรายการคิว'}/></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>เพิ่มคิวหน้างาน</DialogTitle><DialogDescription>รายละเอียดผู้เข้ารับบริการที่ Easy Eat</DialogDescription></DialogHeader>
          <form onSubmit={add} className="space-y-5">
            <div className="grid grid-cols-2 gap-4"><Field label="ชื่อจริง" id="walkin-first" value={firstName} onChange={e => setFirstName(e.target.value)} required/><Field label="นามสกุล" id="walkin-last" value={lastName} onChange={e => setLastName(e.target.value)}/></div>
            <p className="text-sm text-muted-foreground">คิวหน้างานจะบันทึกด้วยเวลาปัจจุบันโดยอัตโนมัติ</p>
            <Choice label="จำนวนคน" id="walkin-people" value={people} onChange={setPeople} options={partySizes.map(value => ({value:String(value),label:`${value} ท่าน`}))}/>
            {message && <Notice>{message}</Notice>}
            <div className="flex justify-end gap-3"><Button variant="outline" type="button" onClick={() => setOpen(false)}>ยกเลิก</Button><Button type="submit" disabled={saving}><Plus/>{saving ? 'กำลังบันทึก...' : 'เพิ่มคิว'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>เลื่อนเวลาคิว {selectedQueue?.queue_number}</DialogTitle><DialogDescription>เลือกวันและเวลาใหม่สำหรับผู้เข้ารับบริการ</DialogDescription></DialogHeader>
          <form onSubmit={submitReschedule} className="space-y-5">
            <Field label="วันที่เข้ารับบริการใหม่" id="reschedule-date" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required/>
            <div className="grid grid-cols-2 gap-4">
              <Choice label="ชั่วโมง" id="reschedule-hour" value={newHour} onChange={setNewHour} options={bookingHours.map(value => ({value,label:`${value} นาฬิกา`}))}/>
              <Choice label="นาที" id="reschedule-minute" value={newMinute} onChange={setNewMinute} options={bookingMinutes.map(value => ({value,label:`${value} นาที`}))}/>
            </div>
            <div className="flex justify-end gap-3"><Button variant="outline" type="button" onClick={() => setRescheduleOpen(false)}>ยกเลิก</Button><Button type="submit"><Save/>ยืนยันเลื่อนเวลา</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminMenuScreen() {
  const [menus, setMenus] = useState<(MenuItem & { category?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); 
  const [open, setOpen] = useState(false); 
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [menuImage, setMenuImage] = useState('');
  const [status, setStatus] = useState('available'); 
  const [message, setMessage] = useState('');

  const loadMenus = async () => {
    setLoading(true);
    const data = await easyEatApi.menu();
    if (data) setMenus(data as any);
    setLoading(false);
  };

  useEffect(() => { loadMenus(); }, []);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
    return `http://localhost/api/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedMenu(null);
    setName('');
    setCategory('');
    setPrice('');
    setMenuImage('');
    setStatus('available');
    setMessage('');
    setOpen(true);
  };

  const handleEditClick = (m: any) => {
    setIsEditing(true);
    setSelectedMenu(m);
    setName(m.name || '');
    setCategory(m.category || '');
    setPrice(String(m.price || ''));
    setMenuImage(m.image || m.profile_pic || '');
    setStatus(m.is_active ? 'available' : 'sold_out');
    setMessage('');
    setOpen(true);
  };

  const handleSaveMenu = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !price) {
      setMessage('กรุณากรอกชื่อเมนูและราคาให้ครบถ้วน');
      return;
    }

    try {
      const payload: any = {
        name,
        category: category || 'ทั่วไป',
        price: Number(price),
        image: menuImage,
        is_active: status === 'available'
      };

      if (isEditing && selectedMenu) {
        payload.id = selectedMenu.id;
      }

      const res: any = await easyEatApi.saveMenu(payload);
      if (res && res.success) {
        setMessage('บันทึกข้อมูลเมนูสำเร็จ');
        setTimeout(() => {
          setOpen(false);
          loadMenus();
        }, 1000);
      } else {
        setMessage(res?.message || 'ไม่สามารถบันทึกข้อมูลเมนูได้');
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const handleDeleteMenu = async () => {
    if (!selectedMenu || !selectedMenu.id) return;
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบเมนู "${selectedMenu.name}" นี้?`)) return;

    try {
      const res: any = await easyEatApi.deleteMenu(selectedMenu.id);
      if (res && res.success) {
        setMessage('ลบเมนูอาหารสำเร็จ');
        setTimeout(() => {
          setOpen(false);
          loadMenus();
        }, 1000);
      } else {
        setMessage(res?.message || 'ไม่สามารถลบเมนูได้');
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const filteredMenus = menus.filter(m => (m.name || '').toLowerCase().includes(search.toLowerCase()) || ((m as any).category || '').toLowerCase().includes(search.toLowerCase()));
  const totalMenus = menus.length;
  const availableCount = menus.filter(m => m.is_active).length;
  const unavailableCount = totalMenus - availableCount;

  return (
    <>
      <PageHeading title="จัดการเมนู" eyebrow="THE EASY EAT KITCHEN" description="อาหาร เครื่องดื่ม และรายการโปรดของลูกค้า" icon={UtensilsCrossed}>
        <Button onClick={handleOpenAdd}><Plus/>เพิ่มเมนูใหม่</Button>
      </PageHeading>

      <Metrics items={[
        {label:'เมนูทั้งหมด', icon:UtensilsCrossed, tone:'tone-info', value: totalMenus},
        {label:'มีจำหน่าย', icon:CheckCheck, tone:'tone-primary', value: availableCount},
        {label:'หมด', icon:CircleSlash, tone:'tone-warm', value: unavailableCount}
      ]}/>

      <div className="management-toolbar">
        <SearchField placeholder="ค้นหาชื่อเมนู หรือประเภทอาหาร" value={search} onChange={setSearch}/>
        <span className="text-xs text-muted-foreground font-medium">รายการอาหารทั้งหมด ({totalMenus})</span>
      </div>

      <div className="table-scroll rounded-md border bg-card shadow-sm mt-4">
        <table className="management-table w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="p-3">รูปภาพ</th>
              <th className="p-3">รหัสเมนู</th>
              <th className="p-3">ชื่อเมนู</th>
              <th className="p-3">ประเภท</th>
              <th className="p-3">ราคา (บาท)</th>
              <th className="p-3">สถานะ</th>
              <th className="p-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredMenus.length > 0 ? (
              filteredMenus.map(m => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    {m.image ? (
                      <img src={getImageUrl(m.image)} alt={m.name} className="w-10 h-10 object-cover rounded border shadow-sm"/>
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-muted-foreground"><UtensilsCrossed size={18}/></div>
                    )}
                  </td>
                  <td className="p-3 font-medium">{m.id}</td>
                  <td className="p-3"><strong>{m.name}</strong></td>
                  <td className="p-3 text-muted-foreground">{(m as any).category || 'ทั่วไป'}</td>
                  <td className="p-3 text-muted-foreground">{m.price.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {m.is_active ? 'มีจำหน่าย' : 'หมด'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => handleEditClick(m)}>จัดการ</Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={7} className="p-6 text-center"><EmptyData icon={Inbox} title={loading ? 'กำลังโหลดข้อมูล...' : 'ยังไม่มีข้อมูลเมนู'}/></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? `จัดการเมนู (${selectedMenu?.id})` : 'เพิ่มเมนูใหม่'}</DialogTitle>
            <DialogDescription>รายละเอียดอาหาร เครื่องดื่ม และรูปภาพประกอบ</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSaveMenu}>
            <ImageUpload 
              value={getImageUrl(menuImage)} 
              onChange={(url: string) => {
                if (!url) {
                  setMenuImage('');
                } else if (url.startsWith('http://localhost/api/')) {
                  setMenuImage(url.replace('http://localhost/api/', ''));
                } else {
                  setMenuImage(url);
                }
              }} 
            />
            <Field label="ชื่อเมนู" id="menu-name" value={name} onChange={e => setName(e.target.value)} placeholder="ชื่ออาหารหรือเครื่องดื่ม" required/>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ประเภท" id="menu-category" value={category} onChange={e => setCategory(e.target.value)} placeholder="เช่น อาหารจานเดียว, เครื่องดื่ม" required/>
              <Field label="ราคา (บาท)" id="menu-price" type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required/>
            </div>
            <Choice label="สถานะเมนู" id="menu-status" value={status} onChange={setStatus} options={[{value:'available',label:'มีจำหน่าย'},{value:'sold_out',label:'หมด'}]}/>
            {message && <Notice>{message}</Notice>}
            <div className="flex justify-between items-center pt-2">
              {isEditing ? (
                <Button variant="destructive" type="button" onClick={handleDeleteMenu}>ลบเมนูนี้</Button>
              ) : <div/>}
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>ยกเลิก</Button>
                <Button type="submit"><Save/>{isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'บันทึกเมนู'}</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AdminMembersScreen() {
  const [members, setMembers] = useState<Member[] & { image?: string; profile_pic?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''); 
  const [status, setStatus] = useState('all'); 
  const [open, setOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [memberStatus, setMemberStatus] = useState('1');
  const [message, setMessage] = useState('');
  
  const loadMembers = async () => {
    setLoading(true);
    const data = await easyEatApi.members();
    if (data) setMembers(data);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const handleEditClick = (mem: any) => {
    setSelectedMember(mem);
    setFirstname(mem.firstname || '');
    setLastname(mem.lastname || '');
    setEmail(mem.email || '');
    setPhone(mem.phone || '');
    setPassword('');
    setProfilePic(mem.profile_pic || mem.image || '');
    setMemberStatus(mem.is_active ? '1' : '0');
    setMessage('');
    setOpen(true);
  };

  const handleSaveMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (!isThaiPhone(phone)) {
      setMessage('กรุณากรอกเบอร์โทรศัพท์ไทย 10 หลัก โดยขึ้นต้นด้วย 0');
      return;
    }

    try {
      const res: any = await easyEatApi.updateMember({
        id: selectedMember.id,
        firstname,
        lastname,
        email,
        phone,
        password: password ? password : '',
        profile_pic: profilePic,
        is_active: memberStatus === '1'
      });

      if (res && res.success) {
        setMessage('บันทึกข้อมูลสมาชิกสำเร็จ');
        setTimeout(() => {
          setOpen(false);
          loadMembers();
        }, 1000);
      } else {
        setMessage(res?.message || 'ไม่สามารถอัปเดตข้อมูลสมาชิกได้');
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  const filteredMembers = members.filter(mem => {
    const matchSearch = `${mem.firstname} ${mem.lastname} ${mem.email} ${mem.phone}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === 'all' || (status === '1' ? mem.is_active : !mem.is_active);
    return matchSearch && matchStatus;
  });

  const totalMembers = members.length;
  const activeMembers = members.filter(mem => mem.is_active).length;
  const suspendedMembers = totalMembers - activeMembers;

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
    return `http://localhost/api/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  return (
    <>
      <PageHeading title="จัดการสมาชิก" eyebrow="THE EASY EAT COMMUNITY" description="ข้อมูลสมาชิกและสถานะการใช้งานบัญชี" icon={Users}/>
      <Metrics items={[
        {label:'สมาชิกทั้งหมด', icon:Users, tone:'tone-info', value: totalMembers},
        {label:'ใช้งานปกติ', icon:CheckCheck, tone:'tone-primary', value: activeMembers},
        {label:'ถูกระงับ', icon:CircleSlash, tone:'tone-warm', value: suspendedMembers}
      ]}/>
      <div className="management-toolbar">
        <SearchField placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทรศัพท์" value={search} onChange={setSearch}/>
        <div className="flex items-center gap-3">
          <ListFilter size={18} className="text-muted-foreground"/>
          <div className="w-44"><Choice label="สถานะบัญชี" id="member-filter" value={status} onChange={setStatus} options={[{value:'all',label:'ทุกสถานะ'},{value:'1',label:'ใช้งานปกติ'},{value:'0',label:'ถูกระงับ'}]}/></div>
          <Button variant="outline" size="icon" title="รีเฟรชสมาชิก" aria-label="รีเฟรชสมาชิก" onClick={loadMembers}><RefreshCw/></Button>
        </div>
      </div>
      <div className="table-scroll rounded-md border bg-card shadow-sm mt-4">
        <table className="management-table w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <th className="p-3">รหัสสมาชิก</th>
              <th className="p-3">รูปโปรไฟล์</th>
              <th className="p-3">ชื่อ–นามสกุล</th>
              <th className="p-3">อีเมล</th>
              <th className="p-3">เบอร์โทรศัพท์</th>
              <th className="p-3">สถานะบัญชี</th>
              <th className="p-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(mem => {
                const pic = mem.profile_pic || mem.image;
                return (
                  <tr key={mem.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{mem.id}</td>
                    <td className="p-3">
                      {pic ? (
                        <img src={getImageUrl(pic)} alt={mem.firstname} className="w-10 h-10 object-cover rounded-full border shadow-sm"/>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><UserRound size={18}/></div>
                      )}
                    </td>
                    <td className="p-3"><strong>{mem.firstname} {mem.lastname}</strong></td>
                    <td className="p-3 text-muted-foreground">{mem.email}</td>
                    <td className="p-3 text-muted-foreground">{mem.phone}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mem.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {mem.is_active ? 'ใช้งานปกติ' : 'ถูกระงับ'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => handleEditClick(mem)}>จัดการ</Button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan={7} className="p-6 text-center"><EmptyData icon={Inbox} title={loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลสมาชิก'}/></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>จัดการข้อมูลสมาชิก ({selectedMember?.id})</DialogTitle>
            <DialogDescription>แก้ไขชื่อ-นามสกุล, รูปโปรไฟล์, อีเมล, รหัสผ่าน, เบอร์โทรศัพท์ และสถานะบัญชี</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMember} className="space-y-4">
            <ImageUpload 
              portrait 
              value={profilePic} 
              onChange={(url: string) => setProfilePic(url)} 
            />
            <div className="grid grid-cols-2 gap-4">
              <Field label="ชื่อจริง" id="edit-firstname" value={firstname} onChange={e => setFirstname(e.target.value)} required/>
              <Field label="นามสกุล" id="edit-lastname" value={lastname} onChange={e => setLastname(e.target.value)} required/>
            </div>
            <Field label="อีเมล" id="edit-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required/>
            <Field label="เบอร์โทรศัพท์ไทย (ขึ้นต้นด้วย 0)" id="edit-phone" type="tel" inputMode="tel" placeholder="0812345678" value={phone} maxLength={12} onChange={e => setPhone(normalizeThaiPhone(e.target.value))} required/>
            <PasswordField label="รหัสผ่านใหม่ (เว้นว่างไว้หากไม่ต้องการเปลี่ยน)" id="edit-password" value={password} onChange={e => setPassword(e.target.value)}/>
            <Choice label="สถานะบัญชี" id="edit-status" value={memberStatus} onChange={setMemberStatus} options={[{value:'1',label:'ใช้งานปกติ'},{value:'0',label:'ถูกระงับ'}]}/>
            {message && <Notice>{message}</Notice>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>ยกเลิก</Button>
              <Button type="submit"><Save/>บันทึกการเปลี่ยนแปลง</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ReportsScreen() {
  const [reportData, setReportData] = useState<{ statusReport: { status: string; count: number }[]; dailyReport: { date: string; count: number }[]; peakHours?: { hour: string; count: number }[] }>({ statusReport: [], dailyReport: [], peakHours: [] });
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [auditItems, setAuditItems] = useState<{ audit_id: number; created_at: string; action: string; queue_number: string; admin_name: string }[]>([]);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      const data = await easyEatApi.reports(from, to);
      if (data) setReportData(data as any);
      const audit = await easyEatApi.queueAudit();
      if (audit?.items) setAuditItems(audit.items);
      setLoading(false);
    }
    loadReports();
  }, [from, to]);

  const totalQueues = reportData.statusReport.reduce((acc, curr) => acc + Number(curr.count), 0);
  const successQueues = reportData.statusReport.find(s => s.status === 'S3')?.count || 0;
  const activeQueues = (reportData.statusReport.find(s => s.status === 'S1')?.count || 0) + (reportData.statusReport.find(s => s.status === 'S2')?.count || 0);
  const cancelQueues = reportData.statusReport.find(s => s.status === 'S4')?.count || 0;

  const getStatusLabel = (st: string) => {
    switch (st) {
      case 'S1': return 'รอคิว';
      case 'S2': return 'กำลังเรียก';
      case 'S3': return 'ใช้บริการสำเร็จ';
      case 'S4': return 'ยกเลิก';
      case 'S5': return 'เลื่อนเวลา';
      default: return `สถานะ ${st}`;
    }
  };

  const maxDailyCount = Math.max(...reportData.dailyReport.map(d => Number(d.count)), 1);

  return (
    <>
      <PageHeading title="รายงานและสถิติ" eyebrow="RESTAURANT INSIGHTS" description="ภาพรวมการจองและการเข้ารับบริการของร้าน Easy Eat" icon={BarChart3}/>
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        <Field label="ตั้งแต่วันที่" id="report-from" type="date" value={from} onChange={e => setFrom(e.target.value)}/>
        <Field label="ถึงวันที่" id="report-to" type="date" value={to} min={from} onChange={e => setTo(e.target.value)}/>
      </div>
      <Metrics items={[
        {label:'จำนวนคิวทั้งหมด', icon:Ticket, tone:'tone-info', value: totalQueues},
        {label:'ใช้บริการสำเร็จ', icon:CheckCheck, tone:'tone-primary', value: successQueues},
        {label:'รอคิว / กำลังเรียก', icon:Clock3, tone:'tone-warm', value: activeQueues},
        {label:'ยกเลิกคิว', icon:CircleSlash, tone:'tone-danger', value: cancelQueues}
      ]}/>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="p-6 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base flex items-center gap-2"><BarChart3 size={18} className="text-primary"/> สถิติจำนวนคิวรายวัน</h3>
            <span className="text-xs text-muted-foreground">7 วันล่าสุด</span>
          </div>
          <div className="space-y-4 pt-2">
            {reportData.dailyReport.length > 0 ? (
              reportData.dailyReport.map(d => {
                const percentage = (Number(d.count) / maxDailyCount) * 100;
                return (
                  <div key={d.date} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>{d.date}</span>
                      <span className="font-bold text-primary">{d.count} คิว</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}/>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">ไม่มีข้อมูลสถิติรายวัน</p>
            )}
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-base flex items-center gap-2"><Ticket size={18} className="text-primary"/> สรุปสถานะคิวทั้งหมด</h3>
          </div>
          <div className="table-scroll rounded-md border bg-background">
            <table className="management-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-3">สถานะคิว</th>
                  <th className="p-3 text-right">จำนวน (ครั้ง)</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {reportData.statusReport.length > 0 ? (
                  reportData.statusReport.map(s => (
                    <tr key={s.status} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{getStatusLabel(s.status)}</td>
                      <td className="p-3 text-right"><strong>{s.count}</strong></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={2} className="p-6 text-center"><EmptyData icon={BarChart3} title={loading ? 'กำลังโหลดข้อมูล...' : 'ไม่มีข้อมูลสถานะคิว'}/></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="p-6 rounded-xl border bg-card shadow-sm">
          <h3 className="font-semibold mb-4">ช่วงเวลาที่มีคิวมากที่สุด</h3>
          {reportData.peakHours?.length ? <ol className="space-y-3">{reportData.peakHours.map((item, index) => <li key={item.hour} className="flex justify-between border-b pb-2 text-sm"><span>{index + 1}. {item.hour} น.</span><strong>{item.count} คิว</strong></li>)}</ol> : <p className="text-sm text-muted-foreground">ไม่มีข้อมูลในช่วงวันที่เลือก</p>}
        </div>
        <div className="p-6 rounded-xl border bg-card shadow-sm">
          <h3 className="font-semibold mb-4">ประวัติการจัดการคิวล่าสุด</h3>
          <div className="max-h-72 overflow-auto space-y-3">{auditItems.length ? auditItems.map(item => <div key={item.audit_id} className="border-b pb-2 text-sm"><strong>{item.queue_number}</strong> · {item.action}<br/><span className="text-xs text-muted-foreground">{item.admin_name} · {item.created_at}</span></div>) : <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการจัดการคิว</p>}</div>
        </div>
      </div>
      <div className="mt-8 border-t pt-8"><RestaurantSettingsPanel/></div>
    </>
  );
}

function TimeSelector({ label, id, value, onChange }: { label: string; id: string; value: string; onChange: (value: string) => void }) {
  const timeOptions = Array.from({ length: 96 }, (_, index) => {
    const hours = String(Math.floor(index / 4)).padStart(2, '0');
    const minutes = String((index % 4) * 15).padStart(2, '0');
    const time = `${hours}:${minutes}`;
    return { value: time, label: `${time} น.` };
  });
  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <p className="font-medium text-sm mb-3">{label}</p>
      <Choice label="เลือกเวลา (24 ชั่วโมง)" id={id} value={value} onChange={onChange} options={timeOptions}/>
    </div>
  );
}

export function RestaurantSettingsPanel() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => { easyEatApi.restaurantSettings().then(result => result?.settings && setSettings(result.settings)); }, []);
  const change = (key: keyof RestaurantSettings, value: string) => setSettings(current => current ? { ...current, [key]: value } : current);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    if (String(settings.open_time).slice(0, 5) >= String(settings.close_time).slice(0, 5)) {
      setMessage('เวลาปิดต้องอยู่หลังเวลาเปิด เช่น เปิด 08:00 น. และปิด 23:00 น.');
      return;
    }
    const result = await easyEatApi.saveRestaurantSettings(settings);
    setMessage(result?.message ?? 'ไม่สามารถบันทึกการตั้งค่าได้');
  }
  if (!settings) return <p className="text-sm text-muted-foreground">กำลังโหลดการตั้งค่าร้าน…</p>;
  return <>
    <div className="section-heading"><Settings size={20}/><h2>ตั้งค่าร้าน</h2></div>
    <p className="mt-1 text-sm text-muted-foreground">กำหนดเวลาให้บริการ ความจุคิว พิกัด และข้อมูลติดต่อจากหน้าเดียว ระบบจะปิดรับจองอัตโนมัติก่อนเวลาปิด 30 นาที</p>
    <form onSubmit={save} className="max-w-4xl mt-5 space-y-5">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">เวลาให้บริการ</h3>
        <p className="mt-1 text-sm text-muted-foreground">ใช้ระบบเวลา 24 ชั่วโมง และรับจองรอบสุดท้ายก่อนปิด 30 นาที</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <TimeSelector label="เวลาเปิด" id="open-time" value={String(settings.open_time).slice(0, 5)} onChange={value => change('open_time', `${value}:00`)}/>
          <TimeSelector label="เวลาปิด" id="close-time" value={String(settings.close_time).slice(0, 5)} onChange={value => change('close_time', `${value}:00`)}/>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">การจัดการคิว</h3>
        <p className="mt-1 text-sm text-muted-foreground">คำนวณที่ว่างและเวลารอโดยอัตโนมัติ</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <Field label="จำนวนคิวสูงสุดต่อรอบ" id="slot-capacity" type="number" min="1" max="100" value={String(settings.max_queues_per_slot)} onChange={e => change('max_queues_per_slot', e.target.value)} required/>
          <Field label="เวลาเฉลี่ยต่อคิว (นาที)" id="queue-minutes" type="number" min="1" max="120" value={String(settings.avg_minutes_per_queue)} onChange={e => change('avg_minutes_per_queue', e.target.value)} required/>
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="font-semibold">ตำแหน่งและการติดต่อ</h3>
        <p className="mt-1 text-sm text-muted-foreground">พิกัดนี้ใช้ตรวจสอบระยะทางสำหรับการจองล่วงหน้า</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <Field label="เบอร์โทรศัพท์ร้าน" id="restaurant-phone" type="tel" inputMode="tel" value={settings.phone} onChange={e => change('phone', normalizeThaiPhone(e.target.value))} placeholder="0610569067" maxLength={10} required/>
          <Field label="ที่ตั้งร้าน" id="restaurant-location" value={settings.location} onChange={e => change('location', e.target.value)} required/>
          <Field label="ละติจูด (-90 ถึง 90)" id="latitude" type="number" step="any" min="-90" max="90" value={String(settings.latitude)} onChange={e => change('latitude', e.target.value)} required/>
          <Field label="ลองจิจูด (-180 ถึง 180)" id="longitude" type="number" step="any" min="-180" max="180" value={String(settings.longitude)} onChange={e => change('longitude', e.target.value)} required/>
        </div>
      </section>
      {message && <div className="mt-5"><Notice>{message}</Notice></div>}
      <div className="flex justify-end"><Button type="submit"><Save/>บันทึกการตั้งค่า</Button></div>
    </form>
  </>;
}

export function AdminProfileScreen() {
  const [firstname, setFirstname] = useState('Admin');
  const [lastname, setLastname] = useState('System');
  const [email, setEmail] = useState('admin01@gmail.com');
  const [phone, setPhone] = useState('0812345678');
  const [originalPhone, setOriginalPhone] = useState('0812345678');
  const [profilePic, setProfilePic] = useState('');
  const [password, setPassword] = useState(''); 
  const [confirm, setConfirm] = useState(''); 
  const [message, setMessage] = useState('');
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const adminStr = localStorage.getItem('user') || localStorage.getItem('admin');
        if (adminStr) {
          const admin = JSON.parse(adminStr);
          setCurrentAdmin(admin);
          setFirstname(admin.firstname || 'Admin');
          setLastname(admin.lastname || '01');
          setEmail(admin.email || 'admin01@gmail.com');
          setPhone(admin.phone || '0812345678');
          setOriginalPhone(admin.phone || '0812345678');
          setProfilePic(admin.profile_pic || admin.image || '');
        }
      } catch {
        // ใช้ค่าเริ่มต้น
      }
    };
    loadAdminData();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (password) {
      const thaiRegex = /[ก-๙]/;
      if (thaiRegex.test(password)) {
        setMessage('รหัสผ่านห้ามมีตัวอักษรภาษาไทย กรุณาใช้อังกฤษ ตัวเลข หรืออักขระพิเศษเท่านั้น');
        return;
      }
      if (password.length < 8) {
        setMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        return;
      }
      if (!passwordsMatch(password, confirm)) {
        setMessage('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }
    }

    if (!isThaiPhone(phone)) {
      setMessage('กรุณากรอกเบอร์โทรศัพท์ไทย 10 หลัก โดยขึ้นต้นด้วย 0');
      return;
    }

    const isPhoneChanged = phone !== originalPhone;

    try {
      const adminId = currentAdmin?.id || currentAdmin?.admin_id || 'A0001';
      
      // ตรวจสอบเบอร์ซ้ำอีกครั้งก่อนบันทึกข้อมูลจริง
      if (isPhoneChanged) {
        const checkRes: any = await easyEatApi.checkPhone(phone, adminId);
        if (checkRes && checkRes.exists) {
          setMessage('เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว');
          return;
        }
      }

      const payload: any = {
        id: adminId,
        firstname,
        lastname,
        email,
        phone,
        profile_pic: profilePic,
        password: password ? password : ''
      };

      const res: any = await easyEatApi.updateAdmin(payload);
      if (res && res.success) {
        const updatedAdmin = { ...currentAdmin, firstname, lastname, email, phone, profile_pic: profilePic, image: profilePic };
        localStorage.setItem('user', JSON.stringify(updatedAdmin));
        setCurrentAdmin(updatedAdmin);
        setOriginalPhone(phone);
        setMessage('บันทึกข้อมูลผู้ดูแลระบบลงฐานข้อมูลสำเร็จ');
        setPassword('');
        setConfirm('');
      } else {
        setMessage(res?.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  }

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http')) return path;
    return `http://localhost/api/${path.startsWith('/') ? path.slice(1) : path}`;
  };

  return (
    <>
      <PageHeading title="โปรไฟล์ผู้ดูแลระบบ" eyebrow="ADMIN ACCOUNT" description="จัดการข้อมูลส่วนตัวและความปลอดภัยของผู้ดูแลระบบ" icon={UserRound}/>
      <div className="profile-layout">
        <aside className="profile-aside">
          <span className="avatar-preview">
            {profilePic ? (
              <img src={getImageUrl(profilePic)} alt="Admin Avatar" className="w-full h-full object-cover rounded-full border shadow-sm"/>
            ) : (
              <UserRound size={38}/>
            )}
          </span>
          <h2>{firstname || 'ผู้ดูแลระบบ'}</h2>
          <p>สถานะ: ออนไลน์</p>
          <div className="profile-aside-note"><ShieldCheck size={22}/><span>Easy Eat Administrator</span></div>
        </aside>
        <form onSubmit={submit} className="form-section">
          <div className="section-heading"><UserRound size={20}/><h2>ข้อมูลส่วนตัวแอดมิน</h2></div>
          <ImageUpload 
            portrait 
            value={profilePic} 
            onChange={(url: string) => setProfilePic(url)} 
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
            <Field label="ชื่อจริง" id="admin-firstname" name="firstname" value={firstname} onChange={e => setFirstname(e.target.value)} required autoComplete="given-name"/>
            <Field label="นามสกุล" id="admin-lastname" name="lastname" value={lastname} onChange={e => setLastname(e.target.value)} required autoComplete="family-name"/>
            <Field label="อีเมล" id="admin-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
            
            <div>
              <Field label="เบอร์โทรศัพท์ไทย (ขึ้นต้นด้วย 0)" id="admin-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="0812345678" value={phone} maxLength={12} onChange={e => {
                const val = normalizeThaiPhone(e.target.value);
                setPhone(val);
              }} required/>
            </div>
          </div>

          <div className="section-heading mt-8 pt-6 border-t"><LockKeyhole size={20}/><h2>เปลี่ยนรหัสผ่านแอดมิน</h2></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <PasswordField label="รหัสผ่านใหม่" id="admin-password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"/>
            <PasswordField label="ยืนยันรหัสผ่านใหม่" id="admin-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password"/>
          </div>
          {message && <div className="mt-5"><Notice>{message}</Notice></div>}
          <div className="form-actions"><Button type="submit"><Save/>บันทึกข้อมูล</Button></div>
        </form>
      </div>
    </>
  );
}
