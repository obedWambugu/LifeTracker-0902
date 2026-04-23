import { Route, Switch, Redirect } from "wouter";
import { Provider } from "./components/provider";
import { AuthProvider, useAuth } from "./lib/auth";

import { Toaster } from "@/components/ui/sonner";

import AuthPage from "./pages/auth";
import Dashboard from "./pages/dashboard";
import HabitsPage from "./pages/habits";
import ExpensesPage from "./pages/expenses";
import JournalPage from "./pages/journal";
import SettingsPage from "./pages/settings";
import VerifyEmailPage from "./pages/verify-email";
import Layout from "./components/Layout";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080808]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#555] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/verify" component={VerifyEmailPage} />
        <Route>
          <Redirect to="/auth" />
        </Route>
      </Switch>
    );
  }

  if (!user.isEmailVerified) {
    return <VerifyEmailPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/habits" component={HabitsPage} />
        <Route path="/expenses" component={ExpensesPage} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route>
          <Redirect to="/dashboard" />
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <Provider>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              color: '#fff',
            },
          }}
        />
        {import.meta.env.DEV && null}
      </AuthProvider>
    </Provider>
  );
}

export default App;
