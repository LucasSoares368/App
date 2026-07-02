export const APP_ORIGIN = "https://app.localfiny.com";
export const LANDING_ORIGIN = "https://localfiny.com";
export const APP_AUTH_URL = `${APP_ORIGIN}/#/auth`;
export const APP_RESET_PASSWORD_URL = `${APP_ORIGIN}/#/reset-password`;

export const goToAppAuth = () => {
  window.location.assign(APP_AUTH_URL);
};

export const goToLanding = () => {
  window.location.assign(LANDING_ORIGIN);
};
