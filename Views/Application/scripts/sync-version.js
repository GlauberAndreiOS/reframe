const fs = require('fs');
const { execSync } = require('child_process');

const PACKAGE_PATH = 'package.json';
const APP_PATH = 'app.json';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function bumpVersion(version, releaseType) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  if (!match) {
    throw new Error(`Invalid semver version in package.json: ${version}`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (releaseType === 'major') return `${major + 1}.0.0`;
  if (releaseType === 'minor') return `${major}.${minor + 1}.0`;
  if (releaseType === 'patch') return `${major}.${minor}.${patch + 1}`;

  return version;
}

function getReleaseTypeFromCommit() {
  const commitMessage =
    process.env.LAST_COMMIT_MESSAGE ||
    execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
  const firstLine = commitMessage.split('\n')[0];
  const match = /^([a-zA-Z]+)(\([^)]+\))?(!)?:\s+/.exec(firstLine);

  if (!match) {
    return null;
  }

  const type = match[1].toLowerCase();
  const isBreaking = Boolean(match[3]);

  if (isBreaking || type === 'refactor') return 'major';
  if (type === 'feat') return 'minor';
  if (type === 'fix') return 'patch';

  return null;
}

const pkg = readJson(PACKAGE_PATH);
const app = readJson(APP_PATH);

const currentAppVersion = app?.expo?.version;
const packageVersion = pkg.version;

// semantic-release can inject NEXT_RELEASE_VERSION during prepare.
const targetVersion =
  process.env.NEXT_RELEASE_VERSION ||
  (() => {
    try {
      return bumpVersion(packageVersion, getReleaseTypeFromCommit());
    } catch (error) {
      console.warn(`Could not infer version bump from commit: ${error.message}`);
      return packageVersion;
    }
  })();

const packageVersionChanged = targetVersion !== packageVersion;
const appVersionChanged = currentAppVersion !== targetVersion;

if (packageVersionChanged) {
  pkg.version = targetVersion;
  writeJson(PACKAGE_PATH, pkg);
}

app.expo.version = targetVersion;

app.expo.android = app.expo.android || {};
if (appVersionChanged) {
  app.expo.android.versionCode = (app.expo.android.versionCode || 0) + 1;
}

app.expo.ios = app.expo.ios || {};
app.expo.ios.buildNumber = targetVersion;

writeJson(APP_PATH, app);

console.log(`Version sync complete: ${targetVersion}`);
