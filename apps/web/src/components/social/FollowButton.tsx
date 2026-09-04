"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Props = {
  username: string;
  initialFollowing?: boolean;
  initialFollowers?: number;
};

export function FollowButton({
  username,
  initialFollowing = false,
  initialFollowers = 0,
}: Props) {
  const { user, accessToken } = useAuth();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.username === username) {
    return (
      <p className="text-xs" style={{ color: "var(--profile-faint)" }}>
        {followers} seguidores
      </p>
    );
  }

  const toggle = async () => {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient<{
        following: boolean;
        follower_count: number;
      }>(`/social/follow/${username}`, {
        method: following ? "DELETE" : "POST",
        token: accessToken,
      });
      setFollowing(res.following);
      setFollowers(res.follower_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el follow");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={
          following
            ? "border border-[#6d28d9]/30 bg-transparent text-[#6d28d9] hover:bg-[#6d28d9]/10"
            : "bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
        }
        variant={following ? "outline" : "default"}
      >
        {following ? "Siguiendo" : "Seguir"}
      </Button>
      <span className="text-xs" style={{ color: "var(--profile-faint)" }}>
        {followers} seguidores
      </span>
      {error ? (
        <span className="text-xs text-red-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
