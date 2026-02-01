import { useAuth } from "../contexts/AuthContext";

const Navbar = ({ onAvatarClick }) => {
  const { user } = useAuth();

  return (
    <nav className="glass sticky top-0 z-40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="text-3xl">♔</div>
            <h1 className="text-2xl font-bold text-gradient from-primary-400 to-accent-400">
              Chess Arena
            </h1>
          </div>

          {/* User Avatar */}
          <button
            onClick={onAvatarClick}
            className="flex items-center space-x-3 glass-hover px-4 py-2 rounded-full"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <span className="hidden sm:block text-sm font-medium">
              {user?.email?.split("@")[0] || "User"}
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
