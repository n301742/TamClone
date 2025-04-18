import type { Config } from 'tailwindcss';
import PrimeUI from 'tailwindcss-primeui';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{vue,js,ts,jsx,tsx}',
        './node_modules/primevue/**/*.{vue,js,ts,jsx,tsx}',
        // Add specific selectors for PrimeVue components that need Tailwind
        './src/components/**/*.vue',
        './src/views/**/*.vue'
    ],
    darkMode: ['class', '.app-dark'],
    theme: {
        screens: {
            sm: '576px',
            md: '768px',
            lg: '992px',
            xl: '1200px',
            '2xl': '1920px'
        },
        extend: {
            // Add CSS variables from PrimeVue to Tailwind's awareness
            backgroundColor: {
                'surface-0': 'var(--surface-0)',
                'surface-50': 'var(--surface-50)',
                'surface-100': 'var(--surface-100)',
                'surface-200': 'var(--surface-200)', 
                'surface-300': 'var(--surface-300)',
                'surface-400': 'var(--surface-400)',
                'surface-500': 'var(--surface-500)',
                'surface-600': 'var(--surface-600)',
                'surface-700': 'var(--surface-700)', 
                'surface-800': 'var(--surface-800)',
                'surface-900': 'var(--surface-900)'
            },
            textColor: {
                'surface-0': 'var(--surface-0)',
                'surface-50': 'var(--surface-50)',
                'surface-100': 'var(--surface-100)',
                'surface-200': 'var(--surface-200)',
                'surface-300': 'var(--surface-300)', 
                'surface-400': 'var(--surface-400)',
                'surface-500': 'var(--surface-500)',
                'surface-600': 'var(--surface-600)',
                'surface-700': 'var(--surface-700)',
                'surface-800': 'var(--surface-800)',
                'surface-900': 'var(--surface-900)'
            },
            // Add border color variables
            borderColor: {
                'surface-0': 'var(--surface-0)',
                'surface-50': 'var(--surface-50)',
                'surface-100': 'var(--surface-100)',
                'surface-200': 'var(--surface-200)',
                'surface-300': 'var(--surface-300)',
                'surface-400': 'var(--surface-400)',
                'surface-500': 'var(--surface-500)'
            }
        },
    },
    plugins: [
        // @ts-expect-error - PrimeUI plugin configuration is not properly typed
        PrimeUI({
            prefix: '',
            component: {
                // Enable higher specificity for color application
                color: 'primary',
                dark: {
                    selector: '.app-dark'
                }
            },
            // Important: Make Tailwind utility classes override PrimeVue styles
            cssLayerName: 'components',
            // Use higher specificity for Tailwind utilities
            cssUtilities: {
                important: true
            }
        })
    ],
    // Add higher importance to certain utility classes
    safelist: [
        'text-green-600',
        'text-yellow-600',
        'text-red-600',
        'text-blue-500',
        'mb-3',
        'mb-4',
        'w-4'
    ]
} satisfies Config;
