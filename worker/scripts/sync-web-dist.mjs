import { cp, mkdir, rm, access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 用户端商城
const shopDist = path.resolve(__dirname, '../../web/dist');
// 管理后台
const adminDist = path.resolve(__dirname, '../../admin-web/dist');
// Worker public 目录
const workerPublic = path.resolve(__dirname, '../public');

async function sync() {
  // 检查用户端构建输出
  try {
    await access(shopDist);
  } catch (error) {
    throw new Error('用户端构建输出不存在，请先运行: npm run build --prefix ./web');
  }

  // 检查管理后台构建输出
  try {
    await access(adminDist);
  } catch (error) {
    throw new Error('管理后台构建输出不存在，请先运行: npm run build --prefix ./admin-web');
  }

  // 清空并重建 public 目录
  await rm(workerPublic, { recursive: true, force: true });
  await mkdir(workerPublic, { recursive: true });

  // 复制用户端到 public 根目录
  console.log('复制用户端商城...');
  await cp(shopDist, workerPublic, { recursive: true });

  // 复制管理后台到 public/admin 目录
  console.log('复制管理后台...');
  const adminPublic = path.join(workerPublic, 'admin');
  await mkdir(adminPublic, { recursive: true });
  await cp(adminDist, adminPublic, { recursive: true });

  await writeFile(path.join(workerPublic, '.gitkeep'), '');
  
  console.log('✓ 用户端: ' + shopDist + ' -> ' + workerPublic);
  console.log('✓ 管理后台: ' + adminDist + ' -> ' + adminPublic);
  console.log('✓ 同步完成！');
}

sync().catch((error) => {
  console.error('错误: ' + (error.message ?? error));
  process.exit(1);
});

