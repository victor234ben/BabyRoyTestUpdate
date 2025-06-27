import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader, PawPrint } from "lucide-react";
import { toast } from "sonner";
import { retrieveLaunchParams } from "@telegram-apps/sdk";

const LoginPage = () => {
  const { telegramOauth, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from || "/dashboard";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Handle authentication (SDK is already initialized in App.tsx)
  useEffect(() => {
    const handleTelegramAuth = async () => {
      if (isAuthenticated) return;

      try {
        // Add a small delay to ensure everything is ready
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Retrieve launch parameters
        const launchParams = retrieveLaunchParams();

        if (!launchParams.initData) {
          throw new Error(
            "No init data available. Please open this app through Telegram."
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userData = (launchParams.initData as any).user;

        if (!userData || !userData.id) {
          throw new Error("Unable to retrieve user data from Telegram.");
        }

        console.log("Telegram user data:", userData);

        // Authenticate user
        await telegramOauth(
          userData.id,
          userData.firstName || "",
          userData.lastName || "",
          userData.username || ""
        );

        toast.success("Successfully connected to Telegram!");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Telegram authentication failed:", err);
        setError(err.message || "Authentication failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to ensure SDK is fully ready
    const timer = setTimeout(handleTelegramAuth, 200);
    return () => clearTimeout(timer);
  }, [telegramOauth, isAuthenticated]);

  // Don't render anything if already authenticated
  if (isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-paws-primary/20 to-paws-accent/20 p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <Loader className="animate-spin w-8 h-8 text-paws-primary" />
          <p className="text-paws-primary font-medium text-center">
            Connecting to your account...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-paws-primary/20 to-paws-accent/20 p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-red-600">
            Authentication Error
          </h2>
          <p className="text-red-500 max-w-md text-sm">{error}</p>
          <div className="flex flex-col gap-2 mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Try Again
            </button>
            <p className="text-xs text-gray-500 mt-2">
              If this error persists, please close and reopen the app through
              Telegram
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-green-600 font-medium">
        Authentication complete! Redirecting...
      </p>
    </div>
  );
};

export default LoginPage;
