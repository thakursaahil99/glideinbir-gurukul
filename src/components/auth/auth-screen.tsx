"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { BirdMark, Logo } from "@/components/brand/logo";
import { Starfield } from "@/components/landing/starfield";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { loginAction, signupAction, type AuthState } from "@/core/auth/actions";
import { useModules, useSite } from "@/core/site/site-context";

export function AuthScreen({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const isSignup = mode === "signup";
  const [show, setShow] = useState(false);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(isSignup ? signupAction : loginAction, {});
  const { brand, hero } = useSite();
  const modules = useModules();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#07061a] text-white lg:block">
        <div className="absolute top-[-20%] left-[-20%] size-[70%] animate-aurora rounded-full bg-[#8b7bff]/40 blur-[120px]" />
        <div className="absolute right-[-20%] bottom-[-20%] size-[70%] animate-aurora rounded-full bg-[#ff6b85]/30 blur-[120px]" style={{ animationDelay: "-8s" }} />
        <div className="dark absolute inset-0">
          <Starfield density={0.00018} />
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="dark">
            <Logo />
          </div>
          <div>
            <motion.div
              initial={{ x: -120, y: 60, opacity: 0, rotate: -20 }}
              animate={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <BirdMark className="w-28 drop-shadow-[0_20px_50px_rgba(139,123,255,0.6)]" />
              </motion.div>
            </motion.div>
            <h2 className="mt-8 font-display text-6xl leading-[0.92] font-extrabold tracking-tight">
              {hero.words[0]}
              <br />
              <span className="bg-gradient-to-r from-[#ffae3d] via-[#ff6b85] to-[#8b7bff] bg-clip-text text-transparent">{hero.words[1]}</span>
              <br />
              {hero.words[2]}
            </h2>
            <p className="mt-6 max-w-sm text-white/60">Seven learning worlds, one login. Your gurukul goes wherever you do.</p>
          </div>
          <div className="flex gap-2">
            {modules.map((m, i) => (
              <motion.span
                key={m.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.07 }}
                className="grid size-10 place-items-center rounded-xl"
                style={{ background: `linear-gradient(135deg, ${m.colors[0]}, ${m.colors[1]})` }}
                title={m.name}
              >
                <m.icon className="size-5" />
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="relative flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden">
            <Logo />
          </div>
          <Link href="/" className="hidden text-sm text-muted hover:text-fg lg:block">
            ← Back to home
          </Link>
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="m-auto w-full max-w-md py-12"
        >
          <h1 className="font-display text-4xl font-bold tracking-tight">{isSignup ? "Begin your flight" : "Welcome back"}</h1>
          <p className="mt-2 text-muted">{isSignup ? `Create your free ${brand.name} account.` : "Log in to continue learning."}</p>

          <form action={formAction} className="mt-8 space-y-4">
            {next && <input type="hidden" name="next" value={next} />}
            {isSignup && <Field id="name" label="Full name" autoComplete="name" defaultValue={state.name} />}
            <Field id="email" label="Email" type="email" autoComplete="email" defaultValue={state.email} />
            <div className="relative">
              <Field
                id="password"
                label="Password"
                type={show ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={isSignup ? 8 : undefined}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-1/2 right-4 -translate-y-1/2 text-muted hover:text-fg"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <button
              disabled={pending}
              className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-saffron via-rose to-primary bg-[length:200%_100%] py-4 font-semibold text-white transition-[background-position] duration-700 hover:bg-right disabled:opacity-80"
            >
              {pending ? <Loader2 className="size-5 animate-spin" /> : isSignup ? "Create account" : "Log in"}
              {!pending && <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <AnimatePresence>
            {state.error && !pending && (
              <motion.div
                key={state.error}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <p role="alert" className="mt-4 rounded-2xl border border-rose/40 bg-rose/10 p-4 text-sm">
                  {state.error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-sm text-muted">
            {isSignup ? "Already flying with us? " : `New to ${brand.name.split(" ")[0]}? `}
            <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-fg underline-offset-4 hover:underline">
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        placeholder=" "
        required
        className="peer w-full rounded-2xl border border-line bg-card px-4 pt-6 pb-2.5 outline-none transition-colors focus:border-primary"
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted transition-all peer-focus:top-4 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:text-xs"
      >
        {label}
      </label>
    </div>
  );
}
