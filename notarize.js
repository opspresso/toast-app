const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir, packager } = context;

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

  // 필요한 앱 정보만 추출하여 로그로 출력
  console.log('App Info (selected properties):');
  console.log('- productName:', packager.appInfo.productName);
  console.log('- id:', packager.appInfo.id);
  console.log('- name:', packager.appInfo.name);
  console.log('- version:', packager.appInfo.version);

  // package.json의 build 설정에서 정보 가져오기
  const appName = packager.appInfo.productName || 'Toast';
  const appBundleId = packager.appInfo.id || 'com.opspresso.toast-app';

  console.log('App name:', appName);
  console.log('App bundle ID:', appBundleId);

  // 앱 경로 구성
  const appPath = `${appOutDir}/${appName}.app`;
  console.log('App path for notarization:', appPath);

  // 코드 서명이 비활성화되어 있어도 공증 진행
  if (process.env.CSC_IDENTITY_AUTO_DISCOVERY === 'false' || process.env.CSC_IDENTITY === 'null') {
    console.log('Warning: Code signing is disabled, but proceeding with notarization anyway');
  }

  let fs;
  try {
    fs = require('fs');
  } catch (error) {
    console.error('Failed to require fs module:', error);
    console.log('Skipping notarization due to fs module error');
    return;
  }

  try {
    // 앱 경로가 존재하는지 확인
    if (!fs.existsSync(appPath)) {
      console.error(`Error: App path does not exist: ${appPath}`);

      try {
        console.log('Available files in output directory:', fs.readdirSync(appOutDir));

        // 실제 앱 경로 찾기 시도
        const possibleAppPaths = fs.readdirSync(appOutDir).filter(file => file.endsWith('.app'));
        if (possibleAppPaths.length > 0) {
          const actualAppPath = `${appOutDir}/${possibleAppPaths[0]}`;
          console.log(`Found possible app path: ${actualAppPath}`);
          console.log(`Using this path instead of: ${appPath}`);
          appPath = actualAppPath;
        } else {
          console.error('No .app files found in output directory');
          // 공증을 건너뛰지만 빌드는 계속 진행
          console.log('Skipping notarization due to missing app file');
          return;
        }
      } catch (dirError) {
        console.error('Error reading output directory:', dirError);
        console.log('Skipping notarization due to directory read error');
        return;
      }
    }

    // 공증 옵션 구성
    const notarizeOptions = {
      appBundleId,
      appPath,
      // @electron/notarize 2.2.0 버전에서는 tool 속성이 지원되지 않을 수 있음
    };

    // API 키 방식 (권장)
    if (API_KEY_ID && API_KEY_ISSUER_ID) {
      console.log(`Using API Key method for notarization (Key ID: ${API_KEY_ID})`);
      const keyPath = `${process.env.HOME}/private_keys/AuthKey_${API_KEY_ID}.p8`;

      // API 키 파일 존재 확인
      if (!fs.existsSync(keyPath)) {
        console.error(`Error: API Key file does not exist: ${keyPath}`);
        console.log('Skipping notarization due to missing API Key file');
        return;
      }

      // 공식 문서에 따른 속성 구조 사용
      notarizeOptions.appleApiKey = keyPath; // API 키 파일의 경로
      notarizeOptions.appleApiIssuer = API_KEY_ISSUER_ID; // 발급자 ID
    }
    // Apple ID 방식 (대체)
    else if (APPLE_ID && APPLE_TEAM_ID && APPLE_APP_SPECIFIC_PASSWORD) {
      console.log(`Using Apple ID method for notarization (Apple ID: ${APPLE_ID})`);
      notarizeOptions.appleId = APPLE_ID;
      notarizeOptions.appleIdPassword = APPLE_APP_SPECIFIC_PASSWORD;
      notarizeOptions.teamId = APPLE_TEAM_ID;
    }
    else {
      console.log('No valid notarization credentials provided');
      console.log('Skipping notarization');
      return;
    }

    console.log('Starting notarization with options:', JSON.stringify({
      ...notarizeOptions,
      appleIdPassword: notarizeOptions.appleIdPassword ? '***' : undefined
    }, null, 2));

    await notarize(notarizeOptions);
    console.log(`Notarization completed for ${appName}`);
  } catch (error) {
    console.error('Notarization failed with error:', error);

    // 오류 세부 정보 출력
    if (error.message) console.error('Error message:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.stdout) console.error('Error stdout:', error.stdout);
    if (error.stderr) console.error('Error stderr:', error.stderr);

    // 개발 환경에서만 오류를 무시하고 계속 진행
    if (process.env.NODE_ENV === 'development') {
      console.log('Development environment detected. Continuing build process despite notarization failure.');
      return;
    }

    // 공증 실패 시 오류를 다시 던져 빌드 프로세스 중단
    console.error('Notarization is required. Build process will be terminated due to notarization failure.');
    throw error;
  }
};
