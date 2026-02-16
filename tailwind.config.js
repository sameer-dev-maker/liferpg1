/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./index.tsx",
    ],
    theme: {
        extend: {
            fontFamily: {
                display: ['Rajdhani', 'sans-serif'],
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                slate: {
                    950: '#020617',
                },
            },
            animation: {
                'gradient-x': 'gradient-x 15s ease infinite',
            },
            keyframes: {
                'gradient-x': {
                    '0%, 100%': {
                        'background-size': '200% 200%',
                        'background-position': 'left center',
                    },
                    '50%': {
                        'background-size': '200% 200%',
                        'background-position': 'right center',
                    },
                },
            },
        },
    },
    plugins: [],
}
