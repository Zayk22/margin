import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <SignUp 
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