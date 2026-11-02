import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Margin",
  description: "Offline-first expense tracking for Nigeria.",
};

const themeScript = `
(function () {
  try {
    var key = "margin-theme";
    var stored = localStorage.getItem(key);
    var choice = stored === "light" || stored === "dark" ? stored : "system";
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      var resolved = choice === "system" ? (mq.matches ? "dark" : "light") : choice;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
    }
    apply();
    if (choice === "system") {
      mq.addEventListener("change", apply);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolage.variable} ${dmSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}