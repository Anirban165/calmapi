'use strict';

const fs = require('fs');
const path = require('path');
const pluralize = require('pluralize');
const chalk = require('chalk');
const caseChanger = require('case');

const MODULE_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'module');
const PROJECT_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'project');

const MODULE_TEMPLATE_FILES = [
  'sample.controller.js',
  'sample.dto.js',
  'sample.model.js',
  'sample.route.js',
  'sample.service.js',
  'sample.settings.js'
];

const FILE_RENAMES = {
  '.npmignore': '.gitignore',
  '.gitignore.sample': '.gitignore',
  '.eslintrc.json.sample': '.eslintrc.json',
  '.env.sample': '.env'
};

const SKIPPED_FILES = new Set(['.env', 'package-lock.json']);

function applyVars(contents, names) {
  return contents
    .replace(/MODULE_SINGULAR_PASCAL/g, names.pascal)
    .replace(/MODULE_SINGULAR_CAMEL/g, names.camel)
    .replace(/MODULE_SINGULAR_KEBAB/g, names.kebab);
}

function injectProjectVars(fileName, rawContents, { projectName, mongoUri, version }) {
  let contents = rawContents;
  if (fileName === 'package.json') {
    contents = contents.replace('"name": "calmapi"', `"name": "${projectName}"`);
    contents = contents.replace('{{CALMAPI_VERSION}}', version);
  }
  if (fileName === 'package-lock.json') {
    contents = contents.replaceAll('"name": "calmapi"', `"name": "${projectName}"`);
  }
  if (fileName === '.env.sample') {
    contents = contents.replace('{{MONGODB_URI}}', mongoUri);
  }
  if (fileName === 'README.md') {
    contents = contents.replace(/^# calmapi/m, `# ${projectName}`);
  }
  return contents;
}

function copyDir(srcDir, destDir, context) {
  for (const entry of fs.readdirSync(srcDir)) {
    const srcPath = path.join(srcDir, entry);
    const stats = fs.statSync(srcPath);

    if (stats.isFile()) {
      if (SKIPPED_FILES.has(entry)) {
        continue;
      }
      const outputName = FILE_RENAMES[entry] || entry;
      const contents = injectProjectVars(entry, fs.readFileSync(srcPath, 'utf8'), context);
      fs.writeFileSync(path.join(destDir, outputName), contents, 'utf8');
    } else if (stats.isDirectory()) {
      const nestedDest = path.join(destDir, entry);
      fs.mkdirSync(nestedDest, { recursive: true });
      copyDir(srcPath, nestedDest, context);
    }
  }
}

const RESERVED_NAMES = new Set([
  'constructor',
  'prototype',
  '__proto__',
  'toString',
  'valueOf',
  'node_modules',
  'system',
  'api',
  'index',
  'config',
  'plugins',
  'utils'
]);

async function generateModule(modulePath, isForce = false) {
  try {
    const rawName = modulePath.split('/').pop();

    if (!rawName || !rawName.trim()) {
      throw new Error('Module name cannot be empty.');
    }

    const singularName = isForce ? rawName : pluralize.singular(rawName);
    const kebab = caseChanger.kebab(singularName);

    if (!kebab || !/^[a-z][a-z0-9-]*$/.test(kebab)) {
      throw new Error(`Invalid module name: "${rawName}". Use letters, numbers, and hyphens only.`);
    }

    if (RESERVED_NAMES.has(kebab)) {
      throw new Error(`"${kebab}" is a reserved name and cannot be used as a module name.`);
    }

    const moduleDirPath = path.join(process.cwd(), 'src', 'modules', kebab);

    if (fs.existsSync(moduleDirPath)) {
      throw new Error(`Module "${kebab}" already exists at src/modules/${kebab}/`);
    }

    // Check calmapi.json for tracked modules
    const configPath = path.join(process.cwd(), 'calmapi.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (Array.isArray(config.modules) && config.modules.includes(kebab)) {
          throw new Error(`Module "${kebab}" is already tracked in calmapi.json`);
        }
      } catch (e) {
        if (e.message.includes('already tracked')) {
          throw e;
        }
        /* ignore parse errors */
      }
    }

    const names = {
      pascal: caseChanger.pascal(singularName),
      camel: caseChanger.camel(singularName),
      kebab
    };

    console.log(`\n  ${chalk.cyanBright.bold('◈')}  ${chalk.white.bold(names.pascal)}`);
    console.log(`  ${chalk.gray(`src/modules/${kebab}/`)}\n`);

    fs.mkdirSync(moduleDirPath, { recursive: true });

    for (const templateFile of MODULE_TEMPLATE_FILES) {
      const sourcePath = path.join(MODULE_TEMPLATE_DIR, templateFile);
      const targetFile = templateFile.replace('sample', kebab);
      const targetPath = path.join(moduleDirPath, targetFile);

      const contents = applyVars(fs.readFileSync(sourcePath, 'utf8'), names);
      fs.writeFileSync(targetPath, contents, 'utf8');

      console.log(`  ${chalk.greenBright('+')} ${chalk.white(targetFile)}`);
    }

    console.log(`\n  ${chalk.cyanBright('✦')} ${chalk.white('Module ready.')}\n`);

    // Track generated module in calmapi.json
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (!Array.isArray(config.modules)) {
          config.modules = [];
        }
        if (!config.modules.includes(kebab)) {
          config.modules.push(kebab);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        }
      } catch {
        /* non-critical — skip if calmapi.json is malformed */
      }
    }
  } catch (err) {
    console.error(`  ${chalk.red('✗')} ${err.message}`);
  }
}

function generateProject(destDir, context) {
  copyDir(PROJECT_TEMPLATE_DIR, destDir, context);
}

module.exports = { generateModule, generateProject };
