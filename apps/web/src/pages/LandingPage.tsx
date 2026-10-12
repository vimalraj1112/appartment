import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { submitLead } from "../features/leads/leads-api";
import { useInstallPrompt } from "../features/marketing/use-install-prompt";
import { useScrollProgress } from "../features/marketing/use-scroll-progress";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Icon, type IconName } from "../components/ui/icons";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER ?? "919000000000";
const WHATSAPP_TEXT = encodeURIComponent("Hi SuperLink! I'd like a demo for my apartment community.");
const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`;

const FEATURES: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: "door", title: "Visitor management", body: "QR passes, approvals, gate entry/exit and delivery tracking in one flow." },
  { icon: "credit-card", title: "Billing & payments", body: "Auto-generate maintenance bills, collect online, and issue receipts instantly." },
  { icon: "wrench", title: "Complaints", body: "Residents raise tickets with photos; staff get assigned work with live status." },
  { icon: "calendar", title: "Amenities & parking", body: "Slot-based bookings, waitlists, vehicle registry and visitor parking." },
  { icon: "megaphone", title: "Announcements & feed", body: "Broadcast notices and run a community feed with reactions and comments." },
  { icon: "alert-triangle", title: "Emergency system", body: "Hold-to-trigger alerts with live responder notifications and resolution tracking." },
  { icon: "sparkles", title: "AI assistant", body: "Ask questions about the community and get instant, role-aware answers." },
  { icon: "bar-chart", title: "Reports & analytics", body: "Track occupancy, collections, complaints and a community health score." },
];

export function LandingPage() {
  const progress = useScrollProgress();
  const { canInstall, install } = useInstallPrompt();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div
        className="fixed left-0 top-0 z-50 h-1 bg-[var(--color-primary)] transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
        aria-hidden
      />

      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)]">
              <Icon name="building" className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight">SuperLink</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-[var(--color-muted-foreground)] md:flex">
            <a href="#features" className="hover:text-[var(--color-foreground)]">Features</a>
            <a href="#how" className="hover:text-[var(--color-foreground)]">How it works</a>
            <a href="#pricing" className="hover:text-[var(--color-foreground)]">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="text-sm font-medium hover:opacity-80">Sign in</Link>
            <a href="#demo">
              <Button size="sm" className="cta-sweep">Request demo</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="landing-grid-bg border-b border-[var(--color-border)]">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-2">
          <div className="animate-fade-up space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
              <Icon name="sparkles" className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              Built for Indian apartment communities
            </span>
            <h1 className="font-display text-4xl leading-tight md:text-5xl">
              Run your apartment community from one calm dashboard.
            </h1>
            <p className="max-w-xl text-[var(--color-muted-foreground)]">
              Visitors, maintenance billing, complaints, amenities, emergency alerts and community
              announcements — SuperLink connects your committee, residents and security team.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a href="#demo">
                <Button size="lg" className="cta-sweep">
                  Request a free demo
                </Button>
              </a>
              <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline">
                  <Icon name="phone" className="h-4 w-4" />
                  Chat on WhatsApp
                </Button>
              </a>
              {canInstall && (
                <Button size="lg" variant="ghost" onClick={() => void install()}>
                  Install app
                </Button>
              )}
            </div>
          </div>

          <div className="animate-float">
            <Card className="mx-auto max-w-md">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Green Valley · Today</p>
                  <span className="rounded-full bg-[var(--color-success)]/12 px-2.5 py-0.5 text-xs text-[var(--color-success)]">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Collection rate" value="96%" />
                  <Stat label="Occupancy" value="88%" />
                  <Stat label="Open complaints" value="4" />
                  <Stat label="Visitors today" value="37" />
                </div>
                <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-muted-foreground)]">
                  Gate: pass <span className="font-medium text-[var(--color-foreground)]">A-104</span> approved · delivery
                  at Tower B lobby.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4">
          {[
            { value: "10 min", label: "to onboard a community" },
            { value: "100%", label: "online maintenance payments" },
            { value: "Live", label: "emergency alert push" },
            { value: "1 app", label: "for residents & security" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-2xl md:text-3xl">{stat.value}</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeading
          eyebrow="Everything included"
          title="One platform for the whole community"
          subtitle="Replace WhatsApp groups, paper registers and spreadsheets."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardContent className="space-y-3 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Icon name={feature.icon} className="h-5 w-5" />
                </span>
                <p className="font-medium">{feature.title}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">{feature.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <SectionHeading eyebrow="How it works" eyebrowIcon="layers" title="Live in three steps" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Set up your community", body: "Add buildings, floors and flats, then import residents." },
              { step: "2", title: "Invite your people", body: "Residents, committee members and guards join with secure invites." },
              { step: "3", title: "Run everything from one place", body: "Billing, visitors, complaints, amenities and alerts — together." },
            ].map((item) => (
              <Card key={item.step}>
                <CardContent className="space-y-3 p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)]">
                    {item.step}
                  </span>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">{item.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
        <SectionHeading eyebrow="Simple pricing" eyebrowIcon="package" title="Plans that scale with your community" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { name: "Starter", price: "₹2,999", body: "Up to 150 flats", features: ["Visitors & gate", "Billing & receipts", "Announcements"] },
            { name: "Growth", price: "₹4,999", body: "Up to 500 flats", features: ["Everything in Starter", "Amenities & parking", "AI assistant + reports"], featured: true },
            { name: "Enterprise", price: "Custom", body: "Unlimited flats", features: ["Everything in Growth", "Multi-project support", "Priority success manager"] },
          ].map((tier) => (
            <Card key={tier.name} className={tier.featured ? "border-[var(--color-primary)] shadow-lg" : undefined}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{tier.name}</p>
                  {tier.featured && (
                    <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs text-[var(--color-primary)]">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="font-display text-3xl">
                  {tier.price}
                  {tier.price !== "Custom" && (
                    <span className="text-sm font-normal text-[var(--color-muted-foreground)]"> / month</span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{tier.body}</p>
                <ul className="space-y-2 text-sm">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Icon name="check" className="h-4 w-4 text-[var(--color-success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="#demo" className="block">
                  <Button variant={tier.featured ? "primary" : "outline"} className="w-full">
                    {tier.price === "Custom" ? "Talk to us" : "Start with " + tier.name}
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="demo" className="border-t border-[var(--color-border)] bg-[var(--color-surface-muted)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="font-display text-3xl">See SuperLink on your own community data.</h2>
            <p className="text-[var(--color-muted-foreground)]">
              Tell us a little about your society and our team will walk you through a tailored demo —
              usually within one working day.
            </p>
            <ul className="space-y-3 text-sm">
              {[
                "No setup fee to get started",
                "Free migration guidance for residents",
                "Works on mobile, tablet and desktop",
              ].map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Icon name="check-circle" className="h-4 w-4 text-[var(--color-success)]" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <LeadForm />
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--color-muted-foreground)] md:flex-row">
          <div className="flex items-center gap-2">
            <Icon name="building" className="h-4 w-4" />
            <span>SuperLink Community · {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={`mailto:hello@superlink.dev`} className="hover:text-[var(--color-foreground)]">hello@superlink.app</a>
            <a href={WHATSAPP_HREF} target="_blank" rel="noreferrer" className="hover:text-[var(--color-foreground)]">
              WhatsApp
            </a>
            <Link to="/login" className="hover:text-[var(--color-foreground)]">Sign in</Link>
          </div>
        </div>
      </footer>

      <a
        href={WHATSAPP_HREF}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      >
        <Icon name="phone" className="h-6 w-6" />
      </a>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
  eyebrowIcon,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  eyebrowIcon?: IconName;
}) {
  return (
    <div className="space-y-2 text-center">
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
        {eyebrowIcon && <Icon name={eyebrowIcon} className="h-3.5 w-3.5" />}
        {eyebrow}
      </span>
      <h2 className="font-display text-3xl md:text-4xl">{title}</h2>
      {subtitle && <p className="text-[var(--color-muted-foreground)]">{subtitle}</p>}
    </div>
  );
}

function LeadForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    communityName: "",
    flats: "",
    message: "",
  });

  const create = useMutation({
    mutationFn: () =>
      submitLead({
        name: form.name,
        email: form.email,
        phone: form.phone,
        communityName: form.communityName,
        flats: form.flats ? Number(form.flats) : undefined,
        message: form.message || undefined,
      }),
  });

  if (create.isSuccess) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <Icon name="check-circle" className="h-8 w-8 text-[var(--color-success)]" />
          <p className="font-medium">Thanks — we've got your request.</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Our team will reach out shortly to schedule your demo.
          </p>
          <Button variant="outline" onClick={() => create.reset()}>
            Submit another
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate();
          }}
        >
          {create.isError && <Alert variant="destructive">{create.error.message}</Alert>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" id="name" required value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <Field label="Community name" id="communityName" required value={form.communityName} onChange={(value) => setForm({ ...form, communityName: value })} />
            <Field label="Email" id="email" type="email" required value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Phone" id="phone" required value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Field label="No. of flats" id="flats" type="number" value={form.flats} onChange={(value) => setForm({ ...form, flats: value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">Message (optional)</Label>
            <textarea
              id="message"
              rows={3}
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="w-full rounded-md border border-[var(--color-input)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            />
          </div>
          <Button type="submit" className="cta-sweep w-full" size="lg" loading={create.isPending}>
            Request my demo
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
