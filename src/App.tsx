import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Saved from "./pages/Saved";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Communities from "./pages/Communities";
import MyCommunities from "./pages/MyCommunities";
import CommunityDetail from "./pages/CommunityDetail";
import Friends from "./pages/Friends";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/home" element={<Home />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/my-communities" element={<MyCommunities />} />
          <Route path="/community/:slug" element={<CommunityDetail />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/chat/:friendId" element={<Chat />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
