import "./globals.css";

export const metadata = {
  title: "Imitation Quotes",
  description: "A playful proof-of-concept for style-inspired quote generation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
