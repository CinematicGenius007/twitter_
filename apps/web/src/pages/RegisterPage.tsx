import { SignUp } from "@clerk/clerk-react";
import { Fleuron } from "../components/Ornament";
import { clerkAppearance } from "../lib/clerkAppearance";

export function RegisterPage() {
  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-xl text-ink">Take Out a Subscription</h1>
        <p className="text-xs text-ink-soft mt-1.5">Price one penny. Payable never.</p>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl="/complete-profile"
        appearance={clerkAppearance}
      />
    </div>
  );
}
