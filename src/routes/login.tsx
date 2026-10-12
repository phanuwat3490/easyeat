import { createFileRoute } from '@tanstack/react-router';
import { LoginScreen } from '@/components/easy-eat/customer-screens';
export const Route = createFileRoute('/login')({
 head: () => ({meta:[{title:'เข้าสู่ระบบ — Easy Eat'},{name:'description',content:'เข้าสู่ระบบของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'เข้าสู่ระบบ — Easy Eat'},{property:'og:description',content:'เข้าสู่ระบบของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: LoginScreen,
});
