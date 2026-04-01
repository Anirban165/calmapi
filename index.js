#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const inquirer = require('inquirer');
const { paramCase } = require('change-case');
const axios = require('axios');
const ora = require('ora');
const chalk = require('chalk');
const packageInfo = require('./package.json');
const { generateProject, generateModule } = require('./lib/generator');

const CWD = process.cwd();
const dot = chalk.gray(' · ');
const sep = chalk.gray('─'.repeat(40));
const BANNER = `
  ┌────────────────────────────────────────────────────────────────┐
  │  █████╗   █████╗  ██╗     ███╗   ███╗     █████╗ ██████╗  ██╗  │
  │ ██╔══██╗ ██╔══██╗ ██║     ████╗ ████║    ██╔══██╗██╔══██╗ ██║  │
  │ ██║  ╚═╝ ███████║ ██║     ██╔████╔██║    ███████║██████╔╝ ██║  │
  │ ██║  ██╗ ██╔══██║ ██║     ██║╚██╔╝██║    ██╔══██║██╔═══╝  ██║  │
  │ ╚█████╔╝ ██║  ██║ ███████╗██║ ╚═╝ ██║    ██║  ██║██║      ██║  │
  │  ╚════╝  ╚═╝  ╚═╝ ╚══════╝╚═╝     ╚═╝    ╚═╝  ╚═╝╚═╝      ╚═╝  │
  └────────────────────────────────────────────────────────────────┘`;

function printBrand() {
  console.log(chalk.hex('#ff9970')(BANNER));
  console.log('');
  console.log(
    `  ${chalk.cyanBright.bold('◈  CALMAPI')}${dot}${chalk.gray('Keep Calm & REST')}${dot}${chalk.gray(`v${packageInfo.version}`)}`
  );
}

function directoryExists(dirName) {
  return fs.existsSync(path.join(CWD, dirName));
}

function runCommand([bin, ...args], cwd) {
  return new Promise((resolve, reject) => {
    const proc = childProcess.spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: 'ignore',
      shell: false
    });
    proc.on('error', reject);
    proc.on('close', code =>
      code === 0 ? resolve() : reject(new Error(`Command failed: ${[bin, ...args].join(' ')}`))
    );
  });
}

async function installDependencies(projectDir) {
  const spinner = ora({
    text: chalk.gray('Installing dependencies...'),
    color: 'cyan',
    indent: 2
  }).start();
  try {
    await runCommand(
      ['npm', 'install', '--no-audit', '--no-fund', '--force', '--quiet'],
      projectDir
    );
    spinner.stopAndPersist({
      symbol: chalk.cyanBright('✔'),
      text: chalk.white('Dependencies installed')
    });
  } catch (err) {
    spinner.fail(chalk.red('Install failed: ') + err.message);
    throw err;
  }
}

async function initGitRepo(projectDir) {
  const spinner = ora({
    text: chalk.gray('Initializing git...'),
    color: 'cyan',
    indent: 2
  }).start();
  try {
    await runCommand(['git', 'init'], projectDir);
    spinner.stopAndPersist({
      symbol: chalk.cyanBright('✔'),
      text: chalk.white('Git initialized')
    });
  } catch (err) {
    spinner.fail(chalk.red('Git setup failed: ') + err.message);
    throw err;
  }
}

async function commitGitRepo(projectDir) {
  const spinner = ora({
    text: chalk.gray('Creating initial commit...'),
    color: 'cyan',
    indent: 2
  }).start();
  try {
    await runCommand(['git', 'add', '.'], projectDir);
    await runCommand(['git', 'commit', '-m', 'Initial commit'], projectDir);
    spinner.stopAndPersist({
      symbol: chalk.cyanBright('✔'),
      text: chalk.white('Initial commit created')
    });
  } catch (err) {
    spinner.fail(chalk.red('Git commit failed: ') + err.message);
    throw err;
  }
}

async function checkForUpdates() {
  const spinner = ora({
    text: chalk.gray('Checking for updates...'),
    color: 'cyan',
    indent: 2
  }).start();
  try {
    const { data } = await axios.get('https://registry.npmjs.org/calmapi', {
      timeout: 5000
    });
    const latest = data?.['dist-tags']?.latest;
    spinner.stop();

    if (!latest) {
      return;
    }

    if (latest !== packageInfo.version) {
      console.log(
        `${chalk.yellow('↑')}  ${chalk.yellow(`${packageInfo.version} → ${latest} available`)}${dot}${chalk.white('npm i -g calmapi')}`
      );
      console.log('');
    } else {
      console.log(`${chalk.cyanBright('✔')}  ${chalk.gray('Up to date')}`);
      console.log('');
    }
  } catch {
    spinner.stop();
  }
}

const QUESTIONS = [
  {
    name: 'project-name',
    type: 'input',
    message: chalk.white('Project name'),
    validate(input) {
      const name = input.trim();
      const dirName = paramCase(name);
      if (!/^[A-Za-z\d\-_ ]+$/.test(name)) {
        return 'Only letters, numbers, hyphens, underscores, and spaces.';
      }
      if (directoryExists(dirName)) {
        return `"${dirName}" already exists.`;
      }
      return true;
    }
  },
  {
    name: 'mongo-uri',
    type: 'input',
    message: chalk.white('MongoDB URI'),
    default: answers => `mongodb://localhost:27017/${paramCase(answers['project-name'])}`
  },
  {
    name: 'setup-husky',
    type: 'confirm',
    message: chalk.white('Setup Husky git hooks?'),
    default: false
  }
];

async function setupHusky(projectDir) {
  const spinner = ora({
    text: chalk.gray('Setting up Husky...'),
    color: 'cyan',
    indent: 2
  }).start();
  try {
    await runCommand(
      [
        'npm',
        'install',
        '--save-dev',
        '--no-audit',
        '--no-fund',
        '--quiet',
        'husky',
        'lint-staged@15'
      ],
      projectDir
    );
    await runCommand(['npx', 'husky', 'init'], projectDir);

    // pre-commit: lint & format staged files
    fs.writeFileSync(path.join(projectDir, '.husky', 'pre-commit'), 'npx lint-staged\n', 'utf8');

    // commit-msg: enforce conventional commit format
    fs.writeFileSync(
      path.join(projectDir, '.husky', 'commit-msg'),
      'msg=$(cat "$1")\n' +
        'pattern="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\\(.+\\))?: .{1,100}$"\n' +
        'if ! echo "$msg" | grep -qE "$pattern"; then\n' +
        '  echo "Invalid commit message format."\n' +
        '  echo "Use: type(scope): description"\n' +
        '  echo "Types: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert"\n' +
        '  echo "Example: feat(auth): add refresh token support"\n' +
        '  exit 1\n' +
        'fi\n',
      'utf8'
    );

    // Add lint-staged config to package.json
    const pkgPath = path.join(projectDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg['lint-staged'] = {
      '*.js': ['eslint --fix', 'prettier --write']
    };
    fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');

    spinner.stopAndPersist({
      symbol: chalk.cyanBright('✔'),
      text: chalk.white('Husky configured')
    });
  } catch (err) {
    spinner.fail(chalk.red('Husky setup failed: ') + err.message);
    throw err;
  }
}

async function createProject() {
  printBrand();
  await checkForUpdates();

  const answers = await inquirer.prompt(QUESTIONS);
  const projectName = answers['project-name'].trim();
  const mongoUri = answers['mongo-uri'].trim();
  const wantHusky = answers['setup-husky'];
  const dirName = paramCase(projectName);
  const projectDir = path.join(CWD, dirName);

  console.log('');
  console.log(`  ${chalk.gray('name')}     ${chalk.white(projectName)}`);
  console.log(`  ${chalk.gray('db')}       ${chalk.white(mongoUri)}`);
  console.log(
    `  ${chalk.gray('husky')}    ${wantHusky ? chalk.cyanBright('yes') : chalk.gray('no')}`
  );
  console.log('');

  try {
    fs.mkdirSync(projectDir, { recursive: true });
    generateProject(projectDir, {
      projectName: dirName,
      mongoUri,
      version: packageInfo.version
    });
    fs.writeFileSync(
      path.join(projectDir, 'calmapi.json'),
      JSON.stringify({
        name: 'calmapi',
        version: packageInfo.version,
        projectName: dirName,
        modules: ['auth', 'user', 'post', 'media']
      }, null, 2),
      'utf8'
    );
  } catch (err) {
    console.error(
      `\n  ${chalk.red('✗')}  ${chalk.red('Failed to scaffold project:')} ${err.message}\n`
    );
    fs.rmSync(projectDir, { recursive: true, force: true });
    return;
  }

  let installSuccess = false;
  try {
    await installDependencies(projectDir);
    installSuccess = true;
  } catch {
    /* spinner already displayed the error */
  }

  let gitSuccess = false;
  try {
    await initGitRepo(projectDir);
    gitSuccess = true;
  } catch {
    /* spinner already displayed the error */
  }

  if (wantHusky && gitSuccess && installSuccess) {
    try {
      await setupHusky(projectDir);
    } catch {
      /* spinner already displayed the error */
    }
  }

  if (gitSuccess) {
    try {
      await commitGitRepo(projectDir);
    } catch {
      /* spinner already displayed the error */
    }
  }

  console.log('');

  if (installSuccess) {
    console.log(`  ${chalk.cyanBright('✦')}  ${chalk.white.bold("You're all set!")}`);
    console.log('');
    console.log(`  ${sep}`);
    console.log('');
    console.log(`  ${chalk.gray('$')} ${chalk.cyanBright(`cd ${dirName} && npm start`)}`);
    console.log('');
    console.log(
      `  ${chalk.gray('docker  $')} ${chalk.white(`docker build -t ${dirName} . && docker run -p 5001:5001 ${dirName}`)}`
    );
    console.log('');
    console.log(`  ${sep}`);
    console.log('');
  } else {
    console.log(
      `  ${chalk.yellow('⚠')}  ${chalk.yellow('Project created but dependencies were not installed.')}`
    );
    console.log(
      `  ${chalk.gray('Run')} ${chalk.white(`cd ${dirName} && npm install`)} ${chalk.gray('manually.')}`
    );
    console.log('');
    console.log(`  ${sep}`);
    console.log('');
  }

  console.log(
    `  ${chalk.gray('includes')}  ${chalk.cyanBright('auth')}${dot}${chalk.cyanBright('post')}${dot}${chalk.cyanBright('media')}`
  );
  console.log(
    `  ${chalk.gray('extend')}    ${chalk.white('calmapi generate module')} ${chalk.cyanBright('<name>')}`
  );
  console.log('');
  if (!gitSuccess) {
    console.log(
      `  ${chalk.gray('git not initialized — run')} ${chalk.white('git init')} ${chalk.gray('inside the project folder')}`
    );
    console.log('');
  }
  console.log(
    `  ${chalk.gray('edit')} ${chalk.white('.env')} ${chalk.gray('to configure your environment')}`
  );
  console.log('');
}

function printHelp() {
  printBrand();
  console.log(`  ${chalk.white.bold('Commands')}`);
  console.log(`  ${sep}`);
  console.log(
    `  ${chalk.white('calmapi')}                              ${chalk.gray('create a new project')}`
  );
  console.log(
    `  ${chalk.white('calmapi generate module')} ${chalk.cyanBright('<name>')}      ${chalk.gray('generate a module')}`
  );
  console.log(
    `  ${chalk.white('calmapi generate module')} ${chalk.cyanBright('<name>')} ${chalk.gray('--force')}  ${chalk.gray('skip singularization')}`
  );
  console.log('');
  console.log(`  ${chalk.white.bold('Flags')}`);
  console.log(`  ${sep}`);
  console.log(`  ${chalk.white('-v, --version')}    ${chalk.gray('print version')}`);
  console.log(`  ${chalk.white('-h, --help')}       ${chalk.gray('print this help')}`);
  console.log('');
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (!args.length) {
      await createProject();
      return;
    }

    if (args[0] === '-v' || args[0] === '--version') {
      console.log(packageInfo.version);
      return;
    }

    if (args[0] === '-h' || args[0] === '--help') {
      printHelp();
      return;
    }

    if (args[0] === 'generate' && args[1] === 'module') {
      if (!args[2]) {
        throw new Error('Module name is required.\n  Usage: calmapi generate module <name>');
      }

      if (!fs.existsSync(path.join(CWD, 'calmapi.json'))) {
        throw new Error('Not a CalmAPI project. Run this command from a CalmAPI project root.');
      }

      const useForce = args.includes('--force');
      await generateModule(args[2], useForce);
      return;
    }

    throw new Error(`Unknown command: ${args.join(' ')}\n  Run "calmapi --help" for usage.`);
  } catch (err) {
    console.error(`\n  ${chalk.red('✗')}  ${err.message}\n`);
    process.exitCode = 1;
  }
}

main();
