import { createFileRoute } from '@tanstack/react-router';
import { QueueScreen } from '@/components/easy-eat/customer-screens';
export const Route = createFileRoute('/my-queue')({
 head: () => ({meta:[{title:'คิวของฉัน — Easy Eat'},{name:'description',content:'คิวของฉันของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'คิวของฉัน — Easy Eat'},{property:'og:description',content:'คิวของฉันของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: QueueScreen,
});
