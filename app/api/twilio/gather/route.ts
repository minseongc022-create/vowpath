import { POST as intakePost } from "../intake/route";

/** Legacy webhook — delegates to verified intake (preserves POST body + signed URL path). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (!url.searchParams.has("phase")) {
    url.searchParams.set("phase", "collect");
  }
  const rawBody = await request.text();
  const forwarded = new Request(url.toString(), {
    method: "POST",
    body: rawBody,
    headers: request.headers,
  });
  return intakePost(forwarded);
}
