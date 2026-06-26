import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CarFront,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Hotel,
  LayoutDashboard,
  ParkingCircle,
  QrCode,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const customers = [
  { icon: Building2, label: "Apartment communities" },
  { icon: Shield, label: "Military housing" },
  { icon: LayoutDashboard, label: "Office campuses" },
  { icon: GraduationCap, label: "Universities" },
  { icon: Hotel, label: "Hotels & venues" },
  { icon: Users, label: "Property managers" },
];

const features = [
  {
    icon: ParkingCircle,
    title: "Spaces & assignments",
    body: "Model every property, level, and stall. Assign primary spaces to residents in seconds.",
  },
  {
    icon: CalendarCheck,
    title: "Release & reserve",
    body: "Residents release spaces they aren't using; neighbors reserve them — no double-booking, ever.",
  },
  {
    icon: QrCode,
    title: "Guest parking",
    body: "Issue visitor passes with scannable tokens. No more clipboard at the gate.",
  },
  {
    icon: Gauge,
    title: "Utilization reporting",
    body: "See occupancy, released hours, and the busiest properties at a glance.",
  },
  {
    icon: Sparkles,
    title: "AI insights",
    body: "Surface underused capacity and demand patterns. Smarter recommendations coming soon.",
  },
  {
    icon: Shield,
    title: "Multi-tenant & secure",
    body: "Every organization gets a private workspace with row-level data isolation.",
  },
];

const steps = [
  {
    n: "01",
    title: "Add your properties & spaces",
    body: "Create buildings, import parking spaces, and set which are assignable or reservable.",
  },
  {
    n: "02",
    title: "Assign & let residents release",
    body: "Give residents their primary space. They release it when they're away.",
  },
  {
    n: "03",
    title: "Reserve, track, report",
    body: "Neighbors and guests reserve open spaces while you watch utilization climb.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CarFront className="h-5 w-5" />
            </span>
            <span className="text-lg tracking-tight">AssetOS</span>
            <Badge variant="secondary" className="ml-1">
              ParkingOS
            </Badge>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/app/dashboard">View Demo Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 to-background" />
        <div className="container flex flex-col items-center py-24 text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 py-1">
            <Sparkles className="h-3.5 w-3.5" />
            The AI-ready OS for shared physical assets
          </Badge>
          <h1 className="max-w-4xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            AssetOS turns underused parking into managed, reservable
            infrastructure
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Start with parking. Expand to every shared physical asset. Built for
            property managers, apartment communities, offices, and military
            housing.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/app/dashboard">
                View Demo Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. Explore a fully seeded demo community.
          </p>
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="container grid gap-10 py-20 md:grid-cols-2">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            Parking is chaos managed by spreadsheets
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Unused assigned spaces sit empty while neighbors circle the block.",
              "Guest parking is an email thread and a clipboard at the gate.",
              "Complaints, towing disputes, and manual reassignments eat your week.",
              "No one can answer “how full are we, really?”",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            One private workspace for your whole community
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Every space tracked, assignable, and reservable in one place.",
              "Residents release spaces they aren't using — automatically bookable.",
              "Guest passes issued in seconds with scannable tokens.",
              "Live utilization metrics and AI-ready insights.",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Customers */}
      <section className="border-y bg-muted/30 py-14">
        <div className="container">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Built for the communities that run on shared space
          </p>
          <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {customers.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 text-center"
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Everything you need to operate shared parking
          </h2>
          <p className="mt-3 text-muted-foreground">
            A complete operating layer — designed to extend to EV chargers,
            storage, conference rooms, and beyond.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Up and running in three steps
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="relative">
                <span className="text-5xl font-bold text-primary/15">
                  {step.n}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <div className="rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground">
          <h2 className="text-3xl font-semibold tracking-tight">
            See ParkingOS with live demo data
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Explore a fully seeded community — properties, residents, releases,
            reservations, and guest passes.
          </p>
          <div className="mt-8 flex justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/app/dashboard">
                View Demo Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CarFront className="h-4 w-4" />
            <span>AssetOS — shared asset infrastructure</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AssetOS. Built for property operators.
          </p>
        </div>
      </footer>
    </div>
  );
}
