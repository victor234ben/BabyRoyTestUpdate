// Updated AuthContext with Telegram SDK integration
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { authAPI, profileAPI, UserProfile } from "@/services/api";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cloudStorage, retrieveLaunchParams } from "@telegram-apps/sdk";

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  isAuth: boolean;
  isAuthenticated: boolean;
  sdkReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  telegramOauth: (
    telegramId: string,
    first_name: string,
    last_name: string,
    username: string
  ) => Promise<void>;
  sessionAuth: (sessionToken: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    referralCode?: string
  ) => Promise<void>;
  logout: () => void;
  updateUserData: (userData: UserProfile) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  sdkInitialized: boolean;
}

export const AuthProvider = ({
  children,
  sdkInitialized,
}: AuthProviderProps) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sdkReady, setSdkReady] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize cloud storage when SDK is ready
  useEffect(() => {
    const initCloudStorage = async () => {
      if (!sdkInitialized) return;

      try {
        if (cloudStorage.mount.isAvailable()) {
          cloudStorage.mount();
          console.log("✅ [DEBUG] Cloud storage initialized");
        }
        setSdkReady(true);
      } catch (error) {
        console.error("❌ [DEBUG] Failed to initialize cloud storage:", error);
        setSdkReady(true); // Continue without cloud storage
      }
    };

    initCloudStorage();
  }, [sdkInitialized]);

  // Authentication check - only run when SDK is ready
  useEffect(() => {
    if (!sdkReady) return;

    const checkAuth = async () => {
      try {
        console.log("🔍 [DEBUG] Starting authentication check...");

        // First, check for session token in URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionToken = urlParams.get("session");
        const authSuccess = urlParams.get("auth");
        const error = urlParams.get("error");

        // Handle error cases
        if (error) {
          console.log("❌ [DEBUG] Auth error from URL:", error);
          let errorMessage = "Authentication failed";

          switch (error) {
            case "missing_session":
              errorMessage = "Session token missing";
              break;
            case "invalid_session":
              errorMessage = "Invalid or expired session";
              break;
            case "user_not_found":
              errorMessage = "User account not found";
              break;
            case "auth_failed":
              errorMessage = "Authentication failed";
              break;
          }

          toast.error(errorMessage);
          cleanUrl();
          setLoading(false);
          return;
        }

        // Handle successful auth redirect from server
        if (authSuccess === "success") {
          console.log("✅ [DEBUG] Auth success from server redirect");
          cleanUrl();

          try {
            const userData = await profileAPI.getProfile();
            setUser(userData);
            setIsAuth(true);

            // Store user session in Telegram Cloud Storage as backup
            await storeUserSession(userData);

            toast.success("Welcome back!");
            navigate("/dashboard", { replace: true });
            return;
          } catch (profileError) {
            console.error(
              "❌ [DEBUG] Failed to fetch profile after server auth:",
              profileError
            );
            toast.error("Failed to load user profile");
          }
        }

        // Handle session token from URL
        if (sessionToken) {
          console.log("🔍 [DEBUG] Session token found in URL:", sessionToken);
          cleanUrl();

          try {
            console.log("🔍 [DEBUG] Attempting session authentication...");
            const data = await authAPI.sessionAuth({ sessionToken });

            if (data && data.user) {
              console.log("✅ [DEBUG] Session auth successful:", data.user);
              setUser(data.user);
              setIsAuth(true);

              // Store user session in Telegram Cloud Storage
              await storeUserSession(data.user);

              toast.success("Welcome back!");
              navigate("/dashboard", { replace: true });
              return;
            }
          } catch (sessionError) {
            console.error(
              "❌ [DEBUG] Session authentication failed:",
              sessionError
            );
            toast.error("Session expired. Please try again.");
          }
        }

        // Check for existing valid token
        console.log("🔍 [DEBUG] Checking existing token...");
        const isValid = await authAPI.validateToken();

        if (isValid) {
          console.log("✅ [DEBUG] Existing token valid, fetching profile...");
          const userData = await profileAPI.getProfile();
          setUser(userData);
          setIsAuth(true);

          // Update cloud storage
          await storeUserSession(userData);
        } else {
          console.log("❌ [DEBUG] No valid token found");

          // Try to restore from Telegram Cloud Storage as fallback
          const cloudUser = await restoreUserSession();
          if (cloudUser) {
            console.log("✅ [DEBUG] Restored session from cloud storage");
            setUser(cloudUser);
            setIsAuth(true);
          } else {
            setUser(null);
            setIsAuth(false);
          }
        }
      } catch (error) {
        console.error("❌ [DEBUG] Authentication error:", error);

        // Try cloud storage fallback
        const cloudUser = await restoreUserSession();
        if (cloudUser) {
          setUser(cloudUser);
          setIsAuth(true);
        } else {
          setUser(null);
          setIsAuth(false);
          toast.error("Authentication check failed");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [sdkReady]);

  // Helper functions
  const cleanUrl = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const storeUserSession = async (userData: UserProfile) => {
    try {
      if (cloudStorage.setItem.isAvailable()) {
        await cloudStorage.setItem(
          "user_session",
          JSON.stringify({
            user: userData,
            timestamp: Date.now(),
          })
        );
        console.log("✅ [DEBUG] User session stored in cloud storage");
      }
    } catch (error) {
      console.warn(
        "⚠️ [DEBUG] Failed to store session in cloud storage:",
        error
      );
    }
  };

  const restoreUserSession = async (): Promise<UserProfile | null> => {
    try {
      if (cloudStorage.getItem.isAvailable()) {
        const sessionData = await cloudStorage.getItem("user_session");
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          const isRecent =
            Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000; // 7 days

          if (isRecent && parsed.user) {
            console.log("✅ [DEBUG] Session restored from cloud storage");
            return parsed.user;
          }
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ [DEBUG] Failed to restore session from cloud storage:",
        error
      );
    }
    return null;
  };

  const clearCloudSession = async () => {
    try {
      if (cloudStorage.removeItem.isAvailable()) {
        await cloudStorage.removeItem("user_session");
        console.log("✅ [DEBUG] Cloud session cleared");
      }
    } catch (error) {
      console.warn("⚠️ [DEBUG] Failed to clear cloud session:", error);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authAPI.login({ email, password });
      setUser(data.user);
      setIsAuth(true);

      // Store in cloud storage
      await storeUserSession(data.user);

      toast.success("Login successful!");

      const intendedPath = location.state?.from || "/dashboard";
      navigate(intendedPath, { replace: true });
    } catch (error) {
      toast.error("Login failed. Please check your credentials.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    referralCode?: string
  ) => {
    setLoading(true);
    try {
      await authAPI.register({ name, email, password, referralCode });
      toast.success("Registration successful! Please log in.");
      navigate("/login");
    } catch (error) {
      toast.error("Registration failed. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const telegramOauth = async (
    telegramId: string,
    first_name: string,
    last_name: string,
    username: string
  ) => {
    setLoading(true);
    try {
      const launchParams = retrieveLaunchParams();
      const rawInitData = launchParams.initDataRaw;

      const requestData = {
        telegramId: telegramId.toString(),
        first_name: first_name || "",
        last_name: last_name || "",
        username: username || "",
        initData: rawInitData,
      };

      console.log("🔍 [DEBUG] Telegram OAuth request:", requestData);
      const data = await authAPI.telegramOauth(requestData);

      if (data && data.user) {
        console.log("✅ [DEBUG] Telegram OAuth successful:", data.user);
        setUser(data.user);
        setIsAuth(true);

        // Store in cloud storage
        await storeUserSession(data.user);

        toast.success("Authentication successful!");
        const intendedPath = location.state?.from || "/dashboard";
        navigate(intendedPath, { replace: true });
      }
      return data;
    } catch (error) {
      console.error("❌ [DEBUG] Telegram OAuth error:", error);
      toast.error("Authentication failed. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sessionAuth = async (sessionToken: string) => {
    setLoading(true);
    try {
      const requestData = { sessionToken };

      console.log("🔍 [DEBUG] Making session auth API call...");
      const data = await authAPI.sessionAuth(requestData);

      if (data && data.user) {
        console.log("✅ [DEBUG] Session auth API successful:", data.user);
        setUser(data.user);
        setIsAuth(true);

        // Store in cloud storage
        await storeUserSession(data.user);

        toast.success("Welcome back!");
        return data;
      }
    } catch (error) {
      console.error("❌ [DEBUG] Session authentication error:", error);
      toast.error("Session expired. Please try again.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      await clearCloudSession();
      setUser(null);
      setIsAuth(false);
      navigate("/login");
      toast.info("You have been logged out.");
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      await clearCloudSession();
      setUser(null);
      setIsAuth(false);
      navigate("/login");
    }
  };

  const updateUserData = (userData: UserProfile) => {
    setUser(userData);
    // Update cloud storage
    storeUserSession(userData);
  };

  const isAuthenticated = !!user && isAuth;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        isAuth,
        sdkReady,
        login,
        register,
        logout,
        updateUserData,
        telegramOauth,
        sessionAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
