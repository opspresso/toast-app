exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    console.log('Skipping notarization: Not macOS build.');
    return;
  }

  // 여기 안에서만 electron-notarize를 require 합니다
  const { notarize } = require('electron-notarize');

  const appName = context.packager.appInfo.productFilename;

  console.log(`Starting notarization for app: ${appName}`);

  return await notarize({
    appBundleId: 'com.opspresso.toast-app',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
};
