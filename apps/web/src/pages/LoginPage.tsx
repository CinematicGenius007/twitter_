import { SignIn } from "@clerk/clerk-react";
import { Fleuron } from "../components/Ornament";
import { clerkAppearance } from "../lib/clerkAppearance";

export function LoginPage() {
  return (
    <div className="max-w-sm mx-auto py-8">
      <div className="text-center mb-6">
        <h1 className="font-display font-black text-xl text-ink">Subscribers' Entrance</h1>
        <Fleuron className="max-w-[140px] mx-auto mt-3" />
      </div>
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        forceRedirectUrl="/"
        appearance={clerkAppearance}
      />
    </div>
  );
}
