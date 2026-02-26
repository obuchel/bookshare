import { NextRequest, NextResponse } from "next/server";

// Upload to Cloudinary using Basic Auth (simpler and more reliable than manual signatures)
async function uploadToCloudinary(file: Buffer, filename: string, mimeType: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const formData = new FormData();
  // ✅ Pass the MIME type so Cloudinary can identify the file format
  formData.append("file", new Blob([new Uint8Array(file)], { type: mimeType }), filename);
  formData.append("folder", "profiles");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    // ✅ Basic Auth — no timestamp/signature needed, officially recommended for server-side uploads
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
    },
    body: formData,
  });

  if (!res.ok) {
    // ✅ Surface the actual Cloudinary error so you can see what's wrong
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cloudinary upload failed: ${err?.error?.message ?? res.statusText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

// Upload to GitHub (for book covers)
async function uploadToGitHub(file: Buffer, filename: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN!;
  const repo = process.env.GITHUB_IMAGE_REPO!;
  const path = `books/${Date.now()}-${filename}`;

  const content = file.toString("base64");

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      message: `Upload book cover: ${filename}`,
      content,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`GitHub upload failed: ${err.message}`);
  }

  const data = await res.json();
  // Return CDN URL via jsDelivr
  const [owner, repoName] = repo.split("/");
  return `https://cdn.jsdelivr.net/gh/${owner}/${repoName}@main/${path}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // "profile" or "book"

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    let url: string;
    if (type === "profile") {
      url = await uploadToCloudinary(buffer, filename, file.type);
    } else {
      url = await uploadToGitHub(buffer, filename);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
