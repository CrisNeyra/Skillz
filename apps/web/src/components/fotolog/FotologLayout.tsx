"use client";

import { useEffect } from "react";
import type { ProfileBundle } from "@/types/api";
import { buildProfileStyle, googleFontsHref } from "@/lib/theme";
import {
  MainHeroMedia,
  SideGallery,
  TopBanner,
} from "@/components/fotolog/FotologPieces";
import { ContactsPanel } from "@/components/fotolog/ContactsPanel";
import { ProfileDetails } from "@/components/feed/ProfileDetails";

export function FotologLayout({ data }: { data: ProfileBundle }) {
  const { profile, customization, layout, skills } = data;

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

  return (
    <section className="profile-theme min-h-screen" style={buildProfileStyle(customization)}>
      <TopBanner flyerUrl={customization.flyer_url} />
      <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-8">
        <div className="mb-5 text-center md:mb-7">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {profile.display_name}
          </h1>
          {profile.headline ? (
            <p className="mt-1 text-base md:text-lg" style={{ color: "var(--profile-muted)" }}>
              {profile.headline}
            </p>
          ) : null}
          <p className="mt-1 text-sm" style={{ color: "var(--profile-faint)" }}>
            @{profile.username}
          </p>
        </div>

        {/* izquierda: galería | centro: hero | derecha: contactos */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_3fr_1fr] md:gap-4">
          <div className="order-2 md:order-1">
            <SideGallery side="left" items={layout.left} />
          </div>
          <div className="order-1 md:order-2">
            <MainHeroMedia media={layout.hero} skills={skills} />
          </div>
          <div className="order-3">
            <ContactsPanel
              linkedinUrl={profile.linkedin_url}
              githubUrl={profile.github_url}
              contactEmail={profile.contact_email}
              isOwner={data.is_owner}
            />
          </div>
        </div>

        <div className="mt-8">
          <ProfileDetails data={data} />
        </div>
      </div>
    </section>
  );
}
