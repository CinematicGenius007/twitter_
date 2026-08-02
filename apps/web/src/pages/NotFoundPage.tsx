import { Link } from "react-router";
import { Postmark, Fleuron } from "../components/Ornament";

export function NotFoundPage() {
  return (
    <div className="text-center py-20">
      <Postmark label="Return to" sub="Sender" />
      <h1 className="font-display font-black text-2xl text-ink mt-6">Not in the archive</h1>
      <p className="text-sm text-ink-soft mt-2">
        This page was never set, or has since been pulped.
      </p>
      <Fleuron className="max-w-[160px] mx-auto my-6" />
      <Link to="/" className="label text-2xs text-seal hover:underline underline-offset-4">
        Back to the wire →
      </Link>
    </div>
  );
}
