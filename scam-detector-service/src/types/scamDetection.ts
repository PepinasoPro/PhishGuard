export interface ScamDetectionResponse {
  isScam: boolean;
  confidenceScore: number;
  detectedPatterns: string[];
  justification: string;
}
