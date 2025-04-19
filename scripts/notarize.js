exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: not macOS.');
    return;
  }

  const { notarize } = require('electron-notarize');

  const appName = context.packager.appInfo.productFilename;

  console.log(`Notarizing: ${appName}`);

  await notarize({
    appBundleId: 'com.opspresso.toast-app',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: '3TMN29X5ES',
  });

  console.log(`Notarization complete for ${appName}`);
};
