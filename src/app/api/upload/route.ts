import { NextRequest, NextResponse } from "next/server";

// Upload to Cloudinary (for profile images)
async function uploadToCloudinary(file: Buffer, filename: string): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;

  const timestamp = Math.round(Date.now() / 1000);
  const signature = await generateCloudinarySignature({ timestamp, folder: "profiles" }, apiSecret);

  const formData = new FormData();
  //formData.append("file", new Blob([file]), filename);
  formData.append("file", new Blob([new Uint8Array(file)]), filename);
  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);
  formData.append("folder", "profiles");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
}

// Generate Cloudinary signature
async function generateCloudinarySignature(params: Record<string, string | number>, secret: string): Promise<string> {
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const str = sortedParams + secret;
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");

    let url: string;
    if (type === "profile") {
      url = await uploadToCloudinary(buffer, filename);
    } else {
      url = await uploadToGitHub(buffer, filename);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
