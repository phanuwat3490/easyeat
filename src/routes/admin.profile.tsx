import { createFileRoute } from '@tanstack/react-router';
import { AdminProfileScreen } from '@/components/easy-eat/admin-screens';
export const Route = createFileRoute('/admin/profile')({
  component: AdminProfileScreen,
});