import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Check, X } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[a-z]/, "At least one lowercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character");

const passwordRequirements = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

type Step = "email" | "verify";

interface ForgotPasswordFlowProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordFlow = ({ onBack, onSuccess }: ForgotPasswordFlowProps) => {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isPasswordValid = passwordSchema.safeParse(newPassword).success;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-reset-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      toast({
        title: "Code sent!",
        description: "Check your email for the 6-digit verification code.",
      });
      setStep("verify");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !isPasswordValid) return;
    
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, code: otp, newPassword }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset. You can now sign in.",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sign In
      </Button>

      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold">Forgot Password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email to receive a 6-digit verification code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form onSubmit={handleVerifyAndReset} className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold">Enter Verification Code</h2>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to {email}
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {newPassword && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req) => {
                  const passed = req.test(newPassword);
                  return (
                    <div
                      key={req.label}
                      className={`flex items-center gap-2 text-xs ${
                        passed ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {passed ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {req.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || otp.length !== 6 || !isPasswordValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setOtp("");
              handleSendCode({ preventDefault: () => {} } as React.FormEvent);
            }}
            disabled={isLoading}
          >
            Resend Code
          </Button>
        </form>
      )}
    </div>
  );
};