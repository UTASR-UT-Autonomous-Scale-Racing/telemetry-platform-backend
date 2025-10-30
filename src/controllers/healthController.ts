import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function healthHandler(_req: Request, res: Response) {
  let version = 'unknown';
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const pkgPath = path.resolve(__dirname, '../../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    version = pkg.version || version;
  } catch {
    // ignore
  }

  res.json({ status: 'ok', uptime: process.uptime(), version });
}
