import { Request, Response } from 'express';
import { analyzeImageScam, analyzeTextScam, analyzeCombinedScam } from '../services/grokService.js';

export const detectScam = async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const file = req.file;

    if (!text && !file) {
      return res.status(400).json({ error: 'Neither text nor image provided for analysis' });
    }

    let analysis;

    if (text && file) {
      analysis = await analyzeCombinedScam(text, file.buffer, file.mimetype);
    } else if (file) {
      analysis = await analyzeImageScam(file.buffer, file.mimetype);
    } else if (text) {
      analysis = await analyzeTextScam(text);
    }

    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error('Controller Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
