import { useEffect, useState } from "react";
import { getMe } from "./api/authApi";
import { clearToken, getToken } from "./api/apiClient";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import type { User } from "./types/auth";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();

      if (!token) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const loggedInUser = await getMe();
        setUser(loggedInUser);
      } catch {
        clearToken();
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  if (isCheckingAuth) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Sale Ledger</h1>
          <p className="subtitle">Checking your session...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={setUser} />;
  }

  return <DashboardPage user={user} onLogout={() => setUser(null)} />;
}
