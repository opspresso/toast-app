exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS.');
    return;
  }

  const { notarize } = require('electron-notarize');

  const appName = context.packager.appInfo.productFilename;

  console.log(`Notarizing: ${appName}`);
  console.log(`APPLE_TEAM_ID: ${process.env.APPLE_TEAM_ID}`);

  process.stdout.write(`Notarizing: ${appName}\n`);
  process.stdout.write(`APPLE_TEAM_ID: ${process.env.APPLE_TEAM_ID}\n`);

  if (!process.env.APPLE_TEAM_ID) {
    throw new Error('APPLE_TEAM_ID environment variable is not set.');
  }

  await notarize({
    appBundleId: 'com.opspresso.toast-app',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  process.stdout.write(`Notarization complete for ${appName}\n`);
};
