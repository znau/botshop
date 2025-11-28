import { cp, mkdir, rm, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDist = path.resolve(__dirname, '../../web/dist');
const workerPublic = path.resolve(__dirname, '../public');

async function sync() {
  try {
    await access(webDist);
  } catch (error) {
    throw new Error('前端构建输出不存在，请先运行 npm run build --prefix ./web');
  }

  await rm(workerPublic, { recursive: true, force: true });
  await mkdir(workerPublic, { recursive: true });
  await cp(webDist, workerPublic, { recursive: true });
  await writeFile(path.join(workerPublic, '.gitkeep'), '');
  console.log(`Synced ${webDist} -> ${workerPublic}`);
}

sync().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
