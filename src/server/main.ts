#!/usr/bin/env node
import 'reflect-metadata';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { parseArgs, resolveRoot } from './cli';
import { cookieName, securityMiddleware } from './security/security';

export async function createApp(root: string, port: number) {
  const token = randomBytes(24).toString('base64url');
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(root), { logger: false });
  app.disable('x-powered-by');
  // The real port is known only after binding, so the middleware reads it lazily.
  let bound = port;
  let guard = securityMiddleware(token, bound);
  app.use((req: any, res: any, next: any) => guard(req, res, next));
  const web = join(__dirname, '..', 'web');
  if (existsSync(web)) app.useStaticAssets(web);
  try {
    await app.listen(port, '127.0.0.1');
  } catch (e) {
    await app.close().catch(() => {});
    throw e;
  }
  bound = (app.getHttpServer().address() as AddressInfo).port;
  guard = securityMiddleware(token, bound);
  return { app, token, cookie: `${cookieName(bound)}=${token}`, url: `http://127.0.0.1:${bound}/?t=${token}` };
}

function openBrowser(url: string) {
  const [cmd, args] =
    process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  spawn(cmd, args as string[], { detached: true, stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
}

async function cli() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const root = await resolveRoot(args.dir);
    const { app, url } = await createApp(root, args.port);
    // Test runs live in their own process group, so Ctrl+C must cancel them explicitly (via onModuleDestroy).
    const stop = (code: number) => void app.close().finally(() => process.exit(code));
    process.once('SIGINT', () => stop(130));
    process.once('SIGTERM', () => stop(143));
    console.log(`Gityx em ${root}\n${url}\nCtrl+C para encerrar.`);
    if (args.open) openBrowser(url);
  } catch (e: any) {
    if (e?.code === 'EADDRINUSE') console.error(`Gityx: a porta ${e.port} já está em uso.`);
    else console.error(e?.message?.startsWith('Gityx:') ? e.message : `Gityx: ${e?.message ?? e}`);
    process.exit(1);
  }
}

if (require.main === module) void cli();
