import DashboardClient from '../dashboard-client';

// The one /dashboard route middleware leaves open. Interim screen: it reuses the existing
// sign-in form until the portal's own login screen replaces it (Phase 2, Task 9).
export default function DashboardLoginPage() {
  return (
    <main>
      <DashboardClient mode="login" />
    </main>
  );
}
