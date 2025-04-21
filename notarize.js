const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // macOS 플랫폼에서만 공증 진행
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // 환경 변수 확인
  const {
    APPLE_ID,
    APPLE_TEAM_ID,
    APPLE_APP_SPECIFIC_PASSWORD,
    API_KEY_ID,
    API_KEY_ISSUER_ID
  } = process.env;

  // 필요한 환경 변수가 없으면 공증 건너뛰기
  if (!APPLE_ID && !API_KEY_ID) {
    console.log('Skipping notarization: No Apple ID or API Key ID provided');
    return;
  }

  console.log('Notarizing app...');
  console.log('App output directory:', appOutDir);

  // 앱 이름과 번들 ID를 직접 지정
  const appName = 'Toast';
  const appBundleId = 'com.opspresso.toast-app';

  // 앱 경로 구성
  const appPath = `${appOutDir}/${appName}.app`;
  console.log('App path for notarization:', appPath);

  try {
    // API 키 방식 (권장)
    if (API_KEY_ID && API_KEY_ISSUER_ID) {
      await notarize({
        appBundleId,
        appPath: appPath,
        tool: 'notarytool',
        appleApiKey: {
          keyId: API_KEY_ID,
          issuerId: API_KEY_ISSUER_ID,
          keyPath: `${process.env.HOME}/private_keys/AuthKey_${API_KEY_ID}.p8`
        }
      });
    }
    // Apple ID 방식 (대체)
    else if (APPLE_ID && APPLE_TEAM_ID && APPLE_APP_SPECIFIC_PASSWORD) {
      await notarize({
        appBundleId,
        appPath: appPath,
        tool: 'notarytool',
        appleId: APPLE_ID,
        appleIdPassword: APPLE_APP_SPECIFIC_PASSWORD,
        teamId: APPLE_TEAM_ID
      });
    }

    console.log(`Notarization completed for ${appName}`);
  } catch (error) {
    console.error('Notarization failed:', error);
    throw error;
  }
};
