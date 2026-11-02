import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <SignIn 
        appearance={{
          variables: {
            colorPrimary: "var(--color-accent)",
            colorBackground: "var(--color-surface)",
            colorText: "var(--color-text)",
            colorInputBackground: "var(--color-surface-raised)",
            colorInputText: "var(--color-text)",
            borderRadius: "12px",
          }
        }} 
      />
    </div>
  );
}