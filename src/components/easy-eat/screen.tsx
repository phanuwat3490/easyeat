import { useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { CalendarDays, Ticket, Users, UtensilsCrossed, ChartNoAxesCombined, UserRound, ArrowLeft, Inbox, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, Notice, PasswordField } from './form-parts';
import { easyEatApi } from '@/lib/easy-eat-api';

const screens = {
 booking: {title:'จองคิว', eyebrow:'BOOK A TABLE', description:'เลือกช่วงเวลาสำหรับมื้อที่คุณตั้งตารอ', icon:CalendarDays, empty:'ยังไม่เปิดรับการจอง'},
 queue: {title:'คิวของฉัน', eyebrow:'YOUR RESERVATIONS', description:'ทุกการจองของคุณ อยู่ที่นี่', icon:Ticket, empty:'ยังไม่มีรายการจอง'},
 profile: {title:'โปรไฟล์', eyebrow:'MY ACCOUNT', description:'ข้อมูลส่วนตัวของคุณ', icon:UserRound, empty:'ยังไม่ได้เข้าสู่ระบบ'},
 admin: {title:'จัดการคิว', eyebrow:'QUEUE MANAGEMENT', description:'รายการจองและคิวเข้ารับบริการ', icon:Ticket, empty:'ยังไม่มีข้อมูลคิว'},
 members: {title:'จัดการสมาชิก', eyebrow:'MEMBER MANAGEMENT', description:'ข้อมูลสมาชิกของ Easy Eat', icon:Users, empty:'ยังไม่มีข้อมูลสมาชิก'},
 menu: {title:'จัดการเมนู', eyebrow:'MENU MANAGEMENT', description:'รายการอาหารและเครื่องดื่ม', icon:UtensilsCrossed, empty:'ยังไม่มีข้อมูลเมนู'},
 reports: {title:'รายงาน', eyebrow:'RESTAURANT REPORTS', description:'ภาพรวมการจองและการเข้ารับบริการ', icon:ChartNoAxesCombined, empty:'ยังไม่มีข้อมูลรายงาน'},
 login: {title:'เข้าสู่ระบบ', eyebrow:'WELCOME BACK', description:'ยินดีต้อนรับกลับสู่ Easy Eat', icon:UserRound, empty:''},
 register: {title:'สมัครสมาชิก', eyebrow:'JOIN EASY EAT', description:'เริ่มต้นมื้อดี ๆ ไปด้วยกัน', icon:UserRound, empty:'ยังไม่เปิดใช้งานการสมัครสมาชิก'},
};

export function Screen({kind}: {kind: keyof typeof screens}) {
 const screen = screens[kind]; 
 const Icon = screen.icon;

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
    const result = await easyEatApi.login(email, password);
    if (result && result.user) {
      const user = result.user;
      localStorage.setItem('user', JSON.stringify(user));
       setMessage('เข้าสู่ระบบสำเร็จ! กำลังเปลี่ยนหน้า...');
       setTimeout(() => {
        window.location.href = user.role === 'admin' ? '/admin' : '/';
       }, 1000);
     } else {
       setMessage('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ');
       setLoading(false);
     }
   } catch {
     setMessage('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ฐานข้อมูลได้');
     setLoading(false);
   }
 }

 if (kind === 'login') {
   return (
     <>
       <div className="page-heading">
         <div>
           <span className="eyebrow">{screen.eyebrow}</span>
           <h1>{screen.title}</h1>
           <p>{screen.description}</p>
         </div>
         <span className="heading-icon"><Icon size={26}/></span>
       </div>
       <div className="mx-auto max-w-md rounded-lg border bg-card p-6 shadow-sm mt-6">
         <form onSubmit={handleLogin} className="space-y-4">
           <Field label="อีเมล" id="login-email" type="email" placeholder="admin01@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
           <PasswordField label="รหัสผ่าน" id="login-password" value={password} onChange={e => setPassword(e.target.value)} required />
           {message && <Notice>{message}</Notice>}
           <Button type="submit" className="w-full" disabled={loading}>
             {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
           </Button>
         </form>
         <div className="mt-4 text-center text-sm text-muted-foreground">
           ยังไม่มีบัญชี? <Link to="/register" className="font-medium text-primary">สมัครสมาชิก</Link>
         </div>
       </div>
     </>
   );
 }

 return (
   <>
     <div className="page-heading">
       <div>
         <span className="eyebrow">{screen.eyebrow}</span>
         <h1>{screen.title}</h1>
         <p>{screen.description}</p>
       </div>
       <span className="heading-icon"><Icon size={26}/></span>
     </div>
     <div className="empty-screen">
       <span className="empty-icon"><Inbox size={32}/></span>
       <h2>{screen.empty}</h2>
       <span className="text-muted-foreground text-sm">—</span>
       <Button asChild variant="outline" className="mt-5"><Link to="/"><ArrowLeft/>กลับหน้าหลัก</Link></Button>
     </div>
   </>
 );
}
