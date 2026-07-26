import { apiClient, API_PUBLIC_URL } from "@/lib/api";
import type { MediaOut } from "@/types/api";

type SignResponse = {
  provider?: "cloudinary" | "local";
  timestamp?: number;
  signature?: string;
  folder?: string;
  api_key?: string;
  cloud_name?: string;
  slot?: string;
};

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function assertAllowedFile(slot: string, file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const isImage =
    IMAGE_TYPES.includes(type) ||
    /\.(png|jpe?g|webp|gif)$/i.test(name);
  const isVideo =
    VIDEO_TYPES.includes(type) ||
    /\.(mp4|webm|mov)$/i.test(name);

  if (slot === "flyer" || slot === "bg") {
    if (!isImage) {
      throw new Error("El flyer solo acepta PNG o JPG.");
    }
    return;
  }
  if (!isImage && !isVideo) {
    throw new Error("Formato no soportado. Usá PNG, JPG o MP4.");
  }
}

async function uploadLocal(
  token: string,
  slot: string,
  file: File,
): Promise<{ url: string; media?: MediaOut; slot: string }> {
  const form = new FormData();
  form.append("slot", slot);
  form.append("file", file);
  const res = await fetch(`${API_PUBLIC_URL}/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    let detail = "Upload falló";
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : detail;
    } catch {
      /* ignore */
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return { url: data.url, media: data.id ? data : undefined, slot };
}

async function uploadToCloudinary(file: File, sign: SignResponse) {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sign.api_key!);
  form.append("timestamp", String(sign.timestamp));
  form.append("signature", sign.signature!);
  form.append("folder", sign.folder!);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sign.cloud_name}/auto/upload`,
    { method: "POST", body: form },
  );
  if (!res.ok) throw new Error("Falló el upload a Cloudinary");
  return res.json() as Promise<{
    secure_url: string;
    public_id: string;
    resource_type: string;
  }>;
}

/**
 * Sube media desde Home. Preferí upload directo local (sin /sign)
 * para evitar 401 intermedios; si hay Cloudinary, usa firma.
 */
export async function uploadMediaSlot(
  token: string,
  slot: string,
  file: File,
  getFreshToken?: () => Promise<string>,
): Promise<{ url: string; media?: MediaOut; slot: string }> {
  assertAllowedFile(slot, file);

  const run = async (access: string) => {
    // Consulta liviana: si no hay Cloudinary, subimos directo
    let provider: "local" | "cloudinary" = "local";
    try {
      const status = await apiClient<{ provider: "local" | "cloudinary" }>("/media/status");
      provider = status.provider;
    } catch {
      provider = "local";
    }

    if (provider === "local") {
      return uploadLocal(access, slot, file);
    }

    const sign = await apiClient<SignResponse>(
      `/media/sign?slot=${encodeURIComponent(slot)}`,
      { method: "POST", token: access },
    );

    if (sign.provider === "local" || !sign.signature) {
      return uploadLocal(access, slot, file);
    }

    const uploaded = await uploadToCloudinary(file, sign);
    if (slot === "flyer" || slot === "bg") {
      const patch =
        slot === "flyer"
          ? { flyer_url: uploaded.secure_url, flyer_public_id: uploaded.public_id }
          : { bg_image_url: uploaded.secure_url };
      await apiClient("/profiles/me/customization", {
        method: "PATCH",
        token: access,
        body: JSON.stringify(patch),
      });
      return { url: uploaded.secure_url, slot };
    }

    const media = await apiClient<MediaOut>("/media/confirm", {
      method: "POST",
      token: access,
      body: JSON.stringify({
        cloudinary_public_id: uploaded.public_id,
        url: uploaded.secure_url,
        media_type: uploaded.resource_type === "video" ? "video" : "image",
        slot,
      }),
    });
    return { url: media.url, media, slot };
  };

  try {
    return await run(token);
  } catch (err) {
    const status = (err as { status?: number }).status;
    const msg = err instanceof Error ? err.message : "";
    const authFail =
      status === 401 ||
      /token inválido|no autenticado|sesión expirada/i.test(msg);
    if (authFail && getFreshToken) {
      const fresh = await getFreshToken();
      return run(fresh);
    }
    throw err;
  }
}
