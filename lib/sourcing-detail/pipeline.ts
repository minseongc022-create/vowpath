import { scrapeListing } from "./fetch-listing";
import { matchReferenceToListing } from "./vision-match";
import { generateProductAngles } from "./vision-generate";
import { buildDetailPageHtml } from "./detail-layout";
import type { PipelineResult } from "./types";

export async function runSourcingPipeline(params: {
  url: string;
  referenceImageBase64: string;
  referenceMime?: string;
  generateAngles?: boolean;
  maxAngles?: number;
}): Promise<PipelineResult> {
  const listing = await scrapeListing(params.url);

  const match = await matchReferenceToListing({
    referenceImageBase64: params.referenceImageBase64,
    referenceMime: params.referenceMime,
    images: listing.images,
    skuOptions: listing.skuOptions,
    title: listing.title,
  });

  let generatedAngles: PipelineResult["generatedAngles"] = [];
  if (params.generateAngles) {
    const description =
      match.referenceDescription ||
      listing.title ||
      "import product matching reference photo";

    generatedAngles = await generateProductAngles({
      productDescription: description,
      referenceImageBase64: params.referenceImageBase64,
      referenceMime: params.referenceMime,
      maxAngles: params.maxAngles ?? 3,
    });
  }

  const detailPageHtml = buildDetailPageHtml({
    listing,
    match,
    angles: generatedAngles,
  });

  return {
    listing,
    match,
    generatedAngles,
    detailPageHtml,
  };
}
