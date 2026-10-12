import { createFileRoute } from '@tanstack/react-router';
import { AdminQueueScreen } from '@/components/easy-eat/admin-screens';
export const Route = createFileRoute('/admin/')({
 head: () => ({meta:[{title:'จัดการคิว — Easy Eat'},{name:'description',content:'จัดการคิวของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:title',content:'จัดการคิว — Easy Eat'},{property:'og:description',content:'จัดการคิวของ Easy Eat ระบบจองคิวร้านอาหาร'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: AdminQueueScreen,
});
