import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader, PawPrint } from "lucide-react";
import { toast } from "sonner";
import {
  initDataRaw as _initDataRaw,
  initDataState as _initDataState,
  type User,
  useSignal,
} from "@telegram-apps/sdk-react";

const LoginPage = () => {
  const { telegramOauth } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from || "/dashboard";

  const initDataState = useSignal(_initDataState);

  const [user] = useState<User>(initDataState?.user as User);

  useEffect(() => {
    const authenticateTelegramUser = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        const result = await telegramOauth(
          user.id,
          user.first_name || "",
          user.last_name || "",
          user.username || ""
        );

        toast.info("reached");

        if (result) {
          toast.info("✅ Auth successful, navigating...");

          // Small delay to ensure React state updates are processed
          setTimeout(() => {
            navigate("/dashboard");
          }, 100);
        } else {
          toast("Authentication failed. Please try again first.");
        }
      } catch (error) {
        console.error("Telegram OAuth failed:", error);
        setError(true);
        toast("Authentication failed. Please try again 2nd.");
      } finally {
        setIsLoading(false);
      }
    };

    authenticateTelegramUser();
  }, [telegramOauth, from, navigate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-paws-primary/20 to-paws-accent/20 p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-paws-primary">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <Loader className="animate-spin w-8 h-8 text-paws-primary" />
          <div className="text-center">
            <p className="text-paws-primary font-medium">
              Connecting to BabyRoy...
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Initializing Telegram connection
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-paws-primary/20 to-paws-accent/20 p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
            <PawPrint className="h-8 w-8 text-white" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-red-600">Connection Error</h2>
            <p className="text-red-500 max-w-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-paws-primary text-white rounded-lg hover:bg-paws-accent transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // This should not render if everything works correctly
  return <p>Authentication complete</p>;
};

export default LoginPage;
