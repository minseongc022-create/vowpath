import { scrapeListing } from "./fetch-listing";
import { matchReferenceToListing } from "./vision-match";
import { generateProductAngles, countSuccessfulAngles } from "./vision-generate";
import { buildDetailPageHtml } from "./detail-layout";
import { analyzeProduct } from "./product-analysis";
import { researchCompetitors } from "./competitor-research";
import { generateDetailCopy } from "./detail-copy";
import { extractProductIdentity } from "./product-identity";
import { resolveDesignToolkit } from "./design-toolkit";
import { generateListingThumbnails } from "./thumbnail-generate";
import type { DetailPageBundle, MatchCandidate, PipelineResult } from "./types";

export async function runMatchPhase(params: {
  url: string;
  referenceImageBase64: string;
  referenceMime?: string;
  pasteText?: string;
}): Promise<Pick<PipelineResult, "listing" | "match">> {
  const listing = await scrapeListing(params.url, { pasteText: params.pasteText ?? params.url });
  const match = await matchReferenceToListing({
    referenceImageBase64: params.referenceImageBase64,
    referenceMime: params.referenceMime,
    images: listing.images,
    skuOptions: listing.skuOptions,
    title: listing.titleKo ?? listing.title,
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

async function buildDetailBundle(params: {
  referenceImageBase64: string;
  referenceMime?: string;
  listingTitle?: string;
  referenceDescription?: string;
  skuLabel?: string;
}): Promise<DetailPageBundle> {
  const analysis = await analyzeProduct({
    referenceImageBase64: params.referenceImageBase64,
    referenceMime: params.referenceMime,
    title: params.listingTitle,
    referenceDescription: params.referenceDescription,
  });

  const competitorInsight = await researchCompetitors({
    analysis,
    listingTitle: params.listingTitle,
  });

  const designToolkit = resolveDesignToolkit(analysis);

  const detailCopy = await generateDetailCopy({
    analysis,
    insights: competitorInsight,
    toolkit: designToolkit,
    skuLabel: params.skuLabel,
    listingTitle: params.listingTitle,
  });

  return { productAnalysis: analysis, competitorInsight, detailCopy, designToolkit };
}

export async function runGeneratePhase(params: {
  listing: PipelineResult["listing"];
  match: PipelineResult["match"];
  selectedCandidate: MatchCandidate;
  referenceImageBase64: string;
  referenceMime?: string;
  maxAngles?: number;
  generateThumbnails?: boolean;
}): Promise<
  Pick<PipelineResult, "generatedAngles" | "thumbnails" | "detailPageHtml" | "detailBundle"> & {
    successCount: number;
    thumbnailSuccessCount: number;
  }
> {
  const match = {
    ...params.match,
    bestMatch: params.selectedCandidate,
  };

  const description =
    params.match.referenceDescription ||
    params.listing.title ||
    "import product matching reference photo";

  const listingImageBase64 = await fetchUrlAsBase64(params.selectedCandidate.imageUrl);

  const [detailBundle, identity] = await Promise.all([
    buildDetailBundle({
      referenceImageBase64: params.referenceImageBase64,
      referenceMime: params.referenceMime,
      listingTitle: params.listing.title,
      referenceDescription: params.match.referenceDescription,
      skuLabel: params.selectedCandidate.skuLabel,
    }),
    extractProductIdentity({
      referenceImageBase64: params.referenceImageBase64,
      referenceMime: params.referenceMime,
      referenceDescription: params.match.referenceDescription,
    }),
  ]);

  const productDescription = [
    detailBundle.productAnalysis.productNameKo,
    identity.summaryKo,
    description,
  ]
    .filter(Boolean)
    .join(" — ");

  const generatedAngles = await generateProductAngles({
    identity,
    productDescription,
    userReferenceBase64: params.referenceImageBase64,
    userReferenceMime: params.referenceMime,
    listingImageBase64: listingImageBase64 ?? undefined,
    maxAngles: params.maxAngles ?? 3,
  });

  let thumbnails: PipelineResult["thumbnails"] = [];
  if (params.generateThumbnails !== false) {
    thumbnails = await generateListingThumbnails({
      analysis: detailBundle.productAnalysis,
      identity,
      productImageBase64: params.referenceImageBase64,
      productMime: params.referenceMime,
      sellingPoints: [
        ...detailBundle.productAnalysis.sellingPoints,
        ...detailBundle.detailCopy.featureBullets.slice(0, 3),
      ],
      count: 3,
    });
  }

  const detailPageHtml = buildDetailPageHtml({
    listing: params.listing,
    match,
    angles: generatedAngles,
    analysis: detailBundle.productAnalysis,
    copy: detailBundle.detailCopy,
    insights: detailBundle.competitorInsight,
    thumbnails,
    toolkit: detailBundle.designToolkit,
  });

  return {
    generatedAngles,
    thumbnails,
    detailPageHtml,
    detailBundle,
    successCount: countSuccessfulAngles(generatedAngles),
    thumbnailSuccessCount: (thumbnails ?? []).filter((t) => t.imageBase64).length,
  };
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
  let thumbnails: PipelineResult["thumbnails"] = [];
  let detailPageHtml = buildDetailPageHtml({ listing, match, angles: [] });
  let detailBundle: DetailPageBundle | undefined;

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
      thumbnails = gen.thumbnails;
      detailPageHtml = gen.detailPageHtml;
      detailBundle = gen.detailBundle;
    }
  }

  return { listing, match, generatedAngles, thumbnails, detailPageHtml, detailBundle };
}

export { countSuccessfulAngles };
