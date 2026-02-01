import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Wait for auth state to update
    const timer = setTimeout(() => {
      if (user) {
        // Check if user needs onboarding (new user)
        if (!user.user_metadata?.onboarded) {
          navigate("/onboarding");
        } else {
          navigate("/");
        }
      } else {
        // If no user after callback, redirect to login
        navigate("/login");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
