import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = 'E:\\Desktop\\Puzzle number game';
const pluginRoot = path.resolve(projectRoot, 'Understand-Anything', 'understand-anything-plugin');

let core;
try {
  core = await import(pathToFileURL(path.resolve(pluginRoot, 'packages/core/dist/index.js')).href);
} catch (err) {
  console.error('Failed to import core:', err);
  process.exit(1);
}

const { validateGraph } = core;
const graphPath = path.resolve(projectRoot, '.understand-anything', 'knowledge-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));

const result = validateGraph(graph);
console.log('Validation success:', result.success);
if (!result.success) {
  console.log('Fatal issue:', result.fatal);
  console.log('Issues:', JSON.stringify(result.issues, null, 2));
  console.log('Errors:', result.errors);
}
