import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  ChefHat,
  Users,
  UserPlus,
  MessageCircle,
  FolderHeart,
  Settings,
  LogOut,
  Menu,
  X,
  UsersRound,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);
  const [profile, setProfile] = useState<{ id: string; username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };
    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: User, label: "Profile", path: profile ? `/profile/${profile.id}` : "/home" },
    { icon: ChefHat, label: "Discover", path: "/discover" },
    { icon: Users, label: "Browse Communities", path: "/communities" },
    { icon: UsersRound, label: "My Communities", path: "/my-communities" },
    { icon: UserPlus, label: "Friends", path: "/friends" },
    { icon: MessageCircle, label: "Messages", path: "/friends" },
    { icon: FolderHeart, label: "Saved Items", path: "/saved" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative left-0 top-0 h-screen bg-card border-r border-border transition-all duration-300 z-40",
          isOpen ? "w-64" : "w-0 md:w-16",
          "overflow-hidden"
        )}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3 mb-8 mt-2">
            <ChefHat className="w-8 h-8 text-primary flex-shrink-0" />
            {isOpen && <span className="text-xl font-bold">CRAVINGS</span>}
          </div>

          {/* Profile */}
          {profile && (
            <div className={cn(
              "flex items-center gap-3 mb-6 p-2 rounded-lg bg-muted/50",
              !isOpen && "justify-center"
            )}>
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {isOpen && (
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{profile.username}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.path + item.label}
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  !isOpen && "justify-center px-2"
                )}
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="ml-3">{item.label}</span>}
              </Button>
            ))}
          </nav>

          {/* Sign Out */}
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-destructive hover:text-destructive",
              !isOpen && "justify-center px-2"
            )}
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {isOpen && <span className="ml-3">Sign Out</span>}
          </Button>

          {/* Collapse toggle (desktop) */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:flex mt-4 justify-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default AppSidebar;
