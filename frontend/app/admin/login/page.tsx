import { Suspense } from 'react';
import { AuthForm } from '@/components/auth-form';

/** Same combined sign-in screen as /login, just opened on the Admin tab by default.
 * The visitor can still switch back to User with the toggle inside AuthForm. */
export default function AdminLoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" initialRole="admin" />
    </Suspense>
  );
}
