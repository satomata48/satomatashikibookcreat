import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase';
import Epub from 'epub-gen-memory';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// DOMPurifyの設定（サーバーサイド）
const window = new JSDOM('').window;
const createDOMPurify = DOMPurify(window as any);

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

interface EpubOptions {
	bookId: string;
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

// HTMLをサニタイズ
const sanitizeContent = (html: string): string => {
	return createDOMPurify.sanitize(html, {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr'],
		ALLOWED_ATTR: []
	});
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const supabase = createClient({ cookies });
		
		// セッション確認
		const { data: { session }, error: sessionError } = await supabase.auth.getSession();
		if (sessionError || !session) {
			throw error(401, 'Unauthorized');
		}

		const options: EpubOptions = await request.json();
		const { bookId, template, authorName, language, generateToc } = options;

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

		// 章データをEPUB形式に変換
		const epubChapters = (chapters as Chapter[]).map((chapter, index) => ({
			title: chapter.title || `第${index + 1}章`,
			data: sanitizeContent(chapter.content || ''),
			filename: `chapter-${chapter.order_index}.html`
		}));

		// EPUB生成オプション
		const epubOptions = {
			title: book.title,
			author: authorName || 'Anonymous',
			language: language || 'ja',
			description: book.description || '',
			publisher: 'Kindle Book Maker',
			date: new Date().toISOString(),
			content: epubChapters,
			css: getTemplateCSS(template),
			tocTitle: generateToc ? '目次' : undefined,
			appendChapterTitles: generateToc
		};

		// EPUB生成
		const epubBuffer = await new Promise<Buffer>((resolve, reject) => {
			new Epub(epubOptions, (err: Error | null, content: Buffer) => {
				if (err) {
					console.error('EPUB generation error:', err);
					reject(err);
				} else {
					resolve(content);
				}
			});
		});

		// レスポンスヘッダー設定
		const headers = new Headers();
		headers.set('Content-Type', 'application/epub+zip');
		headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(book.title)}.epub"`);
		headers.set('Content-Length', epubBuffer.length.toString());

		return new Response(epubBuffer, { headers });

	} catch (err) {
		console.error('EPUB generation error:', err);
		if (err instanceof Error) {
			throw error(500, err.message);
		}
		throw error(500, 'Internal server error');
	}
};