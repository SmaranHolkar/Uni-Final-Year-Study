import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BLUEPRINTS_DIR = path.join(__dirname, 'blueprints');
const REVISION_TOOLS_DIR = path.join(BLUEPRINTS_DIR, 'revision_tools');

// Cache blueprints in memory for instant retrieval
const blueprintCache = {};
const revisionToolRegistry = [];

function loadBlueprintFromPath(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8');
    }
  } catch (err) {
    console.warn(`Failed to read blueprint at ${filePath}:`, err.message);
  }
  return '';
}

// Automatically index all revision tool blueprints from revision_tools folder
function initRevisionToolRegistry() {
  if (revisionToolRegistry.length > 0) return;

  try {
    if (fs.existsSync(REVISION_TOOLS_DIR)) {
      const files = fs.readdirSync(REVISION_TOOLS_DIR).filter(f => f.endsWith('.md'));
      files.forEach(file => {
        const fullPath = path.join(REVISION_TOOLS_DIR, file);
        const content = loadBlueprintFromPath(fullPath);
        if (!content) return;

        // Extract metadata: Type Key & Aliases
        const typeKeyMatch = content.match(/-\s*\*\*Type Key\*\*:\s*`?([^`\r\n]+)`?/i);
        const aliasesMatch = content.match(/-\s*\*\*Aliases\*\*:\s*([^\r\n]+)/i);

        const typeKey = typeKeyMatch ? typeKeyMatch[1].trim() : file.replace('.md', '');
        const rawAliases = aliasesMatch ? aliasesMatch[1].split(',').map(a => a.replace(/[`*]/g, '').trim().toLowerCase()) : [];
        const aliases = Array.from(new Set([typeKey.toLowerCase(), file.replace('.md', '').replace(/_/g, '-'), ...rawAliases]));

        revisionToolRegistry.push({
          file,
          typeKey,
          aliases,
          content
        });
      });
    }
  } catch (err) {
    console.warn('Failed to index revision tool blueprints:', err.message);
  }
}

// Initialize on module load
initRevisionToolRegistry();

export function getAllRevisionBlueprints() {
  initRevisionToolRegistry();
  return revisionToolRegistry;
}

export function getBlueprintByKey(typeKey) {
  initRevisionToolRegistry();
  const cleanKey = String(typeKey || '').toLowerCase().trim();
  return revisionToolRegistry.find(r => r.typeKey.toLowerCase() === cleanKey || r.aliases.includes(cleanKey)) || null;
}

/**
 * Returns the matching blueprint markdown content based on user prompt & toolType.
 * Priority 1: Specific Revision Tool Archetypes (21 types)
 * Priority 2: 3D / Science Simulations
 * @param {string} promptText
 * @param {string} toolType
 * @returns {{ name: string, content: string, typeKey?: string } | null}
 */
export function getBlueprintForPrompt(promptText = '', toolType = '') {
  initRevisionToolRegistry();
  const text = `${promptText} ${toolType}`.toLowerCase();

  // 1. Match against 21 Revision Tool Blueprints First
  for (const tool of revisionToolRegistry) {
    for (const alias of tool.aliases) {
      if (alias && alias.length > 2 && text.includes(alias)) {
        return {
          name: `${tool.typeKey} Blueprint`,
          content: tool.content,
          typeKey: tool.typeKey
        };
      }
    }
  }

  // 2. Check for 3D simulation requests
  const is3D = ['3d', 'three.js', 'threejs', '3d model', 'molecule viewer', '3d cell', '3d solar', '3d orbit', '3d structure'].some(k => text.includes(k));
  if (is3D) {
    const content = loadBlueprintFromPath(path.join(BLUEPRINTS_DIR, 'three_3d_simulation.md'));
    if (content) return { name: 'Three.js 3D Simulation Blueprint', content };
  }

  // 3. Check for Chemistry simulation requests
  const isChemistry = ['chemistry', 'chemical', 'titration', 'acid', 'base', 'beaker', 'flask', 'reagent', 'reaction', 'stoichiometry', 'compound'].some(k => text.includes(k));
  if (isChemistry) {
    const content = loadBlueprintFromPath(path.join(BLUEPRINTS_DIR, 'chemistry_simulator.md'));
    if (content) return { name: 'Chemistry Simulator Blueprint', content };
  }

  // 4. Check for Physics simulation requests
  const isPhysics = ['physics', 'pendulum', 'projectile', 'gravity', 'orbit', 'spring', 'force', 'motion', 'kinetics', 'optics', 'circuit', 'electricity'].some(k => text.includes(k));
  if (isPhysics) {
    const content = loadBlueprintFromPath(path.join(BLUEPRINTS_DIR, 'physics_simulation.md'));
    if (content) return { name: 'Physics Simulation Blueprint', content };
  }

  // 5. Check for general simulation requests
  const isSimulation = ['simulation', 'simulator', 'lab', 'sandbox', 'interactive experiment', 'interactive model', 'virtual lab'].some(k => text.includes(k));
  if (isSimulation) {
    const content = loadBlueprintFromPath(path.join(BLUEPRINTS_DIR, 'general_simulation.md'));
    if (content) return { name: 'General Interactive Simulation Blueprint', content };
  }

  return null;
}
