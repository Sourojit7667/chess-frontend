import { Link } from "react-router-dom";
import {
  ComputerDesktopIcon,
  UsersIcon,
  GlobeAltIcon,
  TrophyIcon,
  ChartBarIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

const Home = () => {
  const gameModes = [
    {
      title: "Versus Computer",
      description: "Challenge AI opponents from Beginner to Master difficulty",
      icon: ComputerDesktopIcon,
      path: "/vs-computer",
      gradient: "from-ai-600 to-ai-500",
      iconBg: "bg-ai-500/20",
    },
    {
      title: "Two Player",
      description: "Play locally or online with a friend using a code",
      icon: UsersIcon,
      path: "/two-player",
      gradient: "from-purple-600 to-purple-500",
      iconBg: "bg-purple-500/20",
    },
    {
      title: "Multiplayer",
      description: "Compete against random opponents worldwide",
      icon: GlobeAltIcon,
      path: "/multiplayer",
      gradient: "from-multiplayer-600 to-multiplayer-500",
      iconBg: "bg-multiplayer-500/20",
    },
  ];

  const quickLinks = [
    {
      title: "Leaderboards",
      description: "View rankings",
      icon: TrophyIcon,
      path: "/leaderboards",
    },
    {
      title: "Stats",
      description: "Your performance",
      icon: ChartBarIcon,
      path: "/stats",
    },
    {
      title: "Achievements",
      description: "Badges & rewards",
      icon: StarIcon,
      path: "/achievements",
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 mt-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="text-gradient from-primary-400 to-accent-400">
              Welcome to the Arena
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Choose your game mode and start your journey to chess mastery
          </p>
        </div>

        {/* Game Modes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {gameModes.map((mode) => (
            <Link key={mode.path} to={mode.path} className="card-hover group">
              <div
                className={`${mode.iconBg} w-16 h-16 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <mode.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
              <p className="text-gray-400">{mode.description}</p>
              <div
                className={`mt-4 inline-flex items-center text-sm font-semibold bg-gradient-to-r ${mode.gradient} bg-clip-text text-transparent`}
              >
                Play Now →
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="glass-hover p-6 flex items-center space-x-4"
            >
              <div className="bg-primary-500/20 w-12 h-12 rounded-lg flex items-center justify-center">
                <link.icon className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h4 className="font-semibold">{link.title}</h4>
                <p className="text-sm text-gray-400">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Season Info */}
        <div className="card mt-12 text-center">
          <div className="inline-flex items-center space-x-2 bg-primary-500/20 px-4 py-2 rounded-full mb-4">
            <TrophyIcon className="w-5 h-5 text-primary-400" />
            <span className="text-sm font-semibold text-primary-400">
              Season 1 Active
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2">Compete for Glory</h3>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Climb the leaderboards, earn badges, and prove your skills. Top
            players earn exclusive rewards!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
