import "./globals.css";

export const metadata = {
  title: "克里斯卡社 | Chris Hub",
  description: "A considered home for collectible card pieces.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
