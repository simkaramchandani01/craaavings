import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, BookOpen, Users, UserCheck, Lock, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import AppSidebar from "@/components/AppSidebar";
import AddProfilePostDialog from "@/components/AddProfilePostDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  is_private: boolean;
  created_at: string;
}

interface ProfileStats {
  recipesSaved: number;
  communitiesJoined: number;
  friendsCount: number;
}

interface ProfilePost {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  saved_recipe_id: string | null;
  saved_recipe?: {
    title: string;
  } | null;
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ recipesSaved: 0, communitiesJoined: 0, friendsCount: 0 });
  const [profilePosts, setProfilePosts] = useState<ProfilePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canViewGallery, setCanViewGallery] = useState(false);
  const [isFriend, setIsFriend] = useState(false);
  const [showAddPostDialog, setShowAddPostDialog] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setCurrentUser(session.user);
      await loadProfile(session.user.id);
    };

    checkAuth();
  }, [userId, navigate]);

  const loadProfile = async (currentUserId: string) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio, is_private, created_at")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as ProfileData);

      const isOwnProfile = currentUserId === userId;

      // Check friendship status if not own profile
      let isAcceptedFriend = false;
      if (!isOwnProfile) {
        const { data: friendship } = await supabase
          .from("friendships")
          .select("status")
          .or(`and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`)
          .eq("status", "accepted")
          .maybeSingle();

        isAcceptedFriend = !!friendship;
        setIsFriend(isAcceptedFriend);

        // Determine if can view gallery
        const profileIsPrivate = (profileData as any).is_private;
        setCanViewGallery(!profileIsPrivate || isAcceptedFriend);
      } else {
        setCanViewGallery(true);
      }

      // Get stats
      const { count: savedCount } = await supabase
        .from("saved_recipes")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: communitiesCount } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Get friends count (accepted friendships where user is either sender or receiver)
      const { count: friendsCount } = await supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
        .eq("status", "accepted");

      setStats({
        recipesSaved: savedCount || 0,
        communitiesJoined: communitiesCount || 0,
        friendsCount: friendsCount || 0,
      });

      // Load profile posts if can view gallery
      if (isOwnProfile || !profileData.is_private || isAcceptedFriend) {
        await loadProfilePosts();
      }
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProfilePosts = async () => {
    if (!userId) return;

    const { data: posts } = await supabase
      .from("profile_posts")
      .select(`
        id,
        image_url,
        caption,
        created_at,
        saved_recipe_id
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    // Fetch saved recipe titles for posts that have them
    const postsWithRecipes = await Promise.all(
      (posts || []).map(async (post) => {
        if (post.saved_recipe_id) {
          const { data: recipe } = await supabase
            .from("saved_recipes")
            .select("title")
            .eq("id", post.saved_recipe_id)
            .single();
          return { ...post, saved_recipe: recipe };
        }
        return { ...post, saved_recipe: null };
      })
    );

    setProfilePosts(postsWithRecipes);
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;

    try {
      const { error } = await supabase
        .from("profile_posts")
        .delete()
        .eq("id", postToDelete);

      if (error) throw error;

      toast({ title: "Post deleted" });
      setPostToDelete(null);
      await loadProfilePosts();
    } catch (error: any) {
      toast({
        title: "Error deleting post",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex">
        <AppSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-2">User not found</h2>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Profile Header */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
                <h1 className="text-3xl font-bold">{profile.username}</h1>
                {profile.is_private && (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>

              {profile.bio && (
                <p className="text-muted-foreground mb-4">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex gap-6 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats.recipesSaved}</span>
                  <span className="text-muted-foreground text-sm">Saved</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats.communitiesJoined}</span>
                  <span className="text-muted-foreground text-sm">Communities</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{stats.friendsCount}</span>
                  <span className="text-muted-foreground text-sm">Friends</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Image Gallery */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Posts</h2>
            {isOwnProfile && (
              <Button onClick={() => setShowAddPostDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Post
              </Button>
            )}
          </div>

          {!canViewGallery && profile.is_private ? (
            <Card className="p-12 text-center">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Private Profile</h3>
              <p className="text-muted-foreground">
                {isFriend 
                  ? "This user's profile is private."
                  : "Add this user as a friend to see their posts."}
              </p>
            </Card>
          ) : profilePosts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                {isOwnProfile 
                  ? "No posts yet. Add your first post!" 
                  : "No posts yet."}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {profilePosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square relative rounded-lg overflow-hidden group"
                >
                  <img
                    src={post.image_url}
                    alt={post.caption || "Profile post"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    {post.saved_recipe && (
                      <Badge variant="secondary" className="w-fit mb-1 text-xs">
                        {post.saved_recipe.title}
                      </Badge>
                    )}
                    {post.caption && (
                      <p className="text-sm line-clamp-2">{post.caption}</p>
                    )}
                    {isOwnProfile && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPostToDelete(post.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Post Dialog */}
        <AddProfilePostDialog
          open={showAddPostDialog}
          onOpenChange={setShowAddPostDialog}
          onPostCreated={loadProfilePosts}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this post? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePost}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Profile;
