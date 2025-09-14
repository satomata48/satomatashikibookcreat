/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Noto Sans JP', 'sans-serif'],
			},
		},
	},
	plugins: [
		require('@tailwindcss/typography'),
		require('daisyui'),
	],
	daisyui: {
		themes: [
			{
				light: {
					"primary": "#3B82F6",
					"secondary": "#8B5CF6",
					"accent": "#10B981",
					"neutral": "#374151",
					"base-100": "#FFFFFF",
					"info": "#3ABFF8",
					"success": "#36D399",
					"warning": "#FBBD23",
					"error": "#F87272",
				},
				dark: {
					"primary": "#60A5FA",
					"secondary": "#A78BFA",
					"accent": "#34D399",
					"neutral": "#D1D5DB",
					"base-100": "#1F2937",
					"info": "#3ABFF8",
					"success": "#36D399",
					"warning": "#FBBD23",
					"error": "#F87272",
				},
			},
		],
	},
};