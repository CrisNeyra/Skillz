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
import { CareerSidebar } from "@/components/fotolog/CareerSidebar";
import { ProfileInfoBar } from "@/components/fotolog/ProfileInfoBar";
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
        </div>

        <div className="mb-4">
          <ProfileInfoBar
            displayName={profile.display_name}
            specialty={profile.headline}
            meta={profile.location}
          />
        </div>

        {/*
          Mockup:
          formación/experiencia | imágenes izq | hero | imágenes der | contactos
        */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_0.85fr_2.2fr_0.85fr_0.9fr] lg:gap-3">
          <div className="order-3 lg:order-1">
            <CareerSidebar diplomas={data.diplomas} experiences={data.experiences} />
          </div>

          <div className="order-2 lg:order-2">
            <SideGallery side="left" items={layout.left} />
          </div>

          <div className="order-1 lg:order-3">
            <MainHeroMedia media={layout.hero} skills={skills} />
          </div>

          <div className="order-2 lg:order-4">
            <SideGallery side="right" items={layout.right} />
          </div>

          <div className="order-4 lg:order-5">
            <ContactsPanel
              linkedinUrl={profile.linkedin_url}
              githubUrl={profile.github_url}
              contactEmail={profile.contact_email}
              links={data.links}
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
