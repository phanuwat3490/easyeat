import { createFileRoute } from '@tanstack/react-router';
import { AdminMembersScreen } from '@/components/easy-eat/admin-screens';
export const Route = createFileRoute('/admin/members')({
 head: () => ({meta:[{title:'จัดการสมาชิก — Easy Eat'},{name:'description',content:'จัดการสมาชิกของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'จัดการสมาชิก — Easy Eat'},{property:'og:description',content:'จัดการสมาชิกของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: AdminMembersScreen,
});
