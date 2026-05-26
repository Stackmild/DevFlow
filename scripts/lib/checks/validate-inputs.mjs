// validate-inputs.mjs — Validate handoff packet input_artifacts (Fix 4)
// Checks: path existence, size > 0, sha256 for small text files (<= 5MB), size+mtime + large_file_reason for large files.
// Zero npm dependencies. Uses node:crypto for sha256.

import { existsSync, statSync, readFileSync, createReadStream } from 'fs';
import { createHash } from 'crypto';

const SIZE_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5 MB
const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.yaml', '.yml', '.json', '.js', '.mjs', '.ts', '.tsx',
  '.css', '.html', '.xml', '.csv', '.sql', '.sh', '.py', '.go', '.rs',
]);

function isTextFile(path) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function fileSize(path) {
  try { return statSync(path).size; }
  catch { return null; }
}

function fileMtimeMs(path) {
  try { return statSync(path).mtimeMs; }
  catch { return null; }
}

function sha256FileSync(path) {
  try {
    const data = readFileSync(path);
    return createHash('sha256').update(data).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Parse input_artifacts from handoff packet content.
 * Expects YAML-like format:
 *   input_artifacts:
 *     - path: /abs/or/rel/path
 *       declared_size: 1234
 *       declared_hash: abcdef...
 *       large_file_reason: "Binary asset, skip hash"
 *
 * Returns Array<{ path, declared_size?, declared_hash?, large_file_reason? }>.
 */
function parseInputArtifacts(packetContent) {
  const lines = packetContent.split('\n');
  let inList = false;
  let inItem = false;
  let itemIndent = -1;
  let baseIndent = -1;
  const items = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const rawIndent = line.search(/\S/);
    const trimmed = line.trim();
    if (trimmed === '') continue; // skip blank lines
    if (trimmed.startsWith('#')) continue;

    if (!inList) {
      if (trimmed.startsWith('input_artifacts:')) {
        inList = true;
        baseIndent = rawIndent;
      }
      continue;
    }

    // In list: stop when same/lower indent non-list-item (but not blank — already filtered)
    if (rawIndent <= baseIndent && !trimmed.startsWith('-')) {
      if (inItem && current && Object.keys(current).length > 0) items.push(current);
      inItem = false;
      current = null;
      break;
    }

    if (trimmed.startsWith('-')) {
      if (inItem && current && Object.keys(current).length > 0) items.push(current);
      inItem = true;
      itemIndent = rawIndent;
      current = {};
      // Line may contain key: value inline ("- path: foo")
      const afterDash = trimmed.slice(1).trim();
      const m = afterDash.match(/^(\w+):\s*(.*)$/);
      if (m) current[m[1]] = m[2].replace(/^["']|["']$/g, '');
      continue;
    }

    if (inItem && rawIndent > itemIndent) {
      const m = trimmed.match(/^(\w+):\s*(.*)$/);
      if (m) {
        current[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
  if (inItem && current && Object.keys(current).length > 0) items.push(current);

  // Dedup by path to prevent double-counting and double-errors
  const seenPaths = new Set();
  return items.filter(item => {
    if (!item.path) return true; // keep items without path (will fail validation)
    if (seenPaths.has(item.path)) return false;
    seenPaths.add(item.path);
    return true;
  });
}

/**
 * Validate a single input artifact.
 * Returns { ok: boolean, detail: string|null }.
 */
export function validateArtifact(item) {
  const { path: artifactPath } = item;
  if (!artifactPath) {
    return { ok: false, detail: 'input_artifact missing "path" field' };
  }

  if (!existsSync(artifactPath)) {
    return { ok: false, detail: `path does not exist: ${artifactPath}` };
  }

  const size = fileSize(artifactPath);
  if (size === null || size === 0) {
    return { ok: false, detail: `file is empty or unreadable: ${artifactPath}` };
  }

  const declaredSize = item.declared_size ? Number(item.declared_size) : null;
  if (declaredSize !== null && declaredSize !== size) {
    return { ok: false, detail: `size mismatch: declared ${declaredSize} vs actual ${size} for ${artifactPath}` };
  }

  const isSmallText = size <= SIZE_THRESHOLD_BYTES && isTextFile(artifactPath);

  if (isSmallText) {
    const declaredHash = item.declared_hash;
    if (!declaredHash) {
      return { ok: false, detail: `small text file missing declared_hash: ${artifactPath}` };
    }
    const actualHash = sha256FileSync(artifactPath);
    if (actualHash === null) {
      return { ok: false, detail: `cannot compute sha256 for ${artifactPath}` };
    }
    if (actualHash !== declaredHash) {
      return { ok: false, detail: `sha256 mismatch for ${artifactPath}: declared ${declaredHash} vs actual ${actualHash}` };
    }
  } else {
    // Large or binary file
    const largeReason = item.large_file_reason;
    if (!largeReason) {
      return {
        ok: false,
        detail: `large/binary file (>5MB or non-text) missing large_file_reason: ${artifactPath}`,
      };
    }
    // For large files, only size+mtime are validated (declared_size already checked above)
    const mtime = fileMtimeMs(artifactPath);
    if (mtime === null) {
      return { ok: false, detail: `cannot read mtime for ${artifactPath}` };
    }
  }

  return { ok: true, detail: null };
}

/**
 * Validate all input_artifacts listed in a handoff packet.
 *
 * @param {string} packetContent — raw text content of the handoff YAML
 * @returns { ok: boolean, errors: string[], warnings: string[], checked: number }
 */
export function validateInputs(packetContent) {
  const artifacts = parseInputArtifacts(packetContent);
  if (artifacts.length === 0) {
    return { ok: true, errors: [], warnings: ['No input_artifacts found in packet — no artifacts to validate'], checked: 0 };
  }

  const errors = [];
  const warnings = [];
  for (const item of artifacts) {
    const result = validateArtifact(item);
    if (!result.ok) errors.push(result.detail);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    checked: artifacts.length,
  };
}
