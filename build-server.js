import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildServer() {
  try {
    // Create a temporary directory for the build
    const tempDir = path.join(__dirname, 'temp-build');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    // Copy server files to temp directory, excluding vite.ts
    const serverDir = path.join(__dirname, 'server');
    const files = fs.readdirSync(serverDir);
    
    for (const file of files) {
      if (file !== 'vite.ts') { // Exclude vite.ts file
        const sourcePath = path.join(serverDir, file);
        const destPath = path.join(tempDir, file);
        
        if (fs.statSync(sourcePath).isDirectory()) {
          // Copy directory recursively
          fs.mkdirSync(destPath, { recursive: true });
          copyDirRecursive(sourcePath, destPath);
        } else if (file === 'index.ts') {
          // Create a production version of index.ts
          let content = fs.readFileSync(sourcePath, 'utf8');
          // Replace the conditional import with production-only imports
          content = content.replace(
            /\/\/ Import appropriate module based on environment[\s\S]*?} else {[\s\S]*?}/,
            `// Production imports only
const productionModule = await import("./production");
const serveStatic = productionModule.serveStatic;
const log = productionModule.log;`
          );
          fs.writeFileSync(destPath, content);
        } else {
          // Copy file
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }

    // Copy shared directory
    const sharedDir = path.join(__dirname, 'shared');
    if (fs.existsSync(sharedDir)) {
      const sharedDest = path.join(tempDir, 'shared');
      fs.mkdirSync(sharedDest, { recursive: true });
      copyDirRecursive(sharedDir, sharedDest);
    }

    // Build from temp directory
    await build({
      entryPoints: [path.join(tempDir, 'index.ts')],
      bundle: true,
      platform: 'node',
      format: 'esm',
      outdir: 'dist',
      external: ['vite', '@vitejs/plugin-react', '@replit/vite-plugin-runtime-error-modal', '@replit/vite-plugin-cartographer'],
      packages: 'external',
      target: 'node18',
    });

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log('Server build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

function copyDirRecursive(src, dest) {
  const files = fs.readdirSync(src);
  
  for (const file of files) {
    const sourcePath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

buildServer();
