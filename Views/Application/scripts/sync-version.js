const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json'));
const app = JSON.parse(fs.readFileSync('app.json'));

app.expo.version = pkg.version;

// Android versionCode incremental
app.expo.android = app.expo.android || {};
app.expo.android.versionCode = (app.expo.android.versionCode || 0) + 1;

// iOS buildNumber
app.expo.ios = app.expo.ios || {};
app.expo.ios.buildNumber = pkg.version;

fs.writeFileSync('app.json', JSON.stringify(app, null, 2));

console.log('app.json version synced:', pkg.version);