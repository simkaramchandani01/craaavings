import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, UserCheck, Lock } from "lucide-react";

interface UserPreviewProps {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  isPrivate: boolean;
  stats: {
    recipesSaved: number;
    communitiesJoined: number;
    friendsCount: number;
  };
}

const UserPreviewCard = ({ username, avatarUrl, bio, isPrivate, stats }: UserPreviewProps) => {
  return (
    <Card className="p-4 mt-4">
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-lg">
            {username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{username}</h3>
            {isPrivate && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Private
              </Badge>
            )}
          </div>

          {bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bio}</p>
          )}

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats.recipesSaved}</span>
              <span className="text-muted-foreground">Saved</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats.communitiesJoined}</span>
              <span className="text-muted-foreground">Communities</span>
            </div>
            <div className="flex items-center gap-1">
              <UserCheck className="w-4 h-4 text-primary" />
              <span className="font-medium">{stats.friendsCount}</span>
              <span className="text-muted-foreground">Friends</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default UserPreviewCard;
