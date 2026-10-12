import { createFileRoute } from '@tanstack/react-router';
import { ProfileScreen } from '@/components/easy-eat/customer-screens';
export const Route = createFileRoute('/profile')({
 head: () => ({meta:[{title:'โปรไฟล์ — Easy Eat'},{name:'description',content:'โปรไฟล์ของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'โปรไฟล์ — Easy Eat'},{property:'og:description',content:'โปรไฟล์ของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: ProfileScreen,
});
