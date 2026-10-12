import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChefHat, Clock3, Leaf, Ticket, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiBaseUrl, easyEatApi, type MenuItem } from '@/lib/easy-eat-api';
import { Button } from '@/components/ui/button';
export const Route = createFileRoute('/')({
 head: () => ({meta:[{title:'Easy Eat — ทุกมื้อ อร่อยง่าย ๆ'},{name:'description',content:'Easy Eat จองคิวร้านอาหาร ดูคิวของคุณ และพบกับมื้ออร่อยในบรรยากาศสบาย ๆ'},{property:'og:title',content:'Easy Eat — ทุกมื้อ อร่อยง่าย ๆ'},{property:'og:description',content:'เริ่มต้นมื้อดี ๆ กับ Easy Eat จองคิวและติดตามการจองของคุณ'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: HomePage,
});
function menuImageUrl(path?: string) {
  if (!path) return null;
  if (/^(https?:|data:)/.test(path)) return path;
  return `${apiBaseUrl}/${path.replace(/^\//, '')}`;
}
function HomePage(){
 const [menus, setMenus] = useState<MenuItem[] | null>(null);
 useEffect(() => {
  let cancelled = false;
  easyEatApi.menu().then(data => { if (!cancelled) setMenus(Array.isArray(data) ? [...data].sort((a, b) => Number(b.is_active) - Number(a.is_active)) : []); });
  return () => { cancelled = true; };
 }, []);
 return <>
 <div className="page-heading"><div><span className="eyebrow">LET’S MAKE IT A GOOD MEAL</span><h1>มื้ออร่อย กำลังรอคุณอยู่</h1><p>จองคิวไว้ แล้วมาสร้างช่วงเวลาดี ๆ ที่ Easy Eat</p></div><span className="heading-icon"><UtensilsCrossed size={25}/></span></div>
 <section className="hero hero-plain"><div className="hero-copy"><span className="hero-kicker"><Leaf size={14}/> GOOD FOOD. ZERO HASSLE.</span><h2>Easy Eat<span className="text-primary">.</span></h2><h3>อร่อยง่าย ๆ<br/>ไม่ต้องรอให้หิว</h3><p>ให้มื้อโปรดของคุณเป็นเรื่องง่าย<br/>จองคิวล่วงหน้า แล้วมาพบกันที่โต๊ะอาหาร</p><Button asChild size="lg"><Link to="/booking"><CalendarDays/>จองคิวตอนนี้ <ArrowUpRight/></Link></Button></div></section>
 <div className="quick-grid"><Link to="/booking" className="quick-link"><span className="quick-icon"><CalendarDays size={21}/></span><div><h3>จองคิวล่วงหน้า</h3><p>เลือกเวลาที่ใช่ สำหรับมื้อของคุณ</p></div><ArrowUpRight size={17}/></Link><Link to="/my-queue" className="quick-link"><span className="quick-icon"><Ticket size={21}/></span><div><h3>ตรวจสอบคิวของฉัน</h3><p>ติดตามรายการจองได้ทุกเวลา</p></div><ArrowUpRight size={17}/></Link><Link to="/profile" className="quick-link"><span className="quick-icon"><UtensilsCrossed size={21}/></span><div><h3>บัญชีของคุณ</h3><p>จัดการข้อมูลส่วนตัวในที่เดียว</p></div><ArrowUpRight size={17}/></Link></div>
 <section><div className="section-title"><div><h2>มื้อโปรดที่อยากให้ลอง <span className="text-warm">✦</span></h2><p>อาหารดี ๆ ที่ทำให้ทุกวันพิเศษขึ้น</p></div></div>{menus === null ? <p className="text-sm text-muted-foreground">กำลังโหลดเมนู...</p> : menus.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีเมนูในระบบ</p> : <div className="food-grid">{menus.map(({id,name,category,price,image,is_active})=><article className="food-card" key={id}><div className="food-image-wrap">{menuImageUrl(image) ? <img src={menuImageUrl(image) as string} loading="lazy" width={1024} height={768} alt={name} className={`object-cover ${is_active ? '' : 'grayscale opacity-70'}`}/> : <div className="grid h-full w-full place-items-center bg-secondary text-primary"><UtensilsCrossed size={32}/></div>}<span className="food-badge"><ChefHat size={12}/>{category || 'ทั่วไป'}</span></div><div className="food-info"><h3>{name}</h3><div className="food-bottom"><span className="font-semibold">฿{price.toLocaleString('th-TH')}</span><span className={`flex items-center gap-1 font-medium ${is_active ? 'text-primary' : 'text-destructive'}`}>{is_active ? <Check size={12}/> : <X size={12}/>}{is_active ? 'มีจำหน่าย' : 'หมด'}</span></div></div></article>)}</div>}</section>
 <section className="queue-band"><span className="quick-icon"><Clock3 size={22}/></span><div><h3>มีนัดมื้ออร่อยแล้วหรือยัง?</h3><p>เช็กคิวของคุณ แล้วเตรียมตัวมาทานมื้อโปรด</p></div><Button asChild variant="ghost" className="queue-cta"><Link to="/my-queue">ดูคิวของฉัน <ArrowRight/></Link></Button></section>
 </>}
