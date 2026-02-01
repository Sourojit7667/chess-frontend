import { useState } from "react";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const Support = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${backendUrl}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setFormData({ name: "", email: "", subject: "", message: "" });
      }, 3000);
    } catch (err) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gradient from-primary-400 to-accent-400">
          Support & Contact
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contact Form */}
          <div className="card">
            <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
            {submitted ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">
                  Message Sent!
                </h3>
                <p className="text-gray-400">
                  We'll get back to you as soon as possible.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input w-full"
                    placeholder="Your name"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="input w-full"
                    placeholder="your@email.com"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    className="input w-full"
                    placeholder="How can we help?"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Message
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="input w-full min-h-[150px]"
                    placeholder="Tell us more..."
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>

          {/* FAQ & Info */}
          <div className="space-y-6">
            {/* FAQ */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">How do seasons work?</h3>
                  <p className="text-sm text-gray-400">
                    Each season lasts 30 days. At the end, leaderboards reset
                    and badges are awarded to top performers.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    What's the difference between AI and Multiplayer
                    leaderboards?
                  </h3>
                  <p className="text-sm text-gray-400">
                    AI leaderboard tracks your performance against computer
                    opponents. Multiplayer leaderboard is for competitive
                    matches against other players.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">
                    How are points calculated?
                  </h3>
                  <p className="text-sm text-gray-400">
                    Points vary by difficulty in AI mode. Higher difficulties
                    give more points. Multiplayer points are based on wins and
                    losses.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="card">
              <h2 className="text-2xl font-bold mb-4">
                Other Ways to Reach Us
              </h2>
              <div className="space-y-3">
                <a
                  href="mailto:sourojitdasvis@gmail.com"
                  className="flex items-center space-x-3 glass-hover p-4 rounded-lg"
                >
                  <span className="text-2xl">📧</span>
                  <div>
                    <div className="font-semibold">Email</div>
                    <div className="text-sm text-gray-400">
                      sourojitdasvis@gmail.com
                    </div>
                  </div>
                </a>
                <a
                  href="https://twitter.com/Souro7667"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 glass-hover p-4 rounded-lg"
                >
                  <span className="text-2xl">🐦</span>
                  <div>
                    <div className="font-semibold">Twitter</div>
                    <div className="text-sm text-gray-400">@Souro7667</div>
                  </div>
                </a>
                <a
                  href="https://instagram.com/sd__classics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 glass-hover p-4 rounded-lg"
                >
                  <span className="text-2xl">📸</span>
                  <div>
                    <div className="font-semibold">Instagram</div>
                    <div className="text-sm text-gray-400">
                      @sd__classics
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
