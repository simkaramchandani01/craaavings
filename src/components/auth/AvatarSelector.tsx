import { cn } from "@/lib/utils";
import chefCat from "@/assets/avatars/chef-cat.png";
import chefDog from "@/assets/avatars/chef-dog.png";
import chefBear from "@/assets/avatars/chef-bear.png";
import chefRabbit from "@/assets/avatars/chef-rabbit.png";
import chefFox from "@/assets/avatars/chef-fox.png";
import chefPenguin from "@/assets/avatars/chef-penguin.png";

export const avatarOptions = [
  { id: "chef-cat", src: chefCat, name: "Chef Cat" },
  { id: "chef-dog", src: chefDog, name: "Chef Dog" },
  { id: "chef-bear", src: chefBear, name: "Chef Bear" },
  { id: "chef-rabbit", src: chefRabbit, name: "Chef Rabbit" },
  { id: "chef-fox", src: chefFox, name: "Chef Fox" },
  { id: "chef-penguin", src: chefPenguin, name: "Chef Penguin" },
];

interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelect: (avatarSrc: string) => void;
}

export const AvatarSelector = ({ selectedAvatar, onSelect }: AvatarSelectorProps) => {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Choose your chef avatar</p>
      <div className="grid grid-cols-3 gap-3">
        {avatarOptions.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.src)}
            className={cn(
              "relative rounded-lg p-1 transition-all hover:scale-105",
              selectedAvatar === avatar.src
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "hover:ring-1 hover:ring-muted-foreground/30"
            )}
          >
            <img
              src={avatar.src}
              alt={avatar.name}
              className="w-full h-auto rounded-md"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
