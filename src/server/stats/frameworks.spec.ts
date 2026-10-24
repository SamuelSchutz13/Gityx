import { detectFrameworks } from './frameworks';
import { GitService } from '../git/git.service';
import { makeRepo } from '../../../test/helpers/temp-repo';

describe('detectFrameworks', () => {
  it('reads manifests from several ecosystems', async () => {
    const repo = await makeRepo();
    repo.write('package.json', JSON.stringify({
      dependencies: { react: '^19.1.0', '@nestjs/core': '11.0.0', tailwindcss: '~4.1.0', '@prisma/client': '6.0.0' },
      devDependencies: { jest: '^30.0.0', vite: '^8.0.0', typescript: '5.9.3' },
    }));
    repo.write('api/go.mod', 'module x\n\ngo 1.22\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.10.0\n)\n');
    repo.write('ml/requirements.txt', 'Django==5.0\npytest>=8\n');
    repo.write('Dockerfile', 'FROM node:22\n');
    repo.write('.github/workflows/ci.yml', 'on: push\n');
    repo.write('node_modules/vue/package.json', '{}'); // untracked noise must not count
    await repo.git('add', 'package.json', 'api', 'ml', 'Dockerfile', '.github');
    await repo.git('commit', '-q', '-m', 'init');

    const found = await detectFrameworks(new GitService(repo.dir));
    const byName = Object.fromEntries(found.map((f) => [f.name, f]));
    expect(byName.React).toEqual({ name: 'React', version: '19.1.0', category: 'framework', source: 'package.json' });
    expect(byName.NestJS).toMatchObject({ version: '11.0.0', category: 'framework' });
    expect(byName['Tailwind CSS']).toMatchObject({ version: '4.1.0', category: 'style' });
    expect(byName.Prisma).toMatchObject({ category: 'data' });
    expect(byName.Jest).toMatchObject({ category: 'test' });
    expect(byName.Vite).toMatchObject({ category: 'build' });
    expect(byName.TypeScript).toMatchObject({ category: 'language', version: '5.9.3' });
    expect(byName.Go).toMatchObject({ category: 'language', version: '1.22', source: 'api/go.mod' });
    expect(byName.Gin).toMatchObject({ version: '1.10.0', category: 'framework' });
    expect(byName.Django).toMatchObject({ version: '5.0', category: 'framework' });
    expect(byName.pytest).toMatchObject({ category: 'test' });
    expect(byName.Docker).toMatchObject({ category: 'infra', source: 'Dockerfile' });
    expect(byName['GitHub Actions']).toMatchObject({ category: 'infra' });
    expect(byName.Vue).toBeUndefined();
    repo.cleanup();
  });

  it('returns [] for a repo without manifests', async () => {
    const repo = await makeRepo();
    expect(await detectFrameworks(new GitService(repo.dir))).toEqual([]);
    repo.cleanup();
  });
});
