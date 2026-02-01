import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  HomeIcon,
  UserCircleIcon,
  ChartBarIcon,
  TrophyIcon,
  StarIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

const SidePanel = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  const menuItems = [
    { name: "Home", path: "/", icon: HomeIcon },
    { name: "Profile", path: "/profile", icon: UserCircleIcon },
    { name: "Stats & Analysis", path: "/stats", icon: ChartBarIcon },
    { name: "Leaderboards", path: "/leaderboards", icon: TrophyIcon },
    { name: "Achievements", path: "/achievements", icon: StarIcon },
    { name: "Support", path: "/support", icon: QuestionMarkCircleIcon },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Side Panel */}
      <div
        className={`fixed top-0 left-0 h-full w-80 md:w-96 glass border-r border-white/10 z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold text-gradient from-primary-400 to-accent-400">
              Menu
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-2xl font-bold">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {user?.email?.split("@")[0] || "User"}
                </h3>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className="flex items-center space-x-3 px-4 py-3 rounded-lg glass-hover"
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sign Out Button */}
          <div className="p-4 border-t border-white/10">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SidePanel;
