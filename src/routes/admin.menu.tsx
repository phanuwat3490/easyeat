import { createFileRoute } from '@tanstack/react-router';
import { AdminMenuScreen } from '@/components/easy-eat/admin-screens';
export const Route = createFileRoute('/admin/menu')({
 head: () => ({meta:[{title:'จัดการเมนู — Easy Eat'},{name:'description',content:'จัดการเมนูของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'จัดการเมนู — Easy Eat'},{property:'og:description',content:'จัดการเมนูของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: AdminMenuScreen,
});
