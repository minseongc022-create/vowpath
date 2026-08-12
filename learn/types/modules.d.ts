declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }

  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
  export default pdfParse;
}

declare module "youtube-transcript" {
  export type TranscriptItem = {
    text: string;
    offset: number;
    duration: number;
  };

  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      options?: { lang?: string },
    ): Promise<TranscriptItem[]>;
  }
}
