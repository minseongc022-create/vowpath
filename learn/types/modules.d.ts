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

declare module "@distube/ytdl-core" {
  import { Readable } from "node:stream";

  namespace ytdl {
    interface downloadOptions {
      quality?: string;
      filter?: string;
      range?: { start?: number; end?: number };
    }
  }

  function validateURL(url: string): boolean;
  function getInfo(url: string): Promise<{
    videoDetails: { lengthSeconds: string; title: string };
  }>;
  default function ytdl(url: string, options?: ytdl.downloadOptions): Readable;
}
