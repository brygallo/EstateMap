/**
 * Separates the credential form from the federated sign-in button. The label
 * sits on the card background, so it must be used inside the card body.
 */
export default function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-line" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background px-3 text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
