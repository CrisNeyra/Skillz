"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProfileBundle } from "@/types/api";
import { useAuth } from "@/components/providers/auth-provider";
import { buildProfileStyle, googleFontsHref } from "@/lib/theme";
import {
  MainHeroMedia,
  SideGallery,
  TopBanner,
} from "@/components/fotolog/FotologPieces";
import { ContactsPanel } from "@/components/fotolog/ContactsPanel";
import { CareerSidebar } from "@/components/fotolog/CareerSidebar";
import { ProfileInfoBar } from "@/components/fotolog/ProfileInfoBar";
import { ProfileDetails } from "@/components/feed/ProfileDetails";
import { FollowButton } from "@/components/social/FollowButton";
import { SimilarProfiles } from "@/components/social/SimilarProfiles";
import { Button } from "@/components/ui/button";

export function FotologLayout({ data }: { data: ProfileBundle }) {
  const { user } = useAuth();
  const { profile, customization, layout, skills } = data;
  const [copied, setCopied] = useState(false);
  const bundle = useMemo(() => {
    const isOwner =
      data.is_owner || (!!user && user.username === profile.username);
    return isOwner === data.is_owner ? data : { ...data, is_owner: isOwner };
  }, [data, user, profile.username]);

  useEffect(() => {
    const href = googleFontsHref(customization.font_family);
    if (!href) return;
    const id = `profile-font-${customization.font_family.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [customization.font_family]);

  const copyLink = async () => {
    const url = `${window.location.origin}/u/${profile.username}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="profile-theme min-h-screen" style={buildProfileStyle(customization)}>
      <TopBanner flyerUrl={customization.flyer_url} canUpload={bundle.is_owner} />

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
        <div className="mb-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {profile.display_name}
          </h1>
          {profile.headline ? (
            <p className="mt-0.5 text-sm md:text-base" style={{ color: "var(--profile-muted)" }}>
              {profile.headline}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <FollowButton
              username={profile.username}
              initialFollowing={Boolean(data.is_following)}
              initialFollowers={data.follower_count ?? 0}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyLink()}
              className="border-[color:var(--profile-border)] bg-transparent text-sm"
              style={{ color: "var(--profile-accent)" }}
            >
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <ProfileInfoBar
            specialty={profile.headline}
            meta={profile.location}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_0.85fr_2.2fr_0.85fr_0.9fr] lg:gap-3">
          <div className="order-3 lg:order-1">
            <CareerSidebar diplomas={data.diplomas} experiences={data.experiences} />
          </div>

          <div className="order-2 lg:order-2">
            <SideGallery side="left" items={layout.left} canUpload={bundle.is_owner} />
          </div>

          <div className="order-1 lg:order-3">
            <MainHeroMedia media={layout.hero} skills={skills} canUpload={bundle.is_owner} />
          </div>

          <div className="order-2 lg:order-4">
            <SideGallery side="right" items={layout.right} canUpload={bundle.is_owner} />
          </div>

          <div className="order-4 lg:order-5">
            <ContactsPanel
              linkedinUrl={profile.linkedin_url}
              githubUrl={profile.github_url}
              contactEmail={profile.contact_email}
              links={data.links}
              isOwner={bundle.is_owner}
            />
          </div>
        </div>

        <div className="mt-8">
          <ProfileDetails data={bundle} />
        </div>

        <SimilarProfiles username={profile.username} />
      </div>
    </section>
  );
}
