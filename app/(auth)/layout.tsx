import Link from "next/link";
import { CarFront } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header className="container flex h-16 items-center">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CarFront className="h-5 w-5" />
          </span>
          <span className="text-lg tracking-tight">AssetOS</span>
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
