// bootstrap.mjs — Gate check: initialize a new DevFlow task
//
// Atomically:
// 1. Validate task_id uniqueness across all state dirs
// 2. Create task_dir + subdirectories
// 3. Write task.yaml with protocol_version=2, module_slug, project_path, etc.
// 4. Write events.jsonl with task_initialized event
// 5. Write bootstrap permit
// 6. Output ALLOW + task_dir

import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const PROTOCOL_VERSION = '2';

export function check(taskDir, { taskId, description, projectPath, devflowRoot, moduleSlug, authoritativeSpec, expectedArtifactGlobs }) {
  const violations = [];
  const warnings = [];

  // ── Check 1: task_id uniqueness ────────────────────────────────────────────
  if (existsSync(taskDir)) {
    violations.push({ check: 'unique_task_id', severity: 'BLOCK', detail: `Task directory already exists: ${taskDir}` });
  }

  // ── Check 2: required fields ───────────────────────────────────────────────
  if (!taskId) {
    violations.push({ check: 'required_task_id', severity: 'BLOCK', detail: 'task_id is required' });
  }
  if (!projectPath) {
    violations.push({ check: 'required_project_path', severity: 'BLOCK', detail: 'project_path is required (external repo mode)' });
  }
  if (!devflowRoot) {
    violations.push({ check: 'required_devflow_root', severity: 'BLOCK', detail: 'devflow_root is required' });
  }
  if (!moduleSlug) {
    warnings.push('module_slug not provided — verify_state will not be able to match business artifacts by slug');
  }

  // ── Build task.yaml content ──────────────────────────────────────────────────
  const startedAt = new Date().toISOString();

  const taskYaml = [
    `task_id: "${taskId}"`,
    `project_path: "${projectPath}"`,
    `devflow_root: "${devflowRoot}"`,
    `protocol_version: "${PROTOCOL_VERSION}"`,
    `status: "initialized"`,
    `current_phase: "phase_a"`,
    `started_at: "${startedAt}"`,
    ...(moduleSlug ? [`module_slug: "${moduleSlug}"`] : []),
    ...(authoritativeSpec ? [`authoritative_spec: "${authoritativeSpec}"`] : []),
    ...(expectedArtifactGlobs ? [`expected_artifact_globs: "${expectedArtifactGlobs}"`] : []),
    `completed_phases: []`,
  ].join('\n') + '\n';

  // ── Build events.jsonl initial line ────────────────────────────────────────
  const initialEvent = {
    event_id: `evt_${startedAt.replace(/[-:T.Z]/g, '').slice(0, 14)}_001`,
    event_version: '2.0',
    timestamp: startedAt,
    task_id: taskId,
    run_id: `run_${taskId}_${startedAt.replace(/[-:T.Z]/g, '').slice(0, 8)}_001`,
    actor_type: 'orchestrator',
    actor_id: 'bootstrap',
    event_type: 'task_initialized',
    payload: {
      protocol_version: PROTOCOL_VERSION,
      project_path: projectPath,
      devflow_root: devflowRoot,
      module_slug: moduleSlug || null,
    },
  };

  const eventsLine = JSON.stringify(initialEvent) + '\n';

  // ── Apply or report ─────────────────────────────────────────────────────────
  if (violations.length === 0) {
    try {
      // Create directories
      mkdirSync(taskDir, { recursive: true });
      mkdirSync(join(taskDir, 'artifacts'), { recursive: true });
      mkdirSync(join(taskDir, 'decisions'), { recursive: true });
      mkdirSync(join(taskDir, 'handoffs'), { recursive: true });
      mkdirSync(join(taskDir, 'issues'), { recursive: true });
      mkdirSync(join(taskDir, '.permits'), { recursive: true });
      mkdirSync(join(taskDir, 'monitor'), { recursive: true });
      mkdirSync(join(taskDir, '.journal'), { recursive: true });

      // Write files
      writeFileSync(join(taskDir, 'task.yaml'), taskYaml, 'utf8');
      writeFileSync(join(taskDir, 'events.jsonl'), eventsLine, 'utf8');

      // Bootstrap permit (Fix 6B: new tasks require permit write success)
      const permitContent = JSON.stringify({
        action: 'bootstrap',
        task_id: taskId,
        bootstrapped_at: startedAt,
        protocol_version: PROTOCOL_VERSION,
      });
      writeFileSync(join(taskDir, '.permits', `bootstrap-${taskId}.permit`), permitContent, 'utf8');
    } catch (err) {
      return {
        allowed: false,
        action: 'bootstrap',
        reason: `Bootstrap write failed: ${err.message}`,
        violations: [{ check: 'write_failure', severity: 'BLOCK', detail: err.message }],
        warnings,
      };
    }
  }

  const allowed = violations.length === 0;
  return {
    allowed,
    action: 'bootstrap',
    params: { task_id: taskId, task_dir: taskDir },
    ...(allowed
      ? { checks_passed: ['unique_task_id', 'required_fields', 'directory_created', 'task_yaml_written', 'events_written', 'permit_written'] }
      : { reason: violations.map(v => v.detail).join('; '), violations }),
    warnings,
  };
}
