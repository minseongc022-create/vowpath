import { scrapeListing } from "./fetch-listing";
import { matchReferenceToListing } from "./vision-match";
import { generateProductAngles } from "./vision-generate";
import { buildDetailPageHtml } from "./detail-layout";
import type { MatchCandidate, PipelineResult } from "./types";

export async function runMatchPhase(params: {
  url: string;
  referenceImageBase64: string;
  referenceMime?: string;
}): Promise<Pick<PipelineResult, "listing" | "match">> {
  const listing = await scrapeListing(params.url);
  const match = await matchReferenceToListing({
    referenceImageBase64: params.referenceImageBase64,
    referenceMime: params.referenceMime,
    images: listing.images,
    skuOptions: listing.skuOptions,
    title: listing.title,
  });
  return { listing, match };
}

async function fetchUrlAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "MatchCut/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.toString("base64");
  } catch {
    return null;
  }
}

export async function runGeneratePhase(params: {
  listing: PipelineResult["listing"];
  match: PipelineResult["match"];
  selectedCandidate: MatchCandidate;
  referenceImageBase64: string;
  referenceMime?: string;
  maxAngles?: number;
}): Promise<Pick<PipelineResult, "generatedAngles" | "detailPageHtml">> {
  const match = {
    ...params.match,
    bestMatch: params.selectedCandidate,
  };

  const description =
    params.match.referenceDescription ||
    params.listing.title ||
    "import product matching reference photo";

  // Prefer listing matched image + user reference for generation fidelity
  const matchedB64 = await fetchUrlAsBase64(params.selectedCandidate.imageUrl);
  const refForGen = matchedB64 ?? params.referenceImageBase64;

  const generatedAngles = await generateProductAngles({
    productDescription: description,
    referenceImageBase64: refForGen,
    referenceMime: params.referenceMime,
    maxAngles: params.maxAngles ?? 3,
  });

  const detailPageHtml = buildDetailPageHtml({
    listing: params.listing,
    match,
    angles: generatedAngles,
  });

  return { generatedAngles, detailPageHtml };
}

export async function runSourcingPipeline(params: {
  url: string;
  referenceImageBase64: string;
  referenceMime?: string;
  generateAngles?: boolean;
  maxAngles?: number;
  selectedCandidate?: MatchCandidate;
}): Promise<PipelineResult> {
  const { listing, match } = await runMatchPhase(params);

  let generatedAngles: PipelineResult["generatedAngles"] = [];
  let detailPageHtml = buildDetailPageHtml({ listing, match, angles: [] });

  if (params.generateAngles) {
    const candidate = params.selectedCandidate ?? match.bestMatch;
    if (candidate) {
      const gen = await runGeneratePhase({
        listing,
        match,
        selectedCandidate: candidate,
        referenceImageBase64: params.referenceImageBase64,
        referenceMime: params.referenceMime,
        maxAngles: params.maxAngles,
      });
      generatedAngles = gen.generatedAngles;
      detailPageHtml = gen.detailPageHtml;
    }
  }

  return { listing, match, generatedAngles, detailPageHtml };
}
