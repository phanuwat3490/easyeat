import { Link, useRouterState } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ArrowUpRight, CalendarDays, ChefHat, ChevronRight, Home, LayoutGrid, Menu, PanelLeftClose, Ticket, UserRound, Users, ChartNoAxesCombined, UtensilsCrossed, LogOut, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { easyEatApi } from '@/lib/easy-eat-api';

const customerNav = [
  { to: '/', label: 'หน้าหลัก', icon: Home },
  { to: '/booking', label: 'จองคิว', icon: CalendarDays },
  { to: '/my-queue', label: 'คิวของฉัน', icon: Ticket },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
] as const;

const adminNav = [
  { to: '/admin', label: 'จัดการคิว', icon: LayoutGrid },
  { to: '/admin/members', label: 'จัดการสมาชิก', icon: Users },
  { to: '/admin/menu', label: 'จัดการเมนู', icon: UtensilsCrossed },
  { to: '/admin/reports', label: 'รายงาน', icon: ChartNoAxesCombined },
  { to: '/admin/profile', label: 'โปรไฟล์แอดมิน', icon: UserRound },
] as const;

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const admin = pathname.startsWith('/admin');
  const nav = admin ? adminNav : customerNav;
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ id?: number; member_id?: number; firstname: string; role: string } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; message: string; created_at: string }[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    let interval: any = null;
    const savedUser = localStorage.getItem('user');
    
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setUser(u);
        const memberId = u.id || u.member_id;

        const savedDismissed = localStorage.getItem(`dismissed_notis_${memberId}`);
        if (savedDismissed) {
          try {
            setDismissedIds(JSON.parse(savedDismissed));
          } catch {
            setDismissedIds([]);
          }
        } else {
          setDismissedIds([]);
        }
        
        if (memberId && u.role !== 'admin') {
          const verifyAndFetch = async () => {
            const statusRes = await easyEatApi.checkStatus(memberId);
            if (statusRes && statusRes.success && !statusRes.is_active) {
              alert('บัญชีของคุณถูกระงับการใช้งานโดยผู้ดูแลระบบ');
              localStorage.removeItem('user');
              window.location.href = '/login';
              return;
            }

            const notis = await easyEatApi.getNotifications(memberId);
            if (notis) setNotifications(notis);
          };

          verifyAndFetch();
          interval = setInterval(verifyAndFetch, 5000);
        }
      } catch {
        setUser(null);
      }
    } else {
      setDismissedIds([]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  const handleDismiss = (id: string) => {
    if (user) {
      const memberId = user.id || user.member_id;
      const updatedDismissed = [...dismissedIds, id];
      setDismissedIds(updatedDismissed);
      localStorage.setItem(`dismissed_notis_${memberId}`, JSON.stringify(updatedDismissed));
    }
  };

  const handleDismissAll = () => {
    if (user && notifications.length > 0) {
      const memberId = user.id || user.member_id;
      const allIds = notifications.map(n => n.id);
      const updatedDismissed = Array.from(new Set([...dismissedIds, ...allIds]));
      setDismissedIds(updatedDismissed);
      localStorage.setItem(`dismissed_notis_${memberId}`, JSON.stringify(updatedDismissed));
    }
  };

  const currentNavItem = [...customerNav, ...adminNav].find(item => item.to === pathname);
  const title = currentNavItem ? currentNavItem.label : (pathname === '/login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก');

  const activeNotifications = notifications.filter(n => !dismissedIds.includes(n.id));
  const latestNoti = activeNotifications.length > 0 ? activeNotifications[0] : null;

  return (
    <div className="app-frame">
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-icon"><UtensilsCrossed /></span>
          <span>easy<span className="text-primary">eat</span><span className="brand-dot">.</span></span>
        </Link>
        <div className="sidebar-caption">{admin ? 'RESTAURANT MANAGEMENT' : 'GOOD FOOD, GOOD MOMENTS'}</div>
        <div className="nav-label">{admin ? 'สำหรับผู้ดูแลระบบ' : 'มื้อดี ๆ เริ่มที่นี่'}</div>
        <nav className="space-y-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} activeOptions={{ exact: true }} className="nav-item" activeProps={{ className: 'nav-item nav-item-active' }} onClick={() => setOpen(false)}>
              <Icon size={20} />
              <span>{label}</span>
              <ChevronRight className="nav-arrow" size={16} />
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!admin && (
            <div className="sidebar-note">
              <ChefHat size={29} />
              <strong>อร่อยแบบไม่ต้องรอ</strong>
              <span>ให้ทุกมื้อเป็นช่วงเวลาดี ๆ</span>
              <Button asChild className="w-full mt-4" variant="outline">
                <Link to="/booking">จองคิวเลย <ArrowUpRight /></Link>
              </Button>
            </div>
          )}
          <span className="sidebar-copyright">© 2026 Easy Eat</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="mobile-menu" aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'} onClick={() => setOpen(!open)}>
              {open ? <PanelLeftClose /> : <Menu />}
            </Button>
            <span className="breadcrumb-brand">Easy Eat</span>
            <ChevronRight size={14} className="text-muted-foreground" />
            <span>{title}</span>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {user ? (
              <div className="flex items-center gap-3 md:gap-4">
                {/* เอา hidden ออกเพื่อให้แถบแจ้งเตือนแสดงผลได้ในทุกขนาดหน้าจออย่างเหมาะสม */}
                {latestNoti && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5 rounded-lg text-xs shadow-sm max-w-[220px] sm:max-w-xs md:max-w-sm lg:max-w-md" title={latestNoti.message}>
                    <Bell size={14} className="text-amber-600 shrink-0 animate-pulse" />
                    <span className="truncate flex-1" title={latestNoti.message}>{latestNoti.message}</span>
                    <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-amber-200">
                      {activeNotifications.length > 1 && (
                        <button 
                          onClick={handleDismissAll}
                          className="text-[10px] bg-amber-200/80 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded transition-colors font-medium whitespace-nowrap"
                          title="ปิดการแจ้งเตือนทั้งหมด"
                        >
                          ปิดทั้งหมด ({activeNotifications.length})
                        </button>
                      )}
                      <button 
                        onClick={() => handleDismiss(latestNoti.id)} 
                        className="text-amber-700 hover:text-amber-950 transition-colors p-0.5 rounded hover:bg-amber-100"
                        title="ปิดการแจ้งเตือนนี้"
                        aria-label="ปิดการแจ้งเตือน"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <span className="text-sm font-medium whitespace-nowrap">สวัสดี, {user.firstname} ({user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'สมาชิก'})</span>
                <Button 
                  size="sm" 
                  onClick={handleLogout}
                  className="bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm whitespace-nowrap"
                >
                  <LogOut size={16} className="mr-1.5" /> ออกจากระบบ
                </Button>
              </div>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">เข้าสู่ระบบ</Link></Button>
                <Button asChild><Link to="/register">สมัครสมาชิก <ArrowUpRight /></Link></Button>
              </>
            )}
          </div>
        </header>
        <main className="page-content">{children}</main>
        <footer className="page-footer">
          <span>Easy Eat · ทุกมื้อ อร่อยง่าย ๆ</span>
          <span>MADE FOR GOOD MOMENTS <span className="footer-dot" /></span>
        </footer>
      </div>
    </div>
  );
}