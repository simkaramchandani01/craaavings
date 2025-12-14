import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { ChefHat, Users, LogOut, FolderHeart } from "lucide-react";

const Home = () => {
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const navigate = useNavigate();

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-end mb-8">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">CRAVINGS</h1>
            <p className="text-xl text-muted-foreground">
              What would you like to do today?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link to="/discover" className="block">
              <div className="p-8 rounded-lg bg-card border border-border hover:shadow-lg hover:border-primary/50 transition-all h-full">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <ChefHat className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-center mb-3">Discover Recipes</h2>
                <p className="text-muted-foreground text-center">
                  Tell us your craving and get personalized recipes or find nearby pickup spots.
                </p>
              </div>
            </Link>

            <Link to="/communities" className="block">
              <div className="p-8 rounded-lg bg-card border border-border hover:shadow-lg hover:border-primary/50 transition-all h-full">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-center mb-3">Browse Communities</h2>
                <p className="text-muted-foreground text-center">
                  Join communities, share recipes, and connect with fellow food lovers.
                </p>
              </div>
            </Link>
          </div>

          <div className="text-center">
            <Link to="/saved">
              <Button variant="outline" size="lg">
                <FolderHeart className="w-4 h-4 mr-2" />
                My Saved Items
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
