import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md";
}

const StarRating = ({ rating, onRate, readonly = false, size = "md" }: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
          className={cn(
            "transition-colors",
            !readonly && "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              starSize,
              (hoverRating || rating) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
