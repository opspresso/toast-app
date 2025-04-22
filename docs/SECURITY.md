# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Toast App team takes security issues seriously. We appreciate your efforts to responsibly disclose your findings and will make every effort to acknowledge your contributions.

### How to Report a Vulnerability

Please report security vulnerabilities by emailing [security@toast-app.example.com](mailto:security@toast-app.example.com).

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Please include the following information in your report:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

### Response Process

After you have submitted a vulnerability report, you can expect the following process:

1. **Acknowledgment**: We will acknowledge receipt of your vulnerability report within 48 hours.
2. **Verification**: Our security team will work to verify the issue and may ask for additional information.
3. **Remediation Plan**: Once verified, we will develop a remediation plan and timeline.
4. **Fix Development**: We will work on a fix based on the severity of the issue and the remediation plan.
5. **Public Disclosure**: Once the fix is ready, we will coordinate with you on the public disclosure of the vulnerability.

### Disclosure Policy

- We follow a coordinated disclosure process.
- We will work with you to understand and resolve the issue quickly.
- We will keep you updated as we work to resolve the issue.
- We will credit you for your discovery (unless you prefer to remain anonymous).

## Security Best Practices for Users

### Application Security

1. **Keep Toast App Updated**: Always use the latest version of Toast App to ensure you have the most recent security patches.
2. **Review Button Actions**: Before adding buttons that execute commands or scripts, review the code to ensure it doesn't perform unwanted actions.
3. **Be Cautious with Custom Scripts**: Only use custom scripts from trusted sources, and review them before adding them to your configuration.
4. **Limit Command Execution**: When creating buttons that execute shell commands, use the principle of least privilege.

### System Security

1. **System Permissions**: Toast App runs with your user permissions. Be aware that any action executed through Toast App will have the same permissions as your user account.
2. **Secure Configuration**: Your Toast App configuration contains your custom buttons and actions. Keep your configuration file secure and consider backing it up regularly.
3. **Network Access**: Be cautious when creating buttons that access network resources or make API calls.

## Security Features

Toast App includes several security features:

1. **Local Storage Only**: By default, Toast App stores all configuration locally and does not send data to remote servers.
2. **Sandboxed Renderer Process**: The UI components run in a sandboxed environment to prevent unauthorized access to system resources.
3. **Input Validation**: Toast App validates all user input to prevent injection attacks.
4. **Permission Controls**: Toast App requests only the permissions it needs to function.

## Security Roadmap

We are continuously working to improve the security of Toast App. Our security roadmap includes:

1. **Regular Security Audits**: Conducting regular code reviews and security audits.
2. **Dependency Scanning**: Monitoring and updating dependencies to address known vulnerabilities.
3. **Enhanced Sandboxing**: Improving the isolation of executed commands and scripts.
4. **Improved Error Handling**: Enhancing error handling to prevent information leakage.

## Security FAQ

**Q: Is my configuration data sent to any servers?**
A: No, Toast App stores all configuration data locally on your device and does not transmit it to any remote servers.

**Q: Can Toast App buttons execute malicious code?**
A: Toast App buttons can execute the commands and scripts you configure. Always review and understand any commands or scripts before adding them to your configuration, especially if they come from third-party sources.

**Q: How does Toast App handle sensitive information?**
A: Toast App does not collect or store sensitive information. Any sensitive data used in your custom buttons (like API keys) is stored locally in your configuration file.

**Q: Is communication between the main process and renderer process secure?**
A: Yes, communication between the main process and renderer process uses Electron's IPC mechanism, which is designed to be secure when properly implemented. We follow Electron's security best practices to ensure this communication is protected.

---

This security policy is subject to change. Please check back regularly for updates.
