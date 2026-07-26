import { notFound } from "next/navigation";
import { FotologLayout } from "@/components/fotolog/FotologLayout";
import { apiServer } from "@/lib/api";
import type { ProfileBundle } from "@/types/api";

type Props = { params: Promise<{ username: string }> };

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  let data: ProfileBundle;
  try {
    data = await apiServer<ProfileBundle>(`/profiles/${username}`);
  } catch {
    notFound();
  }
  return <FotologLayout data={data} />;
}
