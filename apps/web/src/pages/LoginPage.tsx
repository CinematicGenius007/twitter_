import { Link } from "react-router";
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
      <p className="text-2xs text-ink-faint text-center mt-4">
        No subscription yet? The paper admits new correspondents{" "}
        <Link to="/register" className="text-seal hover:underline">
          by introduction only
        </Link>
        .
      </p>
    </div>
  );
}
