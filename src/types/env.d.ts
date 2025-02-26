/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string
          callback: (response: { credential: string }) => void
          auto_select?: boolean
          cancel_on_tap_outside?: boolean
          ux_mode?: 'popup' | 'redirect'
          context?: 'signin' | 'signup' | 'use'
          itp_support?: boolean
        }) => void
        renderButton: (
          element: HTMLElement,
          options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black'
            size?: 'large' | 'medium' | 'small'
            type?: 'standard' | 'icon'
            shape?: 'rectangular' | 'pill' | 'circle' | 'square'
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
            logo_alignment?: 'left' | 'center'
            width?: number
          }
        ) => void
        prompt: () => void
      }
    }
  }
} 