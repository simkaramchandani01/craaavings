import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import AppSidebar from "@/components/AppSidebar";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [originalIsPrivate, setOriginalIsPrivate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setCheckingAuth(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!checkingAuth && !user) {
      navigate("/auth");
    }
  }, [checkingAuth, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username, is_private")
      .eq("id", user?.id)
      .single();

    if (data && !error) {
      setUsername(data.username);
      setOriginalUsername(data.username);
      setIsPrivate(data.is_private || false);
      setOriginalIsPrivate(data.is_private || false);
    }
  };

  const validateUsername = (value: string) => {
    if (value.length === 0) {
      setUsernameError("Username is required");
      return false;
    }
    if (value.length > 12) {
      setUsernameError("Username must be 12 characters or less");
      return false;
    }
    if (!/^[a-zA-Z0-9]+$/.test(value)) {
      setUsernameError("Only letters and numbers allowed");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsername(value);
  };

  const handleSave = async () => {
    if (!validateUsername(username)) return;
    
    const usernameChanged = username !== originalUsername;
    const privacyChanged = isPrivate !== originalIsPrivate;
    
    if (!usernameChanged && !privacyChanged) {
      toast({ title: "No changes", description: "No changes to save" });
      return;
    }

    setIsSaving(true);
    try {
      // Check if username is taken (only if changed)
      if (usernameChanged) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .neq("id", user?.id)
          .maybeSingle();

        if (existing) {
          setUsernameError("Username is already taken");
          setIsSaving(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ username, is_private: isPrivate })
        .eq("id", user?.id);

      if (error) throw error;

      setOriginalUsername(username);
      setOriginalIsPrivate(isPrivate);
      toast({ title: "Saved", description: "Settings updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <SettingsIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Settings</h1>
          </div>

          <Card className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="Enter username"
                  maxLength={12}
                />
                {usernameError && (
                  <p className="text-sm text-destructive">{usernameError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Max 12 characters, letters and numbers only
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="private-profile">Private Profile</Label>
                  <p className="text-xs text-muted-foreground">
                    Only accepted friends can see your full profile
                  </p>
                </div>
                <Switch
                  id="private-profile"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={isSaving || !!usernameError}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
