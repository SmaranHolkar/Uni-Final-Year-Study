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
 * Matches against Revision Tool Archetypes in blueprints/revision_tools/
 * @param {string} promptText
 * @param {string} toolType
 * @returns {{ name: string, content: string, typeKey?: string } | null}
 */
export function getBlueprintForPrompt(promptText = '', toolType = '') {
  initRevisionToolRegistry();
  const text = `${promptText} ${toolType}`.toLowerCase();

  // Match against Revision Tool Blueprints
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

  return null;
}
