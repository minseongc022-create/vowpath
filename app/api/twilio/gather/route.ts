import { POST as intakePost } from "../intake/route";

/** Legacy webhook — delegates to verified intake (preserves POST body). */
export async function POST(request: Request) {
  const url = new URL(request.url);
  url.pathname = "/api/twilio/intake";
  if (!url.searchParams.has("phase")) {
    url.searchParams.set("phase", "collect");
  }
  const rawBody = await request.text();
  const forwarded = new Request(url, {
    method: "POST",
    body: rawBody,
    headers: request.headers,
  });
  return intakePost(forwarded);
}
