// Scaffold placeholder — proves the design system (fonts/tokens/Tailwind) is wired.
// Real routing/pages land in PLANNED.md P2 (Feed, Login, Profile, ...).
export default function App() {
  return (
    <div className="min-h-svh mx-auto max-w-[600px] px-6 py-10">
      <header className="border-b border-rule pb-6 mb-8 text-center">
        <h1 className="font-display text-2xl text-accent leading-none">
          Nebula
        </h1>
        <p className="font-body text-sm text-ink-faded mt-2 tracking-wide">
          a broadsheet for the timeline
        </p>
      </header>

      <main className="border border-rule bg-paper-raised p-6">
        <h2 className="font-heading text-xl mb-2">Scaffold running.</h2>
        <p className="font-body text-base text-ink-faded">
          apps/web is wired to the design tokens in{' '}
          <code>src/styles/tokens.css</code>. Build the real pages per{' '}
          <code>PLANNED.md</code> P2.
        </p>
      </main>
    </div>
  )
}
