import "./globals.css";

export const metadata = {
  title: "Patriots Predictor",
  description: "Pick who wins every Patriots game and climb the leaderboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="brand">🏈 Patriots Predictor</a>
          <nav>
            <a href="/">Games</a>
            <a href="/leaderboard">Leaderboard</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
