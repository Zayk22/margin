import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <SignUp 
        appearance={{
          variables: {
            colorPrimary: "var(--primary)",
            colorBackground: "var(--surface)",
            borderRadius: "12px",
            fontFamily: "var(--font-dm-sans), sans-serif",
          }
        }} 
      />
    </div>
  );
}