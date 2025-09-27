import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase';
import puppeteer from 'puppeteer';
import { convert } from 'html-to-text';
import { getTemplateCSS as getSharedTemplateCSS } from '$lib/templates';

interface Chapter {
	id: string;
	title: string;
	content: string;
	order_index: number;
	word_count: number;
}

interface Book {
	id: string;
	title: string;
	description: string;
	user_id: string;
}

interface ExportOptions {
	bookId: string;
	format: 'epub' | 'pdf' | 'jpeg';
	template: string;
	authorName: string;
	language: string;
	generateToc: boolean;
}

// テンプレート別のCSS設定
const getTemplateCSS = (template: string): string => {
	const baseCSS = `
		body { 
			font-family: "Noto Sans JP", "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Meiryo", sans-serif; 
			line-height: 1.7; 
			margin: 0; 
			padding: 20px; 
		}
		h1, h2, h3, h4, h5, h6 { 
			font-weight: bold; 
			margin-top: 1.5em; 
			margin-bottom: 0.5em; 
		}
		p { 
			margin-bottom: 1em; 
		}
		blockquote { 
			margin: 1em 0; 
			padding-left: 1em; 
			border-left: 3px solid #ddd; 
		}
	`;

	switch (template) {
		case 'a4-print':
			return baseCSS + `
				@page { 
					size: A4; 
					margin: 2.5cm; 
				}
				body { 
					font-size: 11pt; 
					line-height: 1.6; 
					text-align: justify; 
				}
				h1 { 
					page-break-before: always; 
					font-size: 18pt; 
					text-align: center; 
					margin-bottom: 2em; 
				}
				h2 { 
					font-size: 14pt; 
					border-bottom: 1px solid #333; 
				}
				h3 { 
					font-size: 12pt; 
				}
			`;
		case 'novel':
			return baseCSS + `
				body { 
					font-size: 14pt; 
					line-height: 2.0; 
					text-align: justify; 
					font-family: "Noto Serif JP", "Yu Mincho", serif; 
				}
				h1 { 
					text-align: center; 
					font-size: 20pt; 
					margin: 2em 0; 
					page-break-before: always; 
				}
				h2 { 
					font-size: 16pt; 
					margin-top: 2em; 
				}
				p { 
					text-indent: 1em; 
					margin-bottom: 0.5em; 
				}
			`;
		case 'business':
			return baseCSS + `
				body { 
					font-size: 12pt; 
					line-height: 1.8; 
				}
				h1 { 
					color: #2563eb; 
					font-size: 24pt; 
					text-align: center; 
					margin-bottom: 1.5em; 
				}
				h2 { 
					color: #2563eb; 
					font-size: 16pt; 
					border-bottom: 2px solid #2563eb; 
					padding-bottom: 0.3em; 
				}
				h3 { 
					color: #4338ca; 
					font-size: 14pt; 
				}
				ul, ol { 
					padding-left: 2em; 
				}
				li { 
					margin-bottom: 0.5em; 
				}
			`;
		default: // simple
			return baseCSS + `
				body { 
					font-size: 13pt; 
				}
				h1 { 
					font-size: 20pt; 
					margin-bottom: 1em; 
				}
				h2 { 
					font-size: 16pt; 
				}
				h3 { 
					font-size: 14pt; 
				}
			`;
	}
};

// ページブレークでコンテンツを分割する関数
const splitContentByPageBreaks = (content: string): { content: string, isPageBreakContent: boolean }[] => {
	if (!content) return [{ content: '', isPageBreakContent: false }];

	let parts: { content: string, isPageBreakContent: boolean }[] = [];

	// 方法1: <pagebreak>...</pagebreak> 囲みタグ形式を探す
	const wrappedPageBreakPattern = /<pagebreak[^>]*>(.*?)<\/pagebreak>/gis;
	const wrappedMatches = content.match(wrappedPageBreakPattern);

	if (wrappedMatches && wrappedMatches.length > 0) {
		// 囲みタグ形式の場合
		let lastIndex = 0;
		let match;
		const regex = /<pagebreak[^>]*>(.*?)<\/pagebreak>/gis;

		while ((match = regex.exec(content)) !== null) {
			// pagebreakタグより前の内容
			if (match.index > lastIndex) {
				const beforeContent = content.substring(lastIndex, match.index).trim();
				if (beforeContent) {
					parts.push({ content: beforeContent, isPageBreakContent: false });
				}
			}

			// pagebreakタグで囲まれた内容
			const wrappedContent = match[1].trim();
			if (wrappedContent) {
				parts.push({ content: wrappedContent, isPageBreakContent: true });
			}

			lastIndex = match.index + match[0].length;
		}

		// 最後の部分
		if (lastIndex < content.length) {
			const remaining = content.substring(lastIndex).trim();
			if (remaining) {
				parts.push({ content: remaining, isPageBreakContent: false });
			}
		}
	} else {
		// 方法2: 単独<pagebreak>タグで分割
		const singlePageBreakPattern = /<pagebreak\s*\/?>/gi;
		const splitParts = content.split(singlePageBreakPattern);

		// pagebreakタグがない場合は、H1タグで分割を試す
		if (splitParts.length === 1) {
			const h1Parts = content.split(/(?=<h1[^>]*>)/gi);
			parts = h1Parts.filter(part => part.trim() !== '').map(part => ({ content: part.trim(), isPageBreakContent: false }));
		} else {
			parts = splitParts.filter(part => part.trim() !== '').map(part => ({ content: part.trim(), isPageBreakContent: false }));
		}
	}

	if (parts.length === 0) {
		return [{ content: content, isPageBreakContent: false }];
	}

	return parts;
};

// HTMLを生成
const generateHTML = (book: Book, chapters: Chapter[], options: ExportOptions): string => {
	// Satomata Life Lessonsテンプレート用のA4レイアウトCSS
	const satomataLifeLessonsCSS = `
		body {
			font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
			margin: 0;
			padding: 0;
			background: white;
		}
		.a4-page {
			width: 210mm;
			min-height: 297mm;
			background: white;
			margin: 0;
			padding: 10mm;
			box-shadow: none;
			break-after: page;
			position: relative;
		}
		.a4-page * {
			font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
			line-height: 1.8 !important;
		}
		.a4-page h1 {
			font-size: 30pt !important;
			text-align: left !important;
			margin: 2em 0 !important;
			font-weight: bold !important;
			color: #3F51B5 !important;
			page-break-before: always !important;
			page-break-after: avoid !important;
		}
		.a4-page h1:first-child {
			page-break-before: auto !important;
		}
		.a4-page h2 {
			font-size: 16pt !important;
			margin-top: 2em !important;
			margin-bottom: 1em !important;
			font-weight: bold !important;
			color: #3F51B5 !important;
			border-bottom: 1px solid #ddd !important;
			padding-bottom: 0.5em !important;
		}
		.a4-page h3 {
			font-size: 14pt !important;
			margin-top: 1.5em !important;
			margin-bottom: 1em !important;
			font-weight: bold !important;
			color: #3F51B5 !important;
		}
		.a4-page p {
			font-size: 13pt !important;
			margin-bottom: 1.2em !important;
			text-align: justify !important;
			text-indent: 1em !important;
			line-height: 1.8 !important;
			font-weight: normal !important;
			color: #333 !important;
			width: 100% !important;
			max-width: none !important;
			box-sizing: border-box !important;
			word-wrap: break-word !important;
			overflow-wrap: break-word !important;
			display: block !important;
		}
		.page-content.pagebreak-content {
			display: flex !important;
			flex-direction: column !important;
			justify-content: center !important;
			align-items: flex-start !important;
			text-align: left !important;
			flex-grow: 1 !important;
			font-size: 44pt !important;
			line-height: 2.4 !important;
			padding: 25mm 10mm !important;
			min-height: calc(100% - 40mm) !important;
		}
		.page-content.pagebreak-content * {
			font-size: inherit !important;
			line-height: inherit !important;
			text-align: left !important;
			margin-bottom: 2em !important;
			font-weight: bold !important;
			color: #3F51B5 !important;
		}
		.page-content:not(.pagebreak-content) {
			padding: 15mm 10mm 10mm 10mm !important;
			font-size: 13pt !important;
			line-height: 1.8 !important;
			text-align: left !important;
			display: block !important;
			justify-content: flex-start !important;
			align-items: flex-start !important;
			width: 100% !important;
			max-width: none !important;
			box-sizing: border-box !important;
			color: #333333 !important;
		}
		.page-content:not(.pagebreak-content) * {
			color: #3F51B5 !important;
		}
		.page-content:not(.pagebreak-content) h1,
		.page-content:not(.pagebreak-content) h2,
		.page-content:not(.pagebreak-content) h3,
		.page-content:not(.pagebreak-content) h4,
		.page-content:not(.pagebreak-content) h5,
		.page-content:not(.pagebreak-content) h6 {
			color: #3F51B5 !important;
			font-weight: bold !important;
		}
		.page-content:not(.pagebreak-content) strong {
			color: #3F51B5 !important;
			font-weight: bold !important;
		}
		.page-content:not(.pagebreak-content) p {
			color: #3F51B5 !important;
		}
		@page {
			size: A4;
			margin: 0;
		}
	`;

	// Satomata Life Lessonsテンプレートの場合、A4レイアウトでページブレーク処理
	if (options.template === 'satomata-life-lessons') {
		// 各章をページブレークで分割して生成
		let pagesHtml = `<div class="a4-page"><h1 style="color: #3F51B5 !important; font-weight: bold !important; font-size: 30pt !important;">${book.title}</h1></div>`;

		chapters.forEach((chapter, index) => {
			if (chapter.content && chapter.content.trim()) {
				const contentParts = splitContentByPageBreaks(chapter.content);
				contentParts.forEach((part, partIndex) => {
					// pagebreakタグを除去した内容をサニタイズ
					const cleanContent = part.content.replace(/<\/?pagebreak[^>]*>/gi, '');

					if (part.isPageBreakContent) {
						// pagebreak内容は大きく青色太字で表示（章タイトル右上にH3で青色表示）
						pagesHtml += `
							<div class="a4-page">
								<h3 style="position: absolute; top: 8mm; right: 10mm; font-size: 12pt; color: #E91E63; font-weight: bold; text-align: right; margin: 0;">${chapter.title}</h3>
								<div class="page-content pagebreak-content" style="display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; font-size: 44pt; line-height: 2.4; padding: 25mm 10mm; min-height: calc(100% - 40mm);">
									<div style="color: #3F51B5; font-weight: bold;">
										${cleanContent}
									</div>
								</div>
							</div>
						`;
					} else {
						// 通常内容も青色で表示（章タイトル右上にH3で青色表示）
						pagesHtml += `
							<div class="a4-page">
								<h3 style="position: absolute; top: 8mm; right: 10mm; font-size: 12pt; color: #E91E63; font-weight: bold; text-align: right; margin: 0;">${chapter.title}</h3>
								<div class="page-content" style="padding: 15mm 10mm 10mm 10mm; font-size: 13pt; line-height: 1.8; text-align: left;">
									<div style="color: #3F51B5; font-weight: normal;">
										${cleanContent}
									</div>
								</div>
							</div>
						`;
					}
				});
			} else {
				pagesHtml += `
					<div class="a4-page">
						<h3 style="position: absolute; top: 8mm; right: 10mm; font-size: 12pt; color: #3F51B5; font-weight: bold; text-align: right; margin: 0;">${chapter.title}</h3>
						<div class="page-content">
							<p style="color: #999; font-style: italic;">（この章の内容はまだありません）</p>
						</div>
					</div>
				`;
			}
		});

		return `
			<!DOCTYPE html>
			<html lang="${options.language || 'ja'}">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>${book.title}</title>
				<style>${satomataLifeLessonsCSS}</style>
			</head>
			<body>
				${pagesHtml}
			</body>
			</html>
		`;
	}

	// 他のテンプレート用のデフォルト処理
	const css = getSharedTemplateCSS(options.template);
	const chaptersHtml = chapters.map((chapter, index) => `
		<div class="chapter">
			<h2>第${index + 1}章: ${chapter.title}</h2>
			<div class="content">
				${chapter.content || ''}
			</div>
		</div>
	`).join('\n');

	return `
		<!DOCTYPE html>
		<html lang="${options.language || 'ja'}">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>${book.title}</title>
			<style>${css}</style>
		</head>
		<body>
			<h1>${book.title}</h1>
			${options.authorName ? `<p class="author">著者: ${options.authorName}</p>` : ''}
			${book.description ? `<p class="description">${book.description}</p>` : ''}
			${options.generateToc ? `
				<div class="toc">
					<h2>目次</h2>
					<ul>
						${chapters.map((chapter, index) => `
							<li>第${index + 1}章: ${chapter.title}</li>
						`).join('')}
					</ul>
				</div>
			` : ''}
			${chaptersHtml}
		</body>
		</html>
	`;
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const supabase = createClient({ cookies });
		
		// セッション確認
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		if (sessionError || !session) {
			throw error(401, 'Unauthorized');
		}

		const options: ExportOptions = await request.json();
		const { bookId, format, template, authorName, language, generateToc } = options;

		// 書籍データを取得
		const { data: book, error: bookError } = await supabase
			.from('books')
			.select('*')
			.eq('id', bookId)
			.eq('user_id', session.user.id)
			.single();

		if (bookError || !book) {
			throw error(404, 'Book not found');
		}

		// 章データを取得
		const { data: chapters, error: chaptersError } = await supabase
			.from('chapters')
			.select('*')
			.eq('book_id', bookId)
			.order('order_index', { ascending: true });

		if (chaptersError) {
			throw error(500, 'Failed to fetch chapters');
		}

		// HTML生成
		const html = generateHTML(book as Book, (chapters || []) as Chapter[], options);

		// フォーマットに応じた処理
		if (format === 'pdf' || format === 'jpeg') {
			// Puppeteerでブラウザを起動
			const browser = await puppeteer.launch({
				headless: true,
				args: ['--no-sandbox', '--disable-setuid-sandbox']
			});
			const page = await browser.newPage();
			
			// HTMLを設定
			await page.setContent(html, { waitUntil: 'networkidle0' });

			let buffer: Buffer;
			let contentType: string;
			let filename: string;

			if (format === 'pdf') {
				// PDF生成
				buffer = await page.pdf({
					format: template === 'a4-print' ? 'A4' : 'Letter',
					printBackground: true,
					margin: {
						top: '20mm',
						right: '20mm',
						bottom: '20mm',
						left: '20mm'
					}
				});
				contentType = 'application/pdf';
				filename = `${book.title}.pdf`;
			} else {
				// JPEG生成（最初のページのスクリーンショット）
				buffer = await page.screenshot({
					type: 'jpeg',
					quality: 90,
					fullPage: false // 最初のビューポートのみ
				});
				contentType = 'image/jpeg';
				filename = `${book.title}.jpg`;
			}

			await browser.close();

			// レスポンスヘッダー設定
			const headers = new Headers();
			headers.set('Content-Type', contentType);
			headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
			headers.set('Content-Length', buffer.length.toString());

			return new Response(buffer, { headers });

		} else if (format === 'epub') {
			// EPUB生成（簡易版：HTMLをそのまま返す）
			// 本来はepub-gen-memoryを使用するが、エラーが発生しているため簡易版で対応
			const textContent = convert(html, {
				wordwrap: 130
			});

			// 簡易EPUBとしてHTMLファイルを返す
			const headers = new Headers();
			headers.set('Content-Type', 'text/html; charset=utf-8');
			headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.html"`);

			return new Response(html, { headers });
		}

		throw error(400, 'Invalid format');

	} catch (err) {
		console.error('Export generation error:', err);
		if (err instanceof Error) {
			throw error(500, err.message);
		}
		throw error(500, 'Internal server error');
	}
};