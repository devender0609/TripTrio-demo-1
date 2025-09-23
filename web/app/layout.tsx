// web/app/layout.tsx (server)
import { Suspense } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}