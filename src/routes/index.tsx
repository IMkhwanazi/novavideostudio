import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  AudioLines,
  Clapperboard,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { GENERATION_MODES } from "@/lib/video/options";

const title = "Videonova AI — Generate cinematic video from a single prompt";
const description =
  "Videonova AI turns text and images into cinematic, studio-grade video. Direct the camera, lighting and style, then render in minutes.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Type, title: "Text to video", body: "Describe the shot. Get finished footage with real camera language." },
  { icon: ImageIcon, title: "Image to video", body: "Bring a still frame to life with controlled, believable motion." },
  { icon: Clapperboard, title: "Director controls", body: "Camera moves, lighting setups, styles, aspect ratio and fps." },
  { icon: Wand2, title: "Prompt enhancement", body: "AI rewrites your idea into a cinematographer-grade shot brief." },
  { icon: Layers, title: "Project library", body: "Every render is saved privately with its full generation recipe." },
  { icon: AudioLines, title: "Sound & captions", body: "Voiceover, music and burned-in captions arriving next." },
];

function Landing() {
  const primaryHref = "/studio";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#features">Features</a>
            <a className="transition-colors hover:text-foreground" href="#modes">Modes</a>
            <a className="transition-colors hover:text-foreground" href="#how">How it works</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to={primaryHref}>Studio</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-brand text-primary-foreground glow-ring">
              <Link to={primaryHref}>Start creating</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-aura relative overflow-hidden">
          <div className="mx-auto max-w-4xl px-5 pt-24 pb-20 text-center md:pt-32">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3.5 py-1.5 text-xs tracking-wide text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" />
              Powered by frontier video models
            </span>
            <h1 className="mt-7 text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-7xl">
              Cinematic video,
              <br />
              <span className="text-gradient">generated in minutes</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Videonova AI is a creative studio for AI filmmaking. Write a prompt, direct the
              camera and lighting, and render broadcast-ready footage without a crew.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-12 bg-gradient-brand px-7 text-primary-foreground glow-ring">
                <Link to={primaryHref}>
                  Start creating free <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-7">
                <a href="#how">See how it works</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free credits included · No sign-up, no credit card
            </p>

            <div className="glass-panel glow-ring mx-auto mt-16 w-full max-w-3xl rounded-2xl p-3 text-left">
              <div className="rounded-xl border border-border/60 bg-background/60 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Prompt</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                  Slow dolly through a rain-soaked neon alley in Tokyo at night, reflections
                  rippling on wet asphalt, anamorphic lens flare, shallow depth of field,
                  cinematic teal and violet grade.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {["Cinematic", "Dolly", "Neon", "16:9 · 1080p"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-lg border border-border/60 bg-card/70 px-3 py-2 text-center text-xs text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            A studio, not a toy
          </h2>
          <p className="mt-3 max-w-lg text-muted-foreground">
            Every control a director expects, wrapped around state-of-the-art generation.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title: heading, body }) => (
              <article key={heading} className="glass-panel rounded-xl p-6 transition-colors hover:border-primary/40">
                <Icon className="size-5 text-primary" />
                <h3 className="mt-4 text-base font-medium">{heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="modes" className="mx-auto max-w-6xl px-5 pb-20">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Generation modes</h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GENERATION_MODES.map((mode) => (
              <div
                key={mode.id}
                className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/50 p-5"
              >
                <div>
                  <h3 className="text-sm font-medium">{mode.label}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{mode.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${
                    mode.available
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {mode.available ? "Live" : "Soon"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-5 pb-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { step: "01", title: "Describe the shot", body: "Write your idea, then let AI expand it into a full cinematography brief." },
              { step: "02", title: "Direct it", body: "Choose duration, aspect ratio, style, camera movement, lighting and model tier." },
              { step: "03", title: "Render & download", body: "Track progress live, preview in the studio and download the finished MP4." },
            ].map((item) => (
              <li key={item.step} className="glass-panel rounded-xl p-6">
                <span className="text-xs font-mono text-primary">{item.step}</span>
                <h3 className="mt-3 text-base font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>

          <div className="glass-panel glow-ring mt-14 rounded-2xl p-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Your first video is minutes away
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Jump straight into the studio and start generating with free credits.
            </p>
            <Button asChild size="lg" className="mt-7 h-12 bg-gradient-brand px-7 text-primary-foreground">
              <Link to={primaryHref}>
                Open the studio <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Videonova AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
