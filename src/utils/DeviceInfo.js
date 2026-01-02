/**
 * Collects device and session information for bug reports and feedback.
 */
export const getDeviceInfo = () => {
    const { userAgent, platform, language } = navigator;
    const { innerWidth, innerHeight } = window;

    return {
        browser: userAgent,
        os: platform,
        language,
        viewport: `${innerWidth}x${innerHeight}`,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        // We could add more specific game state info here if needed later
    };
};

/**
 * Formats device info into a readable string for text-based reports
 */
export const formatDeviceInfo = (info) => {
    return `
--- Device Info ---
Browser: ${info.browser}
OS: ${info.os}
Viewport: ${info.viewport}
URL: ${info.url}
Time: ${info.timestamp}
-------------------
  `.trim();
};
