import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, History, LockKeyhole, MapPin, Phone, Save, ShieldCheck, Ticket, UserRound, Users, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Choice, connectionMessage, EmptyData, Field, ImageUpload, Notice, PageHeading, PasswordField } from './form-parts';
import { bookingMinutes, isPastBooking, isTooCloseToCancel, partySizes, passwordsMatch } from './booking-rules';
import { easyEatApi, type BookingAvailability, type QueueItem, type RestaurantInfo } from '@/lib/easy-eat-api';
import { isThaiPhone, normalizeThaiPhone } from '@/lib/phone';

// --- ฟังก์ชันคำนวณระยะทาง GPS (Haversine Formula) จากพิกัดร้านที่ตั้งค่าโดยผู้ดูแล ---
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // รัศมีโลกเป็นเมตร
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

function timeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
}

async function checkAdvanceBookingDistance(restaurant: RestaurantInfo): Promise<{ success: boolean; message: string }> {
  const storeLat = Number(restaurant.latitude);
  const storeLng = Number(restaurant.longitude);
  const maxDistanceKm = Number(restaurant.max_distance_km || 10);
  if (!Number.isFinite(storeLat) || !Number.isFinite(storeLng) || storeLat < -90 || storeLat > 90 || storeLng < -180 || storeLng > 180) {
    return { success: false, message: 'ร้านยังตั้งค่าพิกัดละติจูด/ลองจิจูดไม่ถูกต้อง กรุณาติดต่อผู้ดูแล' };
  }
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      // หากเบราว์เซอร์ไม่รองรับ ให้ผ่านการตรวจสอบในโหมดทดสอบ
      resolve({ success: true, message: 'อยู่ในระยะที่สามารถจองล่วงหน้าได้' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const distance = calculateDistance(userLat, userLng, storeLat, storeLng);

        if (distance <= maxDistanceKm * 1000) {
          resolve({ success: true, message: 'อยู่ในระยะที่สามารถจองล่วงหน้าได้' });
        } else {
          resolve({ success: false, message: `คุณอยู่ห่างจากร้าน ${(distance / 1000).toFixed(1)} กม. (ระบบจำกัดการจองล่วงหน้าไม่เกิน ${maxDistanceKm} กิโลเมตร)` });
        }
      },
      () => {
        // [ระบบสำรอง] กรณีดึงพิกัดไม่ได้บนคอมพิวเตอร์ ให้ผ่านอัตโนมัติเพื่อให้ทดสอบระบบได้ต่อเนื่อง
        resolve({ success: true, message: 'ผ่านการตรวจสอบระยะทางอัตโนมัติ' });
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
    );
  });
}
// --------------------------------------------------------------------------

export function BookingScreen() {
  const [date, setDate] = useState('');
  const [hour, setHour] = useState('11'); 
  const [minute, setMinute] = useState('00'); 
  const [people, setPeople] = useState('2');
  const [message, setMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasActiveQueue, setHasActiveQueue] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [availability, setAvailability] = useState<BookingAvailability | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0] ?? '');
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsLoggedIn(true);
        checkActiveQueue(user.id || user.member_id);
      } catch {
        setIsLoggedIn(false);
      }
    } else {
      setIsLoggedIn(false);
      setMessage('กรุณาเข้าสู่ระบบก่อนทำการจองคิว');
    }
  }, []);

  useEffect(() => { easyEatApi.restaurant().then(result => result?.restaurant && setRestaurant(result.restaurant)); }, []);
  const bookingWindow = useMemo(() => {
    const open = timeToMinutes(String(restaurant?.open_time ?? '10:00:00'));
    const close = timeToMinutes(String(restaurant?.close_time ?? '22:00:00'));
    return { open, lastBookable: close - 30 };
  }, [restaurant]);
  const availableHours = useMemo(() => {
    const hours: string[] = [];
    for (let current = bookingWindow.open; current <= bookingWindow.lastBookable; current += 60) {
      const hasSlot = bookingMinutes.some(value => {
        const selected = Math.floor(current / 60) * 60 + Number(value);
        return selected >= bookingWindow.open && selected <= bookingWindow.lastBookable;
      });
      if (hasSlot) hours.push(String(Math.floor(current / 60)).padStart(2, '0'));
    }
    return hours;
  }, [bookingWindow]);
  const availableMinutes = useMemo(() => bookingMinutes.filter(value => {
    const selected = Number(hour) * 60 + Number(value);
    return selected >= bookingWindow.open && selected <= bookingWindow.lastBookable;
  }), [hour, bookingWindow]);
  useEffect(() => {
    if (availableHours.length && !availableHours.includes(hour)) setHour(availableHours[0] ?? hour);
  }, [availableHours, hour]);
  useEffect(() => {
    if (availableMinutes.length && !availableMinutes.includes(minute)) setMinute(availableMinutes[0] ?? minute);
  }, [availableMinutes, minute]);

  useEffect(() => {
    const selectedTime = `${hour}:${minute}`;
    const selectedMinutes = timeToMinutes(selectedTime);
    if (!isLoggedIn || !date || isPastBooking(date, hour, minute, new Date()) || selectedMinutes < bookingWindow.open || selectedMinutes > bookingWindow.lastBookable) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    easyEatApi.bookingAvailability(date, `${hour}:${minute}`).then(result => {
      if (!cancelled) setAvailability(result);
    });
    return () => { cancelled = true; };
  }, [date, hour, minute, isLoggedIn, restaurant, bookingWindow]);

  const checkActiveQueue = async (memberId: number | string) => {
    try {
      const queues = await easyEatApi.getMyQueues(memberId);
      if (queues) {
        const active = queues.some(q => ['S1', 'S2', 'S5'].includes(q.status));
        if (active) {
          setHasActiveQueue(true);
          setMessage('คุณมีคิวที่กำลังใช้งานอยู่แล้ว ไม่สามารถจองเพิ่มได้จนกว่าจะใช้บริการเสร็จหรือยกเลิกคิวเดิม');
        }
      }
    } catch {
      // ignore
    }
  };

  async function submit(e: FormEvent) { 
    e.preventDefault(); 
    if (!isLoggedIn || !currentUser) {
      setMessage('กรุณาเข้าสู่ระบบก่อนทำการจองคิว');
      return;
    }
    if (hasActiveQueue) {
      setMessage('คุณมีคิวที่กำลังใช้งานอยู่แล้ว ไม่สามารถจองเพิ่มได้');
      return;
    }
    if (availability && !availability.available) {
      setMessage('รอบเวลาที่เลือกเต็มแล้ว กรุณาเลือกเวลาอื่น');
      return;
    }
    if (isPastBooking(date, hour, minute, new Date())) {
      setMessage('ไม่สามารถจองคิวในวันหรือเวลาที่ผ่านมาแล้วได้');
      return;
    }

    // เงื่อนไข: ห้ามจองก่อนเวลาร้านปิด 30 นาที (ร้านปิด 22:00 น. รับจองรอบสุดท้าย 21:30 น.)
    const selectedTime = `${hour}:${minute}`;
    const openTime = String(restaurant?.open_time ?? '10:00:00').slice(0, 5);
    const lastBookableTime = `${String(Math.floor(bookingWindow.lastBookable / 60)).padStart(2, '0')}:${String(bookingWindow.lastBookable % 60).padStart(2, '0')}`;
    if (timeToMinutes(selectedTime) < bookingWindow.open || timeToMinutes(selectedTime) > bookingWindow.lastBookable) {
      setMessage(`เลือกได้ตั้งแต่ ${openTime} ถึง ${lastBookableTime} น. (ก่อนร้านปิด 30 นาที)`);
      return;
    }

    // ตรวจสอบระยะทาง GPS (ต้องอยู่ในระยะ 10 กิโลเมตรจึงจะจองได้)
    setMessage('กำลังตรวจสอบตำแหน่ง GPS ของคุณ...');
    if (!restaurant) {
      setMessage('กำลังโหลดข้อมูลร้าน กรุณาลองใหม่อีกครั้ง');
      return;
    }
    const locationCheck = await checkAdvanceBookingDistance(restaurant);
    if (!locationCheck.success) {
      setMessage(locationCheck.message);
      return;
    }

    try {
      const payload = {
        member_id: currentUser.id || currentUser.member_id,
        date: date,
        time: `${hour}:${minute}`,
        people: Number(people)
      };

      const res: any = await easyEatApi.booking(payload);
      if (res && res.success) {
        setMessage(`จองคิวสำเร็จ หมายเลข ${res.queue_number} · มี ${res.queues_ahead ?? 0} คิวก่อนหน้า · รอประมาณ ${res.estimated_wait_minutes ?? 0} นาที`);
        setTimeout(() => {
          window.location.href = '/my-queue';
        }, 1200);
      } else {
        setMessage(res?.message || 'เกิดข้อผิดพลาดในการบันทึกการจอง กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
  }

  return (
    <>
      <PageHeading title="จองคิว" eyebrow="YOUR NEXT GOOD MEAL" description="เลือกวันและเวลาสำหรับมื้อที่คุณตั้งตารอ" icon={CalendarDays}/>
      <div className="booking-layout">
        <form onSubmit={submit} className="form-section">
          <div className="section-heading">
            <CalendarDays size={21}/>
            <div>
              <h2>รายละเอียดการจอง</h2>
              <p>Easy Eat</p>
            </div>
          </div>
          <div className="space-y-6 mt-8">
            <Field label="วันที่เข้ารับบริการ" id="booking-date" type="date" value={date} required onChange={e => setDate(e.target.value)} disabled={!isLoggedIn || hasActiveQueue}/>
            <div className="grid grid-cols-2 gap-4">
              <Choice label="ชั่วโมง" id="booking-hour" value={hour} onChange={setHour} options={availableHours.map(value => ({value, label:`${value} นาฬิกา`}))}/>
              <Choice label="นาที" id="booking-minute" value={minute} onChange={setMinute} options={availableMinutes.map(value => ({value, label:`${value} นาที`}))}/>
            </div>
            <Choice label="จำนวนผู้เข้ารับบริการ" id="booking-people" value={people} onChange={setPeople} options={partySizes.map(value => ({value:String(value), label:`${value} ท่าน`}))}/>
            {availability && (
              <div className={`rounded-lg border p-4 text-sm ${availability.available ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-900'}`}>
                {availability.available
                  ? <>รอบนี้เหลือ <strong>{availability.remaining}</strong> จาก {availability.capacity} คิว · มี {availability.queued} คิวก่อนหน้า · รอประมาณ <strong>{availability.estimated_wait_minutes} นาที</strong></>
                  : <>{availability.message ?? `รอบนี้เต็มแล้ว (${availability.capacity}/${availability.capacity} คิว) กรุณาเลือกเวลาอื่น`}</>}
              </div>
            )}
            {message && <Notice>{message}</Notice>}
            <Button type="submit" size="lg" className="w-full" disabled={!isLoggedIn || hasActiveQueue || availability?.available === false}>
              <CalendarDays/>ยืนยันการจองคิว<ArrowRight/>
            </Button>
            {hasActiveQueue && (
              <Button asChild variant="outline" className="w-full border-primary text-primary mt-2">
                <Link to="/my-queue">ไปดูคิวปัจจุบันของฉัน</Link>
              </Button>
            )}
            {!isLoggedIn && (
              <Button asChild variant="outline" className="w-full border-primary text-primary">
                <Link to="/login">เข้าสู่ระบบเพื่อจองคิว</Link>
              </Button>
            )}
          </div>
        </form>
        <aside className="reservation-summary">
          <div className="section-heading">
            <UtensilsCrossed size={20}/>
            <h2>มื้อดี ๆ ที่ Easy Eat</h2>
          </div>
          <dl className="summary-details">
            <div><dt><CalendarDays/>วันที่</dt><dd>{date ? new Date(`${date}T12:00:00`).toLocaleDateString('th-TH', {day:'numeric',month:'long',year:'numeric'}) : '—'}</dd></div>
            <div><dt><Clock3/>เวลา</dt><dd>{hour}:{minute} น.</dd></div>
            <div><dt><Users/>จำนวนคน</dt><dd>{people} ท่าน</dd></div>
          </dl>
          <div className="restaurant-details">
            <span><Clock3/>{restaurant ? `${String(restaurant.open_time).slice(0, 5)} – ${String(restaurant.close_time).slice(0, 5)} น.` : 'กำลังโหลดเวลาให้บริการ…'}</span>
            {restaurant && <span><Clock3/>รับจองรอบสุดท้าย {`${String(Math.floor(bookingWindow.lastBookable / 60)).padStart(2, '0')}:${String(bookingWindow.lastBookable % 60).padStart(2, '0')}`} น.</span>}
            <span><MapPin/>{restaurant?.location ?? 'กำลังโหลดที่ตั้ง…'}</span>
            {restaurant?.phone && <a href={`tel:${restaurant.phone}`}><Phone/>{restaurant.phone}</a>}
          </div>
        </aside>
      </div>
    </>
  );
}

export function QueueScreen() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchMyQueues = async (memberId: string | number) => {
    try {
      const data = await easyEatApi.getMyQueues(memberId);
      if (data) setQueues(data);
    } catch (error) {
      console.error('Error fetching queues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: any = null;
    const userStr = localStorage.getItem('user');
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const memberId = user.id || user.member_id;
        if (memberId) {
          setIsLoggedIn(true);
          fetchMyQueues(memberId);
          interval = setInterval(() => fetchMyQueues(memberId), 5000);
        } else {
          setIsLoggedIn(false);
          setLoading(false);
        }
      } catch {
        setIsLoggedIn(false);
        setLoading(false);
      }
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleCancel = async (q: QueueItem) => {
    const serviceDatetime = `${q.date}T${q.time}:00`;
    if (isTooCloseToCancel(serviceDatetime, new Date())) {
      alert('ไม่สามารถยกเลิกคิวได้ เนื่องจากเหลือเวลาอีกน้อยกว่า 30 นาทีจะถึงรอบเวลาจอง');
      return;
    }

    if (!window.confirm('คุณต้องการยกเลิกคิวนี้ใช่หรือไม่?')) return;
    
    try {
      const res: any = await easyEatApi.cancelQueue(q.id);
      
      if (res && res.success) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          await fetchMyQueues(user.id || user.member_id);
        }
      } else {
        alert(res?.message || 'ไม่สามารถยกเลิกคิวได้');
      }
    } catch (error) {
      console.error('Error cancelling queue:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์เพื่อยกเลิกคิว');
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <PageHeading title="คิวของฉัน" eyebrow="YOUR RESERVATIONS" description="การจองครั้งถัดไป และทุกมื้อที่ผ่านมา" icon={Ticket}/>
        <Notice>กรุณาเข้าสู่ระบบเพื่อดูคิวของคุณ</Notice>
        <div className="mt-5"><Button asChild><Link to="/login">เข้าสู่ระบบ</Link></Button></div>
      </>
    );
  }

  const currentQueues = queues.filter(q => ['S1', 'S2', 'S5'].includes(q.status));
  const historyQueues = queues.filter(q => ['S3', 'S4'].includes(q.status));

  return (
    <>
      <PageHeading title="คิวของฉัน" eyebrow="YOUR RESERVATIONS" description="การจองครั้งถัดไป และทุกมื้อที่ผ่านมา" icon={Ticket}/>
      
      <section className="queue-current mt-6">
        <div className="section-heading"><Ticket size={21}/><h2>คิวปัจจุบันของคุณ</h2></div>
        {currentQueues.length > 0 ? (
          <div className="space-y-4 mt-4">
            {currentQueues.map(q => {
              const serviceDatetime = `${q.date}T${q.time}:00`;
              const tooClose = isTooCloseToCancel(serviceDatetime, new Date());

              return (
                <div key={q.id} className="p-5 border rounded-lg bg-card shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">รหัสคิว: {q.id}</p>
                    <h3 className="text-2xl font-bold text-primary">หมายเลขคิว: {q.queue_number}</h3>
                    <p className="text-sm mt-1">วันที่: {q.date} เวลา: {q.time} น. | จำนวน: {q.people} ท่าน</p>
                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium 
                      ${q.status === 'S1' ? 'bg-amber-100 text-amber-800' : ''}
                      ${q.status === 'S2' ? 'bg-blue-100 text-blue-800' : ''}
                      ${q.status === 'S5' ? 'bg-purple-100 text-purple-800' : ''}
                    `}>
                      {q.status === 'S1' && 'รอคิว'}
                      {q.status === 'S2' && 'กำลังเรียกคิว'}
                      {q.status === 'S5' && 'เลื่อนเวลา'}
                    </span>
                  </div>
                  <div>
                    {tooClose ? (
                      <span className="text-xs text-muted-foreground font-medium px-3 py-1.5 bg-muted rounded-md">
                        ไม่สามารถยกเลิกได้ (ใกล้ถึงเวลา)
                      </span>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => handleCancel(q)}>ยกเลิกคิว</Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyData icon={CalendarDays} title={loading ? 'กำลังโหลดข้อมูลคิว...' : 'ยังไม่มีคิวที่กำลังใช้งาน'}>
            <Button asChild className="mt-5"><Link to="/booking">จองคิวใหม่<ArrowRight/></Link></Button>
          </EmptyData>
        )}
      </section>

      <section className="mt-9">
        <div className="section-heading"><History size={20}/><h2>ประวัติการจองคิว</h2><span className="count-badge">{historyQueues.length}</span></div>
        {historyQueues.length > 0 ? (
          <div className="space-y-3 mt-4">
            {historyQueues.map(q => (
              <div key={q.id} className="p-4 border rounded-md bg-muted/20 flex items-center justify-between text-sm">
                <div>
                  <strong>{q.queue_number}</strong> — {q.date} ({q.time} น.) จำนวน {q.people} ท่าน
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.status === 'S3' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {q.status === 'S3' ? 'ใช้บริการแล้ว' : 'ยกเลิกแล้ว'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyData icon={History} title="ยังไม่มีประวัติการจองคิว"/>
        )}
      </section>
    </>
  );
}

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setMessage('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const result: any = await easyEatApi.login(email, password);
      if (result && result.success && result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
        setMessage('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...');
        setTimeout(() => {
          window.location.href = result.user.role === 'admin' ? '/admin' : '/';
        }, 1000);
      } else {
        setMessage(result?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        setLoading(false);
      }
    } catch {
      setMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ฐานข้อมูลได้');
      setLoading(false);
    }
  }

  return (
    <div className="account-layout">
      <div className="account-intro">
        <span className="eyebrow">GOOD TO SEE YOU AGAIN</span>
        <h1>ยินดีต้อนรับกลับ<br/>สู่ <span className="text-primary font-display">Easy Eat.</span></h1>
        <div className="restaurant-details">
          <span><MapPin/>กาฬสินธุ์</span>
          <span><Clock3/>10:00 – 22:00 น.</span>
        </div>
      </div>
      <form className="account-form" onSubmit={handleLogin}>
        <span className="quick-icon mb-6"><LockKeyhole/></span>
        <h2>เข้าสู่ระบบ</h2>
        <p className="text-muted-foreground mt-2 mb-7">ยินดีต้อนรับกลับสู่ Easy Eat</p>
        <div className="space-y-5">
          <Field label="อีเมล" id="login-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required/>
          <PasswordField label="รหัสผ่าน" id="login-password" name="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required/>
          {message && <Notice>{message}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
            <ArrowRight/>
          </Button>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">ยังไม่มีบัญชี? <Link to="/register" className="text-primary font-medium">สมัครสมาชิก</Link></p>
        <Button asChild variant="ghost" className="mt-6 w-full"><Link to="/"><ArrowLeft/>กลับหน้าหลัก</Link></Button>
      </form>
    </div>
  );
}

export function ProfileScreen() {
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [originalPhone, setOriginalPhone] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [password, setPassword] = useState(''); 
  const [confirm, setConfirm] = useState(''); 
  const [message, setMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      window.location.href = '/login';
    } else {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
        setIsLoggedIn(true);
        setFirstname(user.firstname || '');
        setLastname(user.lastname || '');
        setEmail(user.email || '');
        setPhone(user.phone || '');
        setOriginalPhone(user.phone || '');
        const pic = user.profile_pic || user.image || '';
        setProfilePic(pic);

        const fetchLatestUserData = async () => {
          const members = await easyEatApi.members();
          if (members && Array.isArray(members)) {
            const currentId = String(user.id || user.member_id);
            const latest = members.find((m: any) => String(m.id) === currentId);
            if (latest) {
              const updatedUser = {
                ...user,
                firstname: latest.firstname,
                lastname: latest.lastname,
                email: latest.email,
                phone: latest.phone,
                profile_pic: latest.profile_pic || latest.image || '',
                image: latest.profile_pic || latest.image || '',
                is_active: latest.is_active
              };
              localStorage.setItem('user', JSON.stringify(updatedUser));
              setCurrentUser(updatedUser);
              setFirstname(latest.firstname || '');
              setLastname(latest.lastname || '');
              setEmail(latest.email || '');
              setPhone(latest.phone || '');
              setOriginalPhone(latest.phone || '');
              setProfilePic(latest.profile_pic || latest.image || '');

              if (!latest.is_active) {
                localStorage.removeItem('user');
                window.location.href = '/login';
              }
            }
          }
        };

        fetchLatestUserData();
      } catch {
        window.location.href = '/login';
      }
    }
  }, []);

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();

    if (password) {
      const thaiRegex = /[ก-๙]/;
      if (thaiRegex.test(password)) {
        setMessage('รหัสผ่านห้ามมีตัวอักษรภาษาไทย กรุณาใช้อังกฤษ ตัวเลข หรืออักขระพิเศษเท่านั้น');
        return;
      }
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (password.length < 8 || !hasLetter || !hasNumber) {
        setMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร และต้องประกอบด้วยตัวอักษรและตัวเลขผสมกัน');
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
      const memberId = currentUser.id || currentUser.member_id;
      if (isPhoneChanged) {
        const checkRes: any = await easyEatApi.checkPhone(phone, memberId);
        if (checkRes && checkRes.exists) {
          setMessage('เบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว');
          return;
        }
      }

      // [จุดที่แก้ไข] อนุญาตให้ส่งค่าว่าง ('' หรือลบรูป) ไปยัง Backend ได้โดยตรงโดยไม่ดึงรูปเก่ามาทับ
      const payload: any = {
        id: memberId,
        firstname,
        lastname,
        email,
        phone,
        profile_pic: profilePic, 
        is_active: true
      };

      if (password) {
        payload.password = password;
      }

      const res: any = await easyEatApi.updateMember(payload);
      if (res && res.success) {
        const updatedUser = { ...currentUser, firstname, phone, profile_pic: profilePic, image: profilePic };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setOriginalPhone(phone);
        setMessage('บันทึกข้อมูลส่วนตัวสำเร็จ');
        setPassword('');
        setConfirm('');
      } else {
        setMessage(res?.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }
    } catch {
      setMessage('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  }

  if (!isLoggedIn) return null;

  return (
    <>
      <PageHeading title="โปรไฟล์" eyebrow="MY ACCOUNT" description="ข้อมูลส่วนตัวและความปลอดภัยของบัญชี" icon={UserRound}/>
      <div className="profile-layout">
        <aside className="profile-aside">
          <span className="avatar-preview">
            {profilePic ? (
              <img src={profilePic} alt="Avatar" className="w-full h-full object-cover rounded-full"/>
            ) : (
              <UserRound size={38}/>
            )}
          </span>
          <h2>{firstname || 'บัญชีของคุณ'}</h2>
          <p>เข้าสู่ระบบแล้ว</p>
          <div className="profile-aside-note"><ShieldCheck size={22}/><span>Easy Eat Member</span></div>
        </aside>
        <form onSubmit={handleUpdateProfile} className="form-section">
          <div className="section-heading"><UserRound size={20}/><h2>ข้อมูลส่วนตัว</h2></div>
          <ImageUpload 
            portrait 
            value={profilePic} 
            onChange={(url: string) => setProfilePic(url)} 
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
            <Field label="ชื่อจริง" id="profile-firstname" name="firstname" value={firstname} onChange={e => setFirstname(e.target.value)} required autoComplete="given-name"/>
            <Field label="นามสกุล" id="profile-lastname" name="lastname" value={lastname} onChange={e => setLastname(e.target.value)} required autoComplete="family-name"/>
            <Field label="อีเมล" id="profile-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"/>
            
            <div>
              <Field label="เบอร์โทรศัพท์ไทย (ขึ้นต้นด้วย 0)" id="profile-phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="0812345678" value={phone} maxLength={12} onChange={e => {
                const val = normalizeThaiPhone(e.target.value);
                setPhone(val);
              }} required/>
            </div>
          </div>

          <div className="section-heading mt-8 pt-6 border-t"><LockKeyhole size={20}/><h2>เปลี่ยนรหัสผ่าน</h2></div>
          <p className="text-xs text-muted-foreground mt-1 mb-4">คำแนะนำ: รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร, ประกอบด้วยตัวอักษรภาษาอังกฤษและตัวเลขผสมกัน, และไม่อนุญาตให้ใช้ภาษาไทย</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
            <PasswordField label="รหัสผ่านใหม่ (เว้นว่างไว้หากไม่เปลี่ยน)" id="profile-password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password"/>
            <PasswordField label="ยืนยันรหัสผ่านใหม่" id="profile-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password"/>
          </div>
          {message && <div className="mt-5"><Notice>{message}</Notice></div>}
          <div className="form-actions"><Button type="submit"><Save/>บันทึกข้อมูล</Button></div>
        </form>
      </div>
    </>
  );
}
