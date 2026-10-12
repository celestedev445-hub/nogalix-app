export {};

type GoogleCodeClient = {
  requestCode: () => void;
};

type GoogleTokenClient = {
  requestAccessToken: () => void;
};

type GoogleIdentityApi = {
  accounts: {
    id?: {
      initialize: (config: Record<string, unknown>) => void;
      prompt: () => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
    oauth2?: {
      initCodeClient: (config: {
        client_id: string;
        scope: string;
        ux_mode: "popup" | "redirect";
        callback: (response: { code?: string; error?: string }) => void;
        error_callback?: () => void;
      }) => GoogleCodeClient;
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { access_token?: string; error?: string }) => void;
        error_callback?: () => void;
      }) => GoogleTokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}
