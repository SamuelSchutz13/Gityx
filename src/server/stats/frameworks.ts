import { readFile } from 'node:fs/promises';
import { GitService } from '../git/git.service';
import { confine } from '../repo/paths';
import type { Framework } from '../shared/types';

type Cat = Framework['category'];
type Known = [name: string, category: Cat];

// npm package name -> display name; prefixes end with '/'.
const NPM: Record<string, Known> = {
  react: ['React', 'framework'], next: ['Next.js', 'framework'], vue: ['Vue', 'framework'], nuxt: ['Nuxt', 'framework'],
  '@angular/core': ['Angular', 'framework'], svelte: ['Svelte', 'framework'], '@sveltejs/kit': ['SvelteKit', 'framework'],
  'solid-js': ['Solid', 'framework'], astro: ['Astro', 'framework'], '@remix-run/react': ['Remix', 'framework'],
  express: ['Express', 'framework'], '@nestjs/core': ['NestJS', 'framework'], fastify: ['Fastify', 'framework'],
  koa: ['Koa', 'framework'], hono: ['Hono', 'framework'], electron: ['Electron', 'framework'], 'react-native': ['React Native', 'framework'],
  jest: ['Jest', 'test'], vitest: ['Vitest', 'test'], mocha: ['Mocha', 'test'], '@playwright/test': ['Playwright', 'test'],
  cypress: ['Cypress', 'test'], '@testing-library/react': ['Testing Library', 'test'],
  vite: ['Vite', 'build'], webpack: ['webpack', 'build'], esbuild: ['esbuild', 'build'], rollup: ['Rollup', 'build'], turbo: ['Turborepo', 'build'],
  typescript: ['TypeScript', 'language'],
  tailwindcss: ['Tailwind CSS', 'style'], sass: ['Sass', 'style'], 'styled-components': ['styled-components', 'style'],
  '@mui/material': ['MUI', 'style'], bootstrap: ['Bootstrap', 'style'], 'radix-ui': ['Radix UI', 'style'],
  prisma: ['Prisma', 'data'], '@prisma/client': ['Prisma', 'data'], typeorm: ['TypeORM', 'data'], mongoose: ['Mongoose', 'data'],
  'drizzle-orm': ['Drizzle', 'data'], sequelize: ['Sequelize', 'data'], '@supabase/supabase-js': ['Supabase', 'data'],
  firebase: ['Firebase', 'data'], graphql: ['GraphQL', 'data'], '@apollo/client': ['Apollo', 'data'], redis: ['Redis', 'data'],
};

const GO: Record<string, Known> = {
  'github.com/gin-gonic/gin': ['Gin', 'framework'], 'github.com/labstack/echo': ['Echo', 'framework'],
  'github.com/gofiber/fiber': ['Fiber', 'framework'], 'github.com/go-chi/chi': ['chi', 'framework'], 'gorm.io/gorm': ['GORM', 'data'],
};

const PY: Record<string, Known> = {
  django: ['Django', 'framework'], flask: ['Flask', 'framework'], fastapi: ['FastAPI', 'framework'], pytest: ['pytest', 'test'],
  sqlalchemy: ['SQLAlchemy', 'data'], pandas: ['pandas', 'data'], numpy: ['NumPy', 'data'],
};

const CARGO: Record<string, Known> = {
  tokio: ['Tokio', 'framework'], 'actix-web': ['Actix Web', 'framework'], axum: ['Axum', 'framework'], rocket: ['Rocket', 'framework'], serde: ['Serde', 'data'],
};

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/^[\^~>=<v\s]+/, '').split(/[\s,]/)[0] || undefined : undefined);

export async function detectFrameworks(git: GitService): Promise<Framework[]> {
  const tracked = ((await git.tryRun(['ls-files', '-z'])) ?? '').split('\0').filter(Boolean);
  const found = new Map<string, Framework>();
  const add = (k: Known, source: string, version?: string) => {
    const prev = found.get(k[0]);
    if (!prev || (!prev.version && version)) found.set(k[0], { name: k[0], ...(version ? { version } : {}), category: k[1], source });
  };
  const read = async (p: string) => {
    try {
      return (await readFile(confine(git.root, p), 'utf8')).slice(0, 500_000);
    } catch {
      return '';
    }
  };

  // shortcut: manifests are matched by file name over tracked files and parsed loosely; enough to list the stack, not to resolve versions.
  for (const path of tracked) {
    const base = path.split('/').pop()!;
    if (base === 'package.json') {
      let pkg: any;
      try {
        pkg = JSON.parse(await read(path));
      } catch {
        continue;
      }
      const deps: Record<string, string> = { ...pkg?.devDependencies, ...pkg?.dependencies };
      for (const [dep, v] of Object.entries(deps)) if (NPM[dep]) add(NPM[dep], path, clean(v));
    } else if (base === 'go.mod') {
      const text = await read(path);
      const go = /^go\s+(\S+)/m.exec(text);
      if (go) add(['Go', 'language'], path, go[1]);
      for (const [mod, k] of Object.entries(GO)) {
        const m = new RegExp(`${mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:/v\\d+)?\\s+v?(\\S+)`).exec(text);
        if (m) add(k, path, m[1]);
      }
    } else if (/^requirements.*\.txt$/.test(base) || base === 'pyproject.toml' || base === 'Pipfile') {
      const text = (await read(path)).toLowerCase();
      for (const [pkg, k] of Object.entries(PY)) {
        const m = new RegExp(`^\\s*["']?${pkg}\\b\\s*(?:\\[[^\\]]*\\])?\\s*(?:[=~><!]=?\\s*["']?([\\w.]+))?`, 'm').exec(text);
        if (m) add(k, path, m[1]);
      }
    } else if (base === 'Cargo.toml') {
      const text = await read(path);
      add(['Rust', 'language'], path);
      for (const [crate, k] of Object.entries(CARGO)) {
        const m = new RegExp(`^${crate}\\s*=\\s*(?:"([^"]+)"|\\{[^}]*version\\s*=\\s*"([^"]+)")`, 'm').exec(text);
        if (m) add(k, path, clean(m[1] ?? m[2]));
      }
    } else if (base === 'composer.json') {
      const text = await read(path);
      if (text.includes('laravel/framework')) add(['Laravel', 'framework'], path);
      if (text.includes('symfony/')) add(['Symfony', 'framework'], path);
      add(['PHP', 'language'], path);
    } else if (base === 'Gemfile') {
      const text = await read(path);
      if (/gem\s+["']rails["']/.test(text)) add(['Rails', 'framework'], path);
      if (/gem\s+["']rspec/.test(text)) add(['RSpec', 'test'], path);
      add(['Ruby', 'language'], path);
    } else if (base === 'pom.xml' || /^build\.gradle(\.kts)?$/.test(base)) {
      const text = await read(path);
      if (text.includes('spring-boot')) add(['Spring Boot', 'framework'], path);
      add([base === 'pom.xml' ? 'Maven' : 'Gradle', 'build'], path);
    } else if (/\.(cs|fs)proj$/.test(base)) {
      const text = await read(path);
      add(['.NET', 'language'], path);
      if (/Microsoft\.NET\.Sdk\.Web|Microsoft\.AspNetCore/.test(text)) add(['ASP.NET Core', 'framework'], path);
    } else if (base === 'Dockerfile' || base.endsWith('.Dockerfile')) {
      add(['Docker', 'infra'], path);
    } else if (/^(docker-)?compose\.ya?ml$/.test(base)) {
      add(['Docker Compose', 'infra'], path);
    } else if (path.startsWith('.github/workflows/')) {
      add(['GitHub Actions', 'infra'], path);
    } else if (base === '.gitlab-ci.yml') {
      add(['GitLab CI', 'infra'], path);
    }
  }
  const order: Cat[] = ['language', 'framework', 'data', 'style', 'test', 'build', 'infra'];
  return [...found.values()].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));
}
