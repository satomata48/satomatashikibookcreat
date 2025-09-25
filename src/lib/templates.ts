export interface Template {
	id: string;
	name: string;
	description: string;
	icon: string;
	features: string[];
	previewStyle: string;
	cssStyles: string;
	pageSetup?: {
		size: string;
		margin: string;
	};
}

export const templates: Template[] = [
	{
		id: 'simple',
		name: '標準テンプレート',
		description: 'シンプルで読みやすい基本的なレイアウト',
		icon: '📄',
		features: ['基本的な見出しスタイル', 'スタンダードな行間', 'ミニマルデザイン'],
		previewStyle: `
			font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
			line-height: 1.7;
			font-size: 16px;
			color: #333;
		`,
		cssStyles: `
			body {
				font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
				font-size: 16px;
				line-height: 1.7;
				color: #333;
				max-width: 800px;
				margin: 0 auto;
				padding: 2rem;
			}
			h1 {
				font-size: 28px;
				font-weight: bold;
				margin: 2rem 0 1rem 0;
				border-bottom: 2px solid #ddd;
				padding-bottom: 0.5rem;
			}
			h2 {
				font-size: 24px;
				font-weight: bold;
				margin: 1.5rem 0 1rem 0;
				color: #444;
			}
			h3 {
				font-size: 20px;
				font-weight: bold;
				margin: 1.2rem 0 0.8rem 0;
				color: #555;
			}
			p {
				margin-bottom: 1rem;
			}
			blockquote {
				margin: 1rem 0;
				padding: 1rem;
				background: #f9f9f9;
				border-left: 4px solid #ddd;
			}
		`
	},
	{
		id: 'a4-print',
		name: 'A4印刷レイアウト',
		description: '印刷を考慮したA4サイズのページデザイン',
		icon: '📋',
		features: ['A4サイズ最適化', 'ページマージン調整', '印刷フレンドリー'],
		previewStyle: `
			font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
			font-size: 12pt;
			line-height: 1.6;
			text-align: justify;
			max-width: 21cm;
			padding: 2.5cm;
			background: white;
			box-shadow: 0 0 10px rgba(0,0,0,0.1);
			color: #333;
		`,
		cssStyles: `
			body {
				font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
				font-size: 12pt;
				line-height: 1.6;
				text-align: justify;
				color: #333;
				width: 210mm;
				min-height: 297mm;
				margin: 0 auto;
				padding: 25mm;
				background: white;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
			}
			h1 {
				font-size: 18pt;
				text-align: center;
				margin-bottom: 2em;
				border-bottom: 1px solid #333;
				padding-bottom: 0.5em;
				page-break-after: avoid;
			}
			h2 {
				font-size: 14pt;
				border-bottom: 1px solid #333;
				padding-bottom: 0.3em;
				margin-top: 1.5em;
				margin-bottom: 1rem;
				page-break-after: avoid;
			}
			h3 {
				font-size: 12pt;
				margin-top: 1.2em;
				margin-bottom: 0.8em;
				page-break-after: avoid;
			}
			p {
				margin-bottom: 8pt;
				text-align: justify;
				orphans: 2;
				widows: 2;
			}
			blockquote {
				margin: 12pt 0;
				padding: 8pt 12pt;
				border-left: 3pt solid #ccc;
				background-color: #f9f9f9;
			}
		`,
		pageSetup: {
			size: 'A4',
			margin: '25mm'
		}
	},
	{
		id: 'novel',
		name: '小説テンプレート',
		description: '小説に適した縦書き風デザイン',
		icon: '📖',
		features: ['読書に最適な行間', '章区切りデザイン', '目に優しいフォント'],
		previewStyle: `
			font-family: "Noto Serif JP", "Yu Mincho", serif;
			font-size: 14pt;
			line-height: 2.0;
			text-align: justify;
			color: #2c2c2c;
			text-indent: 1em;
			max-width: 600px;
			margin: 0 auto;
			padding: 2rem;
		`,
		cssStyles: `
			body {
				font-family: "Noto Serif JP", "Yu Mincho", serif;
				font-size: 14pt;
				line-height: 2.0;
				text-align: justify;
				color: #2c2c2c;
				max-width: 600px;
				margin: 0 auto;
				padding: 2rem;
			}
			h1 {
				font-size: 20pt;
				text-align: center;
				margin: 2em 0;
				font-weight: normal;
				border-bottom: none;
			}
			h2 {
				font-size: 16pt;
				text-align: center;
				margin-top: 2em;
				margin-bottom: 1em;
				font-weight: normal;
			}
			h3 {
				font-size: 14pt;
				margin-top: 1.5em;
				margin-bottom: 1em;
				font-weight: normal;
			}
			p {
				text-indent: 1em;
				margin-bottom: 1em;
			}
			blockquote {
				margin: 1em 0;
				padding: 1em;
				background: #f9f9f9;
				border-left: 3px solid #ddd;
				font-style: italic;
			}
		`
	},
	{
		id: 'business',
		name: 'ビジネス書テンプレート',
		description: 'ビジネス書や技術書に適したレイアウト',
		icon: '💼',
		features: ['見出し強調', '箇条書き最適化', 'プロフェッショナル'],
		previewStyle: `
			font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
			font-size: 12pt;
			line-height: 1.8;
			color: #1a1a1a;
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
		`,
		cssStyles: `
			body {
				font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
				font-size: 12pt;
				line-height: 1.8;
				color: #1a1a1a;
				max-width: 800px;
				margin: 0 auto;
				padding: 2rem;
			}
			h1 {
				color: #2563eb;
				font-size: 24pt;
				text-align: center;
				margin-bottom: 1.5em;
				font-weight: bold;
				border-bottom: 3px solid #2563eb;
				padding-bottom: 0.5em;
			}
			h2 {
				color: #2563eb;
				font-size: 18pt;
				border-bottom: 2px solid #2563eb;
				padding-bottom: 0.3em;
				margin-top: 1.5em;
				margin-bottom: 1rem;
			}
			h3 {
				color: #2563eb;
				font-size: 14pt;
				margin-top: 1.2em;
				margin-bottom: 0.8em;
				border-left: 4px solid #2563eb;
				padding-left: 0.5em;
			}
			p {
				margin-bottom: 1em;
			}
			blockquote {
				margin: 1em 0;
				padding: 1rem;
				background: #f0f9ff;
				border-left: 4px solid #2563eb;
				color: #1e40af;
			}
			ul, ol {
				margin-bottom: 1em;
				padding-left: 2em;
			}
			li {
				margin-bottom: 0.5em;
			}
		`
	},
	{
		id: 'satomata',
		name: 'さとまた式',
		description: 'Source Han Sans JP太字のA4レイアウト',
		icon: '🌟',
		features: ['A4サイズ最適化', 'Source Han Sans JP太字', 'シンプルレイアウト', '印刷対応'],
		previewStyle: `
			font-family: "Source Han Sans JP", "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
			font-weight: bold;
			font-size: 12pt;
			line-height: 1.6;
			color: #3F51B5;
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
			background: white;
		`,
		cssStyles: `
			body {
				font-family: "Source Han Sans JP", "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
				font-weight: bold;
				font-size: 12pt;
				line-height: 1.6;
				color: #3F51B5;
				width: 210mm;
				min-height: 297mm;
				margin: 0 auto;
				padding: 25mm;
				background: white;
			}
			
			* {
				font-family: "Source Han Sans JP", "Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif;
				font-weight: bold;
				color: #3F51B5;
			}
			
			h1 {
				font-size: 18pt;
				font-weight: bold;
				margin-bottom: 1rem;
				page-break-after: avoid;
			}
			
			h2 {
				font-size: 16pt;
				font-weight: bold;
				color: #3F51B5;
				margin-top: 1.5rem;
				margin-bottom: 1rem;
				page-break-after: avoid;
			}
			
			h3 {
				font-size: 14pt;
				font-weight: bold;
				margin-top: 1.2rem;
				margin-bottom: 0.8rem;
				page-break-after: avoid;
			}
			
			p {
				margin-bottom: 1rem;
				font-weight: bold;
				color: #3F51B5;
			}
			
			ul, ol {
				margin-bottom: 1rem;
				padding-left: 2rem;
			}
			
			li {
				margin-bottom: 0.5rem;
				font-weight: bold;
			}
			
			blockquote {
				margin: 1rem 0;
				padding: 1rem;
				background: #f9f9f9;
				border-left: 4px solid #ddd;
				font-weight: bold;
			}
			
			/* あいさつ部分の特別スタイリング */
			.greeting-section {
				font-size: 16pt;
				font-weight: bold;
				color: #3F51B5;
				margin-bottom: 2rem;
				padding-bottom: 1.5rem;
				border-bottom: 2px solid #3F51B5;
			}
			
			/* あいさつ見出しが含まれる段落の識別 */
			p:first-of-type {
				font-size: 16pt;
				font-weight: bold;
				color: #3F51B5;
				margin-bottom: 2rem;
				padding-bottom: 1.5rem;
				border-bottom: 2px solid #3F51B5;
			}
			
			/* 章区切りでページブレーク */
			.chapter:not(:first-child) {
				page-break-before: always;
				margin-top: 0;
				padding-top: 0;
			}
		`,
		pageSetup: {
			size: 'A4',
			margin: '25mm'
		}
	},
	{
		id: 'essay',
		name: 'エッセイテンプレート',
		description: '章タイトル右上表示とH1改ページ機能付きエッセイスタイル',
		icon: '✍️',
		features: ['章タイトル右上表示', 'H1タグで自動改ページ', '上品なフォント', 'A4最適化'],
		previewStyle: `
			font-family: "Noto Serif JP", "Yu Mincho", serif;
			font-size: 13pt;
			line-height: 1.8;
			color: #2c2c2c;
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
			background: white;
		`,
		cssStyles: `
			body {
				font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif;
				font-weight: bold;
				font-size: 13pt;
				line-height: 1.8;
				color: #3F51B5;
				width: 210mm;
				min-height: 297mm;
				margin: 0 auto;
				padding: 25mm;
				background: white;
				position: relative;
			}

			.chapter-title-header {
				position: absolute;
				top: 15mm;
				right: 25mm;
				font-size: 12pt;
				color: #E91E63;
				font-weight: bold;
				text-align: right;
			}

			h1 {
				font-size: 20pt;
				text-align: center;
				margin: 2em 0;
				font-weight: bold;
				color: #3F51B5;
				page-break-before: always;
				page-break-after: avoid;
			}

			h1:first-child {
				page-break-before: auto;
			}

			h2 {
				font-size: 16pt;
				margin-top: 2em;
				margin-bottom: 1em;
				font-weight: bold;
				color: #3F51B5;
				border-bottom: 1px solid #ddd;
				padding-bottom: 0.5em;
			}

			h3 {
				font-size: 14pt;
				margin-top: 1.5em;
				margin-bottom: 1em;
				font-weight: bold;
				color: #3F51B5;
			}

			p {
				margin-bottom: 1.2em;
				text-align: justify;
				text-indent: 1em;
				font-weight: bold;
				color: #3F51B5;
				orphans: 2;
				widows: 2;
			}

			blockquote {
				margin: 1.5em 0;
				padding: 1em 1.5em;
				border-left: 3px solid #ccc;
				background-color: #f9f9f9;
				font-style: italic;
			}

			ul, ol {
				margin-bottom: 1.2em;
				padding-left: 2em;
			}

			li {
				margin-bottom: 0.5em;
			}
		`,
		pageSetup: {
			size: 'A4',
			margin: '25mm'
		}
	},
	{
		id: 'satomata-life-lessons',
		name: 'さとまた式人生の教え',
		description: '章タイトル右上表示とH1改ページ機能付きエッセイスタイル',
		icon: '🌟',
		features: ['章タイトル右上表示', 'H1タグで自動改ページ', '上品なフォント', 'A4最適化'],
		previewStyle: `
			font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif;
			font-weight: normal;
			font-size: 13pt;
			line-height: 1.8;
			color: #333;
			max-width: 800px;
			margin: 0 auto;
			padding: 2rem;
			background: white;
		`,
		cssStyles: `
			body {
				font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif;
				font-weight: normal;
				font-size: 13pt;
				line-height: 1.8;
				color: #333;
				width: 210mm;
				min-height: 297mm;
				margin: 0 auto;
				padding: 25mm;
				background: white;
				position: relative;
			}

			.chapter-title-header {
				position: absolute;
				top: 15mm;
				right: 25mm;
				font-size: 12pt;
				color: #E91E63;
				font-weight: bold;
				text-align: right;
			}

			h1 {
				font-size: 20pt;
				text-align: center;
				margin: 2em 0;
				font-weight: bold;
				color: #3F51B5;
				page-break-before: always;
				page-break-after: avoid;
			}

			h1:first-child {
				page-break-before: auto;
			}

			h2 {
				font-size: 16pt;
				margin-top: 2em;
				margin-bottom: 1em;
				font-weight: bold;
				color: #3F51B5;
				border-bottom: 1px solid #ddd;
				padding-bottom: 0.5em;
			}

			h3 {
				font-size: 14pt;
				margin-top: 1.5em;
				margin-bottom: 1em;
				font-weight: bold;
				color: #3F51B5;
			}

			p {
				margin-bottom: 1.2em;
				text-align: justify;
				text-indent: 1em;
				font-weight: normal;
				color: #333;
				orphans: 2;
				widows: 2;
			}

			blockquote {
				margin: 1.5em 0;
				padding: 1em 1.5em;
				border-left: 3px solid #ccc;
				background-color: #f9f9f9;
				font-style: italic;
				font-weight: normal;
				color: #333;
			}

			ul, ol {
				margin-bottom: 1.2em;
				padding-left: 2em;
			}

			li {
				margin-bottom: 0.5em;
				font-weight: normal;
				color: #333;
			}
		`,
		pageSetup: {
			size: 'A4',
			margin: '25mm'
		}
	}
];

export function getTemplate(id: string): Template | undefined {
	return templates.find(template => template.id === id);
}

export function getTemplateCSS(id: string): string {
	const template = getTemplate(id);
	return template?.cssStyles || templates[0].cssStyles;
}

export function getTemplatePreviewStyle(id: string): string {
	const template = getTemplate(id);
	return template?.previewStyle || templates[0].previewStyle;
}