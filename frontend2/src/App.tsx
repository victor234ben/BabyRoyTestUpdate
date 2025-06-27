import "./patchCustomElements";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Pages
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import ReferralsPage from "./pages/ReferralsPage";
// import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";
import LeaderBoardPage from "./pages/LeaderBoardPage";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { tonConnectConfig } from "./config/tonconnect";
import { useEffect, useState } from "react";
import AdminDashboard from "./pages/admin/AdminDashboard";
import {
  init as initSDK,
  miniApp,
  viewport,
  themeParams,
} from "@telegram-apps/sdk";

const queryClient = new QueryClient();

const App = () => {
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const initializeTelegramSDK = async () => {
      try {
        // Initialize the SDK
        initSDK();

        // Initialize required components
        if (miniApp.mount.isAvailable()) {
          miniApp.mount();
          miniApp.ready();
        }

        if (viewport.mount.isAvailable()) {
          viewport.mount();
          viewport.expand();
        }

        if (themeParams.mount.isAvailable()) {
          themeParams.mount();
        }
        

        setSdkInitialized(true);
        console.log("Telegram SDK initialized successfully");
      } catch (err) {
        console.error("Failed to initialize Telegram SDK:", err);
        setSdkError("Failed to initialize Telegram SDK");
      }
    };

    initializeTelegramSDK();
  }, []);

  if (sdkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">
            Initialization Error
          </h1>
          <p className="text-red-500 mb-4">{sdkError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  if (!sdkInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">
            Initializing Telegram SDK...
          </p>
        </div>
      </div>
    );
  }

  return (
    <TonConnectUIProvider manifestUrl={tonConnectConfig.manifestUrl}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <AuthProvider sdkInitialized={sdkInitialized}>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/admin-login" element={<AdminDashboard />} />
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Protected Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/tasks"
                  element={
                    <ProtectedRoute>
                      <TasksPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <LeaderBoardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/referrals"
                  element={
                    <ProtectedRoute>
                      <ReferralsPage />
                    </ProtectedRoute>
                  }
                />
                {/* Not Found Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </TonConnectUIProvider>
  );
};

export default App;
