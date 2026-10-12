import { createFileRoute } from '@tanstack/react-router';
import { BookingScreen } from '@/components/easy-eat/customer-screens';
export const Route = createFileRoute('/booking')({
 head: () => ({meta:[{title:'จองคิว — Easy Eat'},{name:'description',content:'จองคิวของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'จองคิว — Easy Eat'},{property:'og:description',content:'จองคิวของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: BookingScreen,
});
