/* eslint-disable no-console */
'use strict';
const chalk = require('chalk');

// ── Layout ──────────────────────────────────────────────────────────────────

const INDENT = '  ';
const dot = chalk.gray(' · ');
const B = s => chalk.gray(s);

// ── Symbols ─────────────────────────────────────────────────────────────────

const sym = {
  brand: '◈',
  ok: '✔',
  fail: '🗙',
  dot: '·',
  dash: '–',
  arrow: '➜',
  loaded: '●',
  skipped: '◌',
  error: '○'
};

// ── Formatters (return strings — caller does console.log) ───────────────────

const _red = chalk.hex('#e05c5c');

const ok = text => `${INDENT}${chalk.cyanBright(sym.ok)}  ${chalk.white(text)}`;
const fail = text => `${INDENT}${_red(sym.fail)}  ${_red(text)}`;
const dim = text => `${INDENT}${chalk.gray(sym.dot)}  ${chalk.dim(text)}`;

function brand(version) {
  return (
    `${INDENT}${chalk.cyanBright.bold(`${sym.brand}  CALMAPI`)}` +
    `${dot}${chalk.gray('Keep Calm & REST')}` +
    `${dot}${chalk.gray(version)}`
  );
}

function brandWidth(version) {
  // '◈  CALMAPI' (10) + ' · ' (3) + 'Keep Calm & REST' (16) + ' · ' (3) + version
  return 10 + 3 + 16 + 3 + version.length;
}

function sep(width) {
  return chalk.gray(`${INDENT}${'─'.repeat(width)}`);
}

function info(label, value) {
  return `${INDENT}${chalk.gray(sym.dash)}  ${chalk.gray(label.padEnd(15))}   ${value}`;
}

function envColor(env) {
  if (env === 'production') return chalk.green(env);
  if (env === 'development') return chalk.yellow(env);
  return chalk.magenta(env);
}

function readyBox(url, minWidth = 40) {
  const boxW = Math.max(minWidth, url.length + 8);
  const fill = Math.max(2, boxW - 8);
  const pad = ' '.repeat(Math.max(2, boxW - 6 - url.length));
  return [
    `${INDENT}${chalk.cyanBright(`╭─ ready ${'─'.repeat(fill)}╮`)}`,
    `${INDENT}${chalk.cyanBright('│')}   ${chalk.cyanBright(sym.arrow)}  ${chalk.white.bold(url)}${pad}${chalk.cyanBright('│')}`,
    `${INDENT}${chalk.cyanBright(`╰${'─'.repeat(boxW)}╯`)}`
  ].join('\n');
}

function printBanner({ name, version, generatorVersion }) {
  const genVer = `v${generatorVersion}`;
  const projVer = `v${version}`;
  const w = brandWidth(genVer);

  console.log(`\n${brand(genVer)}`);
  console.log(sep(w));
  console.log(info('App', `${chalk.white.bold(name)}  ${chalk.dim(projVer)}`));
  console.log(info('Environment', envColor(process.env.NODE_ENV || 'development')));
  console.log(info('Runtime', `${chalk.gray('Node')} ${chalk.white(process.version)}`));
  console.log(sep(w));
}

// ── Module table ────────────────────────────────────────────────────────────

function printModuleTable(rows) {
  if (!rows.length) return 40;

  const total = rows.length;
  const failed = rows.filter(r => r.Mapped === '✘').length;
  const skipped = rows.filter(r => r.Mapped === '-').length;
  const loaded = total - failed - skipped;

  const maxMod = Math.max(8, ...rows.map(r => r.Module.length));
  const maxRoute = Math.max(
    7,
    ...rows.map(r => {
      const rt = r.Route && r.Route !== '-' ? r.Route : sym.dash;
      return rt.length;
    })
  );

  const cMod = 2 + 1 + 2 + maxMod + 2;
  const cRoute = 2 + maxRoute + 2;
  const cStat = 2 + 6 + 2;
  const innerW = cMod + 1 + cRoute + 1 + cStat;

  const countStr = ` ${total} module${total !== 1 ? 's' : ''} `;
  const leadDash = Math.max(2, innerW - countStr.length);

  // Top border
  console.log(`${INDENT}${B('┌' + '─'.repeat(leadDash) + countStr + '┐')}`);

  // Column headers
  const hMod = '  ' + chalk.dim(sym.dot) + '  ' + chalk.dim('module'.padEnd(maxMod)) + '  ';
  const hRoute = '  ' + chalk.dim('route'.padEnd(maxRoute)) + '  ';
  const hStat = '  ' + chalk.dim('status') + '  ';
  console.log(`${INDENT}${B('│')}${hMod}${B('│')}${hRoute}${B('│')}${hStat}${B('│')}`);

  // Header divider
  console.log(
    `${INDENT}${B('├' + '─'.repeat(cMod) + '┼' + '─'.repeat(cRoute) + '┼' + '─'.repeat(cStat) + '┤')}`
  );

  // Data rows
  for (const row of rows) {
    const isLoaded = row.Mapped === '✔';
    const isSkipped = row.Mapped === '-';

    let modCol, routeCol, statCol;
    if (isLoaded) {
      modCol =
        '  ' + chalk.cyanBright(sym.loaded) + '  ' + chalk.white(row.Module.padEnd(maxMod)) + '  ';
      routeCol = '  ' + chalk.gray(row.Route.padEnd(maxRoute)) + '  ';
      statCol = '  ' + chalk.cyanBright('ready ') + '  ';
    } else if (isSkipped) {
      modCol = '  ' + chalk.dim(sym.skipped) + '  ' + chalk.dim(row.Module.padEnd(maxMod)) + '  ';
      routeCol = '  ' + chalk.dim(sym.dash.padEnd(maxRoute)) + '  ';
      statCol = '  ' + chalk.dim('skip  ') + '  ';
    } else {
      const rt = row.Route && row.Route !== '-' ? row.Route : sym.dash;
      modCol = '  ' + chalk.red(sym.error) + '  ' + chalk.red(row.Module.padEnd(maxMod)) + '  ';
      routeCol = '  ' + chalk.dim(rt.padEnd(maxRoute)) + '  ';
      statCol = '  ' + chalk.red('error ') + '  ';
    }

    console.log(`${INDENT}${B('│')}${modCol}${B('│')}${routeCol}${B('│')}${statCol}${B('│')}`);

    if (row.Error) {
      const errVis = 5 + row.Error.length;
      const errPad = ' '.repeat(Math.max(0, innerW - errVis));
      console.log(
        `${INDENT}${B('│')}  ${chalk.dim('└─')} ${chalk.red(row.Error)}${errPad}${B('│')}`
      );
    }
  }

  // Footer divider
  console.log(
    `${INDENT}${B('├' + '─'.repeat(cMod) + '┴' + '─'.repeat(cRoute) + '┴' + '─'.repeat(cStat) + '┤')}`
  );

  // Summary row
  const loadedLabel = `${loaded} loaded`;
  const skipLabel = skipped ? `${skipped} skipped` : null;
  const failedLabel = failed ? `${failed} failed` : null;
  const summaryVis = '  ' + [loadedLabel, skipLabel, failedLabel].filter(Boolean).join('  ·  ');
  const summaryPad = ' '.repeat(Math.max(0, innerW - summaryVis.length));
  let summaryOut = '  ' + chalk.dim(loadedLabel);
  if (skipLabel) summaryOut += '  ' + chalk.gray(sym.dot) + '  ' + chalk.dim(skipLabel);
  if (failedLabel) summaryOut += '  ' + chalk.gray(sym.dot) + '  ' + chalk.red(failedLabel);

  console.log(`${INDENT}${B('│')}${summaryOut}${summaryPad}${B('│')}`);
  console.log(`${INDENT}${B('└' + '─'.repeat(innerW) + '┘')}`);

  return innerW;
}

// ── HTTP request logger formatters ─────────────────────────────────────────

const _dev = process.env.NODE_ENV !== 'production';
const DIM = '\x1b[2m',
  R = '\x1b[0m',
  BOLD = '\x1b[1m';

const METHOD_COLORS = {
  GET: '\x1b[36m',
  POST: '\x1b[32m',
  PUT: '\x1b[33m',
  PATCH: '\x1b[35m',
  DELETE: '\x1b[31m'
};

const statusColor = c =>
  c >= 500 ? '\x1b[31m' : c >= 400 ? '\x1b[33m' : c >= 300 ? '\x1b[36m' : '\x1b[32m';

function fmtStack(stack) {
  if (!stack) return '';
  const W = 100,
    INNER = W - 4;
  const cwd = process.cwd();
  const raw = stack
    .split('\n')
    .slice(1)
    .filter(l => l.trim());
  const app = raw.filter(l => !l.includes('node_modules') && !l.includes('node:'));
  const frames = (app.length ? app : raw).map(l => l.trim().replace(`${cwd}/`, '')).filter(Boolean);
  if (!frames.length) return '';

  const wrap = s => {
    const out = [];
    while (s.length > INNER) {
      out.push(s.slice(0, INNER));
      s = `   ${s.slice(INNER)}`;
    }
    return [...out, s];
  };

  return [
    `\n  ${DIM}╭─ stack ${'─'.repeat(W - 10)}╮${R}`,
    ...frames.flatMap(wrap).map(r => `\n  ${DIM}│ ${r.padEnd(INNER)} │${R}`),
    `\n  ${DIM}╰${'─'.repeat(W - 2)}╯${R}`
  ].join('');
}

function fmtHttpLine(method, url, status, ms, label = '', stack = '') {
  const m = method.padEnd(7);
  const u = url.length > 40 ? `${url.slice(0, 39)}\u2026` : url.padEnd(40);
  const t = ms != null ? `${String(ms).padStart(5)}ms` : '      -';
  const sep = ` ${DIM}\u2502${R} `;
  const lbl = label ? `${sep}${DIM}${label}${R}` : ` ${DIM}\u2502${R}`;
  return (
    `${METHOD_COLORS[method] || ''}${BOLD}${m}${R}` +
    `${DIM}${u}${R}` +
    `${sep}${statusColor(status)}${BOLD}${status}${R}` +
    `${sep}${DIM}${t}${R}` +
    `${lbl}` +
    `${_dev && stack ? fmtStack(stack) : ''}`
  );
}

module.exports = {
  dot,
  ok,
  fail,
  dim,
  brand,
  brandWidth,
  sep,
  info,
  envColor,
  readyBox,
  printBanner,
  printModuleTable,
  fmtStack,
  fmtHttpLine
};
