import { createFileRoute } from '@tanstack/react-router';
import { RegisterScreen } from '@/components/easy-eat/register-screen';
export const Route = createFileRoute('/register')({
 head: () => ({meta:[{title:'สมัครสมาชิก — Easy Eat'},{name:'description',content:'สมัครสมาชิกของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'สมัครสมาชิก — Easy Eat'},{property:'og:description',content:'สมัครสมาชิกของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: RegisterScreen,
});
