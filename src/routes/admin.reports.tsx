import { createFileRoute } from '@tanstack/react-router';
import { ReportsScreen } from '@/components/easy-eat/admin-screens';
export const Route = createFileRoute('/admin/reports')({
 head: () => ({meta:[{title:'รายงาน — Easy Eat'},{name:'description',content:'รายงานของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'รายงาน — Easy Eat'},{property:'og:description',content:'รายงานของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: ReportsScreen,
});
