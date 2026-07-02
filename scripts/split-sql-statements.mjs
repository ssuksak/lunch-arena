import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceGroups = [
  {
    label: 'migrations',
    sourceDir: path.join(root, 'migrations'),
    outputDir: path.join(root, 'supabase', 'queries', 'migrations'),
  },
  {
    label: 'supabase/proposals',
    sourceDir: path.join(root, 'supabase', 'proposals'),
    outputDir: path.join(root, 'supabase', 'queries', 'proposals'),
    optional: true,
  },
];
const queriesRoot = path.join(root, 'supabase', 'queries');

function sanitizeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'statement';
}

function stripLeadingComments(sql) {
  let text = sql.trimStart();
  let changed = true;
  while (changed) {
    changed = false;
    if (text.startsWith('--')) {
      const next = text.indexOf('\n');
      text = next === -1 ? '' : text.slice(next + 1).trimStart();
      changed = true;
    }
    if (text.startsWith('/*')) {
      const next = text.indexOf('*/');
      text = next === -1 ? '' : text.slice(next + 2).trimStart();
      changed = true;
    }
  }
  return text;
}

function classifyStatement(sql) {
  const text = stripLeadingComments(sql);
  const normalized = text.replace(/\s+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const words = lower.match(/^[a-z]+\s+(?:or\s+replace\s+|if\s+not\s+exists\s+|extension\s+)?[a-z_]*/)?.[0] || 'sql';
  const objectMatch =
    lower.match(/\b(?:table|function|trigger|policy|index|view|extension|schema|type|constraint)\s+(?:if\s+(?:not\s+)?exists\s+)?(?:"?public"?\.)?"?([a-z0-9_]+)"?/i) ||
    lower.match(/\bon\s+(?:"?public"?\.)?"?([a-z0-9_]+)"?/i);
  const summary = objectMatch ? `${words}-${objectMatch[1]}` : words;
  return sanitizeName(summary);
}

function findDollarTag(sql, index) {
  if (sql[index] !== '$') return null;
  const match = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
  return match ? match[0] : null;
}

function splitSqlStatements(sql) {
  const statements = [];
  let start = 0;
  let i = 0;
  let state = 'normal';
  let dollarTag = null;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (state === 'line-comment') {
      if (char === '\n') state = 'normal';
      i += 1;
      continue;
    }

    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'normal';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (state === 'single-quote') {
      if (char === "'" && next === "'") {
        i += 2;
        continue;
      }
      if (char === "'") state = 'normal';
      i += 1;
      continue;
    }

    if (state === 'double-quote') {
      if (char === '"' && next === '"') {
        i += 2;
        continue;
      }
      if (char === '"') state = 'normal';
      i += 1;
      continue;
    }

    if (state === 'dollar-quote') {
      if (sql.startsWith(dollarTag, i)) {
        i += dollarTag.length;
        state = 'normal';
        dollarTag = null;
        continue;
      }
      i += 1;
      continue;
    }

    if (char === '-' && next === '-') {
      state = 'line-comment';
      i += 2;
      continue;
    }

    if (char === '/' && next === '*') {
      state = 'block-comment';
      i += 2;
      continue;
    }

    if (char === "'") {
      state = 'single-quote';
      i += 1;
      continue;
    }

    if (char === '"') {
      state = 'double-quote';
      i += 1;
      continue;
    }

    const tag = findDollarTag(sql, i);
    if (tag) {
      dollarTag = tag;
      state = 'dollar-quote';
      i += tag.length;
      continue;
    }

    if (char === ';') {
      const statement = sql.slice(start, i + 1).trim();
      if (statement) statements.push(statement);
      start = i + 1;
    }

    i += 1;
  }

  const tail = sql.slice(start).trim();
  if (tail) statements.push(tail.endsWith(';') ? tail : `${tail};`);
  return statements;
}

function resetDirectory(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.replace(/\s+$/u, '')}\n`, 'utf8');
}

resetDirectory(queriesRoot);

const manifest = [];

for (const group of sourceGroups) {
  if (!fs.existsSync(group.sourceDir)) {
    if (group.optional) continue;
    throw new Error(`Missing SQL source directory: ${group.sourceDir}`);
  }

  const sources = fs.readdirSync(group.sourceDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const source of sources) {
    const sourcePath = path.join(group.sourceDir, source);
    const sql = fs.readFileSync(sourcePath, 'utf8');
    const statements = splitSqlStatements(sql);
    const sourceName = source.replace(/\.sql$/u, '');
    const sourceOutputDir = path.join(group.outputDir, sourceName);
    const sourceLabel = `${group.label}/${source}`;

    statements.forEach((statement, index) => {
      const fileName = `${String(index + 1).padStart(3, '0')}_${classifyStatement(statement)}.sql`;
      const relativePath = path.posix.join(
        'supabase',
        'queries',
        group.label.replace(/^supabase\//u, ''),
        sourceName,
        fileName,
      );

      writeFile(path.join(sourceOutputDir, fileName), [
        `-- Source: ${sourceLabel}`,
        `-- Statement: ${index + 1} of ${statements.length}`,
        statement,
      ].join('\n\n'));

      manifest.push({
        source: sourceLabel,
        statement: index + 1,
        file: relativePath,
      });
    });
  }
}

writeFile(path.join(queriesRoot, 'MANIFEST.md'), [
  '# Parsed Migration Queries',
  '',
  'Generated from `migrations/*.sql` and `supabase/proposals/*.sql` by `node scripts/split-sql-statements.mjs`.',
  'Each file contains one top-level SQL statement. The splitter preserves quoted strings, comments, and dollar-quoted PL/pgSQL bodies.',
  '',
  ...manifest.map((entry) => `- ${entry.source} #${entry.statement}: \`${entry.file}\``),
].join('\n'));

console.log(`Wrote ${manifest.length} query files to ${path.relative(root, queriesRoot)}`);
