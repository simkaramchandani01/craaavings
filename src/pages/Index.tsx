import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-food.jpg";
import { ChefHat, MapPin, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Your Personal Food Discovery App</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
            CRAVINGS
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Tell us what you're craving, and we'll help you satisfy it—whether you want to cook or pick up nearby.
          </p>
          
          <Link to="/discover">
            <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
              Start Your Craving Journey
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-lg bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Natural Language Input</h3>
              <p className="text-muted-foreground">
                Describe your craving naturally—we understand what you're looking for.
              </p>
            </div>

            <div className="p-8 rounded-lg bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ChefHat className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Personalized Recipes</h3>
              <p className="text-muted-foreground">
                Get recipes matched to your cooking skill level—beginner, intermediate, or advanced.
              </p>
            </div>

            <div className="p-8 rounded-lg bg-card border border-border hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Local Locations</h3>
              <p className="text-muted-foreground">
                Find nearby restaurants and grocery stores that can satisfy your craving.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
