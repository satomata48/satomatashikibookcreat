<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import DOMPurify from 'dompurify';
	import { templates, getTemplate, getTemplatePreviewStyle } from '$lib/templates';
	import { onMount } from 'svelte';
	import * as monaco from 'monaco-editor';
	
	export let data: PageData;
	
	let selectedChapter: any = null;
	let chapterTitle = '';
	let chapterContent = '';
	let isCreatingChapter = false;
	let isSaving = false;
	let saveStatus = '';
	// 2カラムレイアウトに変更したため、isPreviewModeは不要
	let pageLayout = 'none'; // 'none' または 'a4'
	let selectedTemplate = 'simple'; // テンプレート選択
	let showBookSettings = false;

	// テンプレート別クイックカラーパレット
	const templateColors = {
		'satomata': [
			{ name: 'サトマタブルー', color: '#3F51B5', bg: false },
			{ name: 'ライトブルー', color: '#2196F3', bg: false },
			{ name: 'デープブルー', color: '#1976D2', bg: false },
			{ name: 'ブルーハイライト', color: '#E3F2FD', bg: true },
			{ name: 'ライトハイライト', color: '#BBDEFB', bg: true }
		],
		'satomata-life-lessons': [
			{ name: 'サトマタブルー', color: '#3F51B5', bg: false },
			{ name: 'サトマタピンク', color: '#E91E63', bg: false },
			{ name: 'ディープピンク', color: '#C2185B', bg: false },
			{ name: 'ライトピンク', color: '#F8BBD9', bg: true },
			{ name: 'ブルーハイライト', color: '#E3F2FD', bg: true },
			{ name: 'ピンクハイライト', color: '#FCE4EC', bg: true }
		],
		'essay': [
			{ name: 'エレガントブラック', color: '#2c2c2c', bg: false },
			{ name: 'ディープブラウン', color: '#7c2d12', bg: false },
			{ name: 'ゴールド', color: '#B8860B', bg: false },
			{ name: 'クリームハイライト', color: '#FFF8DC', bg: true },
			{ name: 'ライトグレー', color: '#F5F5F5', bg: true }
		],
		'simple': [
			{ name: 'ブラック', color: '#000000', bg: false },
			{ name: 'グレー', color: '#666666', bg: false },
			{ name: 'レッド', color: '#DC2626', bg: false },
			{ name: 'ブルー', color: '#2563EB', bg: false },
			{ name: 'イエローハイライト', color: '#FEF3C7', bg: true },
			{ name: 'グリーンハイライト', color: '#D1FAE5', bg: true }
		],
		'modern': [
			{ name: 'モダンブルー', color: '#2563EB', bg: false },
			{ name: 'テックグレー', color: '#374151', bg: false },
			{ name: 'アクセントパープル', color: '#7C3AED', bg: false },
			{ name: 'ブルーハイライト', color: '#DBEAFE', bg: true },
			{ name: 'パープルハイライト', color: '#E9D5FF', bg: true }
		],
		'classic': [
			{ name: 'クラシックブラウン', color: '#7c2d12', bg: false },
			{ name: 'ディープレッド', color: '#B91C1C', bg: false },
			{ name: 'フォレストグリーン', color: '#059669', bg: false },
			{ name: 'ベージュハイライト', color: '#FEF7ED', bg: true },
			{ name: 'グリーンハイライト', color: '#ECFDF5', bg: true }
		],
		'minimal': [
			{ name: 'ミニマルグレー', color: '#374151', bg: false },
			{ name: 'アクセントブルー', color: '#0EA5E9', bg: false },
			{ name: 'ソフトブラック', color: '#1F2937', bg: false },
			{ name: 'ライトグレーハイライト', color: '#F9FAFB', bg: true },
			{ name: 'ブルーハイライト', color: '#E0F2FE', bg: true }
		]
	};

	// 現在のテンプレートのカラーパレットを取得
	$: currentColors = templateColors[selectedTemplate] || templateColors['simple'];
	
	// 改行を保持してHTMLをサニタイズする関数
	function sanitizeWithLineBreaks(content: string): string {
		if (!content) return '';
		// プレーンテキストの改行を<br>タグに変換
		const contentWithBreaks = content.replace(/\n/g, '<br>');
		// pagebreakタグを除去（分割処理で使用するため表示には不要）
		const contentWithoutPagebreaks = contentWithBreaks.replace(/<\/?pagebreak[^>]*>/gi, '');
		return DOMPurify.sanitize(contentWithoutPagebreaks, {
			ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
			ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
			KEEP_CONTENT: true
		});
	}

	// エッセイテンプレート用：カスタムページブレークタグで章内容を分割する関数
	function splitContentByPageBreaks(content: string): { content: string, isPageBreakContent: boolean }[] {
		if (!content) return [{ content: '', isPageBreakContent: false }];

		// デバッグ用ログ
		console.log('Original content:', content);

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

		console.log('Split parts:', parts);

		if (parts.length === 0) {
			return [{ content: content, isPageBreakContent: false }];
		}

		console.log('Final parts:', parts);
		return parts;
	}

	// HTMLを安全にサニタイズする関数（改行を保持）
	$: safeHtml = sanitizeWithLineBreaks(chapterContent || '');
	
	// デバッグ用: プレビューの状態をログ出力（2カラムレイアウトでは不要）
	// $: if (typeof window !== 'undefined') {
	//	console.log('Chapter content:', chapterContent?.substring(0, 100));
	//	console.log('Safe HTML:', safeHtml?.substring(0, 100));
	// }
	
	$: bookId = $page.params.id;
	$: chapters = data.chapters;
	$: book = data.book;
	
	// 書籍のメタデータからページレイアウトとテンプレート設定を復元
	$: if (book?.metadata?.pageLayout) {
		pageLayout = book.metadata.pageLayout;
	}
	$: if (book?.metadata?.template) {
		selectedTemplate = book.metadata.template;
	}
	
	// 選択されたテンプレートのスタイルを取得
	$: templateStyle = getTemplatePreviewStyle(selectedTemplate);
	
	
	// 最初の章を選択、なければ新規章作成モードにする
	$: if (chapters.length > 0 && !selectedChapter && !isCreatingChapter) {
		selectChapter(chapters[0]);
	} else if (chapters.length === 0 && !isCreatingChapter) {
		createNewChapter();
	}

	// 書籍が読み込まれたら画像も読み込み
	$: if (book && bookId) {
		loadBookImages();
	}
	
	function selectChapter(chapter: any) {
		selectedChapter = chapter;
		chapterTitle = chapter.title;
		chapterContent = chapter.content || '';
		isCreatingChapter = false;

		// Monaco Editorの内容を更新
		if (monacoEditor) {
			monacoEditor.setValue(chapterContent);
		}

		// 自動保存用の追跡変数を更新
		lastTitle = chapterTitle;
		lastContent = chapterContent;

		// 既存の自動保存タイマーをクリア
		clearTimeout(saveTimeout);
	}
	
	function createNewChapter() {
		// 自動保存のタイマーをクリア
		clearTimeout(saveTimeout);

		selectedChapter = null;
		chapterTitle = '';
		chapterContent = '';
		isCreatingChapter = true;

		// Monaco Editorの内容をクリア
		if (monacoEditor) {
			monacoEditor.setValue('');
		}

		// 自動保存用の追跡変数を更新
		lastTitle = '';
		lastContent = '';
	}

	// HTMLフォーマット関数（Monaco Editor対応）
	function insertHtmlTag(tag: string, color?: string) {
		if (!monacoEditor) return;

		const selection = monacoEditor.getSelection();
		const selectedText = selection ? monacoEditor.getModel()?.getValueInRange(selection) || '' : '';

		let insertText = '';
		switch(tag) {
			case 'bold':
				insertText = `<strong>${selectedText}</strong>`;
				break;
			case 'italic':
				insertText = `<em>${selectedText}</em>`;
				break;
			case 'h1':
				insertText = `<h1>${selectedText || '見出し1'}</h1>`;
				break;
			case 'h2':
				insertText = `<h2>${selectedText || '見出し2'}</h2>`;
				break;
			case 'h3':
				insertText = `<h3>${selectedText || '見出し3'}</h3>`;
				break;
			case 'p':
				insertText = `<p>${selectedText}</p>`;
				break;
			case 'br':
				insertText = '<br>';
				break;
			case 'hr':
				insertText = '<hr>';
				break;
			case 'ul':
				insertText = `<ul>\n<li>${selectedText || 'リスト項目'}</li>\n</ul>`;
				break;
			case 'ol':
				insertText = `<ol>\n<li>${selectedText || 'リスト項目'}</li>\n</ol>`;
				break;
			case 'link':
				const url = prompt('リンクURLを入力してください:', 'https://');
				if (url) {
					insertText = `<a href="${url}" target="_blank" rel="noopener noreferrer">${selectedText || 'リンクテキスト'}</a>`;
				} else {
					return;
				}
				break;
			case 'blockquote':
				insertText = `<blockquote>${selectedText || '引用文'}</blockquote>`;
				break;
			case 'pagebreak':
				insertText = '<pagebreak>\n  改ページ\n</pagebreak>';
				break;
			case 'image':
				if (color) { // colorパラメータを画像URLとして使用
					const altText = selectedText || '画像';
					insertText = `<img src="${color}" alt="${altText}" style="max-width: 100%; height: auto; margin: 1em 0;" />`;
				} else {
					return;
				}
				break;
			case 'textcolor':
				if (color) {
					insertText = `<span style="color: ${color};">${selectedText || 'カラーテキスト'}</span>`;
				} else {
					return;
				}
				break;
			case 'bgcolor':
				if (color) {
					insertText = `<span style="background-color: ${color};">${selectedText || 'ハイライト'}</span>`;
				} else {
					return;
				}
				break;
		}

		// Monaco Editorに挿入
		if (selection) {
			monacoEditor.executeEdits('insert-html-tag', [{
				range: selection,
				text: insertText
			}]);
		} else {
			// 選択がない場合は現在のカーソル位置に挿入
			const position = monacoEditor.getPosition();
			if (position) {
				monacoEditor.executeEdits('insert-html-tag', [{
					range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
					text: insertText
				}]);
			}
		}

		// フォーカスを戻す
		monacoEditor.focus();
	}

	// カラーピッカー関数
	function openColorPicker(type: 'textcolor' | 'bgcolor') {
		const colorInput = document.createElement('input');
		colorInput.type = 'color';
		colorInput.style.opacity = '0';
		colorInput.style.position = 'absolute';
		colorInput.style.top = '-1000px';
		document.body.appendChild(colorInput);

		colorInput.addEventListener('change', (e) => {
			const target = e.target as HTMLInputElement;
			const color = target.value;
			insertHtmlTag(type, color);
			document.body.removeChild(colorInput);
		});

		colorInput.click();
	}

	// クイックカラー適用関数
	function applyQuickColor(color: string, isBg: boolean) {
		const type = isBg ? 'bgcolor' : 'textcolor';
		insertHtmlTag(type, color);
	}


	// HTMLタグ検出機能
	function detectHtmlTags(content: string): { tag: string, count: number, color: string }[] {
		if (!content) return [];

		const tagPatterns = [
			{ pattern: /<h1[^>]*>[\s\S]*?<\/h1>/gi, name: 'H1見出し', color: 'text-red-600' },
			{ pattern: /<h2[^>]*>[\s\S]*?<\/h2>/gi, name: 'H2見出し', color: 'text-red-600' },
			{ pattern: /<h3[^>]*>[\s\S]*?<\/h3>/gi, name: 'H3見出し', color: 'text-red-600' },
			{ pattern: /<strong[^>]*>[\s\S]*?<\/strong>/gi, name: '太字', color: 'text-red-600' },
			{ pattern: /<em[^>]*>[\s\S]*?<\/em>/gi, name: '斜体', color: 'text-red-600' },
			{ pattern: /<pagebreak[^>]*>[\s\S]*?<\/pagebreak>/gi, name: '改ページ', color: 'text-blue-600' },
			{ pattern: /<br\s*\/?>/gi, name: '改行', color: 'text-blue-600' },
			{ pattern: /<hr\s*\/?>/gi, name: '区切り線', color: 'text-blue-600' },
			{ pattern: /<span\s+style="color:[^"]*"[^>]*>[\s\S]*?<\/span>/gi, name: '文字色', color: 'text-purple-600' },
			{ pattern: /<span\s+style="background-color:[^"]*"[^>]*>[\s\S]*?<\/span>/gi, name: 'ハイライト', color: 'text-yellow-600' }
		];

		const detectedTags = tagPatterns.map(({ pattern, name, color }) => {
			const matches = content.match(pattern) || [];
			return { tag: name, count: matches.length, color };
		}).filter(item => item.count > 0);

		return detectedTags;
	}

	// 検出されたHTMLタグのリアクティブ変数
	$: detectedTags = detectHtmlTags(chapterContent || '');

	// Monaco Editor関連
	let editorContainer: HTMLDivElement;
	let monacoEditor: monaco.editor.IStandaloneCodeEditor;

	// Monaco Editor初期化
	onMount(async () => {
		if (editorContainer) {
			// Web Worker無効化（シンプルな解決策）
			self.MonacoEnvironment = {
				getWorker: function () {
					return null;
				}
			};

			// カスタムHTMLテーマ定義
			monaco.editor.defineTheme('html-custom', {
				base: 'vs',
				inherit: true,
				rules: [
					// HTMLタグ全般
					{ token: 'tag', foreground: 'ea580c' },
					{ token: 'tag.id.html', foreground: 'ea580c' },
					{ token: 'tag.class.html', foreground: 'ea580c' },
					{ token: 'attribute.name.html', foreground: '059669' },
					{ token: 'attribute.value.html', foreground: '0EA5E9' },
					{ token: 'string.html', foreground: '0EA5E9' },
					// テキスト
					{ token: '', foreground: '374151' }
				],
				colors: {
					'editor.background': '#ffffff'
				}
			});

			// Monaco Editor作成
			monacoEditor = monaco.editor.create(editorContainer, {
				value: chapterContent || '',
				language: 'html',
				theme: 'html-custom',
				fontSize: 14,
				fontFamily: 'JetBrains Mono, Fira Code, Monaco, Cascadia Code, Roboto Mono, monospace',
				lineNumbers: 'on',
				minimap: { enabled: false },
				wordWrap: 'on',
				automaticLayout: true,
				scrollBeyondLastLine: false,
				renderWhitespace: 'selection',
				suggestOnTriggerCharacters: false,
				acceptSuggestionOnEnter: 'off',
				tabCompletion: 'off',
				wordBasedSuggestions: 'off',
				parameterHints: { enabled: false },
				quickSuggestions: false
			});

			// 内容変更時のハンドラー
			monacoEditor.onDidChangeModelContent(() => {
				chapterContent = monacoEditor.getValue();
			});
		}

		return () => {
			if (monacoEditor) {
				monacoEditor.dispose();
			}
		};
	});


	
	async function saveChapter() {
		if (!chapterTitle.trim()) {
			alert('章のタイトルを入力してください');
			return;
		}
		
		isSaving = true;
		saveStatus = '保存中...';
		
		try {
			const wordCount = chapterContent.length;
			
			if (isCreatingChapter) {
				// 新規章作成
				const nextOrderIndex = Math.max(...chapters.map(c => c.order_index), -1) + 1;
				
				const { data: newChapter, error } = await data.supabase
					.from('chapters')
					.insert({
						book_id: bookId,
						title: chapterTitle,
						content: chapterContent,
						order_index: nextOrderIndex,
						word_count: wordCount
					})
					.select()
					.single();
				
				if (error) throw error;
				
				// 章リストを更新（リアクティブ性を保持するため新しい配列を作成）
				chapters = [...chapters, newChapter];
				selectedChapter = newChapter;
				isCreatingChapter = false;
				
				// lastContent と lastTitle を更新
				lastContent = chapterContent;
				lastTitle = chapterTitle;
				
			} else {
				// 既存章更新
				const { error } = await data.supabase
					.from('chapters')
					.update({
						title: chapterTitle,
						content: chapterContent,
						word_count: wordCount
					})
					.eq('id', selectedChapter.id);
				
				if (error) throw error;
				
				// 選択中の章を更新
				selectedChapter = { ...selectedChapter, title: chapterTitle, content: chapterContent, word_count: wordCount };
				
				// 章リストを更新
				chapters = chapters.map(c => 
					c.id === selectedChapter.id ? selectedChapter : c
				);
				
				// lastContent と lastTitle を更新
				lastContent = chapterContent;
				lastTitle = chapterTitle;
			}
			
			saveStatus = '保存完了';
			setTimeout(() => {
				if (saveStatus === '保存完了') {
					saveStatus = '';
				}
			}, 2000);
			
		} catch (error) {
			console.error('Error saving chapter:', error);
			saveStatus = '保存に失敗しました';
			setTimeout(() => {
				if (saveStatus === '保存に失敗しました') {
					saveStatus = '';
				}
			}, 3000);
		} finally {
			isSaving = false;
		}
	}
	
	async function deleteChapter(chapter: any) {
		if (!confirm(`章「${chapter.title}」を削除してもよろしいですか？`)) {
			return;
		}
		
		try {
			const { error } = await data.supabase
				.from('chapters')
				.delete()
				.eq('id', chapter.id);
			
			if (error) throw error;
			
			// 章リストから削除
			chapters = chapters.filter(c => c.id !== chapter.id);
			
			// 削除した章が選択中だった場合
			if (selectedChapter?.id === chapter.id) {
				if (chapters.length > 0) {
					selectChapter(chapters[0]);
				} else {
					createNewChapter();
				}
			}
			
		} catch (error) {
			console.error('Error deleting chapter:', error);
			alert('章の削除に失敗しました');
		}
	}
	
	// 自動保存（3秒後）
	let saveTimeout: any;
	let isAutoSaving = false;
	let lastContent = '';
	let lastTitle = '';

	// ドラッグ&ドロップ関連の変数
	let draggedChapter: any = null;
	let draggedIndex = -1;
	let dropTargetIndex = -1;

	// 画像関連の変数
	let bookImages: any[] = [];
	let isUploadingImage = false;
	let showImagePanel = false;
	let showImageLibraryModal = false;
	let selectedImages: Set<string> = new Set();
	let imageLibraryView = 'grid'; // 'grid' or 'list'
	let imageSearchQuery = '';
	let currentEditingImage: any = null;
	let showImageEditor = false;
	let activeImageTab = 'upload'; // 'upload' or 'gallery'

	// 画像サイズ設定
	const imageSizes = {
		thumbnail: { width: 150, height: 150, quality: 0.8 },
		small: { width: 300, height: 225, quality: 0.85 },
		medium: { width: 600, height: 450, quality: 0.85 },
		large: { width: 1024, height: 768, quality: 0.9 },
		full: { width: 1600, height: 1200, quality: 0.9 }
	};

	// ドラッグ開始処理
	function handleDragStart(event: DragEvent, chapter: any, index: number) {
		draggedChapter = chapter;
		draggedIndex = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/html', ''); // Firefox対応
		}
	}

	// ドラッグオーバー処理
	function handleDragOver(event: DragEvent, index: number) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		dropTargetIndex = index;
	}

	// ドロップ処理
	async function handleDrop(event: DragEvent, dropIndex: number) {
		event.preventDefault();

		if (draggedChapter && draggedIndex !== dropIndex) {
			// 章の順序を変更
			const newChapters = [...chapters];
			const [draggedItem] = newChapters.splice(draggedIndex, 1);
			newChapters.splice(dropIndex, 0, draggedItem);

			// order_indexを更新
			const updatedChapters = newChapters.map((chapter, index) => ({
				...chapter,
				order_index: index
			}));

			// UIをすぐに更新
			chapters = updatedChapters;

			// データベースを更新
			try {
				const updatePromises = updatedChapters.map(chapter =>
					data.supabase
						.from('chapters')
						.update({ order_index: chapter.order_index })
						.eq('id', chapter.id)
				);

				await Promise.all(updatePromises);
			} catch (error) {
				console.error('Error updating chapter order:', error);
				// エラーが発生した場合は元の順序に戻す
				window.location.reload();
			}
		}

		// ドラッグ状態をリセット
		draggedChapter = null;
		draggedIndex = -1;
		dropTargetIndex = -1;
	}

	// ドラッグ終了処理
	function handleDragEnd() {
		draggedChapter = null;
		draggedIndex = -1;
		dropTargetIndex = -1;
	}

	// 画像リサイズ関数（複数サイズ対応）
	function resizeImage(file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<{blob: Blob, width: number, height: number}> {
		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			const img = new Image();

			img.onload = () => {
				// アスペクト比を保持してリサイズ
				const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
				const newWidth = Math.floor(img.width * ratio);
				const newHeight = Math.floor(img.height * ratio);

				canvas.width = newWidth;
				canvas.height = newHeight;

				// 高品質リサイズのための設定
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';

				// 画像を描画
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				// Blobとして出力
				canvas.toBlob((blob) => {
					resolve({
						blob: blob!,
						width: newWidth,
						height: newHeight
					});
				}, 'image/jpeg', quality);
			};

			img.src = URL.createObjectURL(file);
		});
	}

	// WebP形式変換関数
	function convertToWebP(file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<{blob: Blob, width: number, height: number}> {
		return new Promise((resolve) => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d')!;
			const img = new Image();

			img.onload = () => {
				const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
				const newWidth = Math.floor(img.width * ratio);
				const newHeight = Math.floor(img.height * ratio);

				canvas.width = newWidth;
				canvas.height = newHeight;
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage(img, 0, 0, newWidth, newHeight);

				canvas.toBlob((blob) => {
					resolve({
						blob: blob!,
						width: newWidth,
						height: newHeight
					});
				}, 'image/webp', quality);
			};

			img.src = URL.createObjectURL(file);
		});
	}

	// 複数サイズ画像生成
	async function generateImageSizes(file: File): Promise<{[key: string]: any}> {
		const sizes: {[key: string]: any} = {};
		const originalImg = new Image();
		originalImg.src = URL.createObjectURL(file);

		await new Promise((resolve) => {
			originalImg.onload = resolve;
		});

		for (const [sizeName, config] of Object.entries(imageSizes)) {
			try {
				const result = await resizeImage(file, config.width, config.height, config.quality);
				sizes[sizeName] = {
					width: result.width,
					height: result.height,
					blob: result.blob
				};
			} catch (error) {
				console.error(`Error generating ${sizeName} size:`, error);
			}
		}

		return sizes;
	}

	// 高度な画像アップロード処理
	async function uploadImage(file: File): Promise<string | null> {
		try {
			isUploadingImage = true;

			// ファイルサイズチェック（10MB制限）
			if (file.size > 10 * 1024 * 1024) {
				alert('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。');
				return null;
			}

			// 複数サイズの画像を生成
			const sizes = await generateImageSizes(file);

			// ファイル名を生成（タイムスタンプ + 元のファイル名）
			const timestamp = Date.now();
			const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9.-]/g, '_');
			const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';

			// 各サイズをアップロード
			const uploadedSizes: {[key: string]: any} = {};
			let mainImageUrl = '';

			for (const [sizeName, sizeData] of Object.entries(sizes)) {
				const fileName = `${timestamp}_${baseName}_${sizeName}.jpg`;
				const filePath = `books/${bookId}/images/${fileName}`;

				const { data: uploadData, error } = await data.supabase.storage
					.from('book-images')
					.upload(filePath, sizeData.blob, {
						contentType: 'image/jpeg',
						upsert: false
					});

				if (error) {
					console.error(`Upload error for ${sizeName}:`, error);
					continue;
				}

				// 公開URLを取得
				const { data: urlData } = data.supabase.storage
					.from('book-images')
					.getPublicUrl(filePath);

				uploadedSizes[sizeName] = {
					url: urlData.publicUrl,
					width: sizeData.width,
					height: sizeData.height,
					path: filePath
				};

				// medium サイズをメイン画像として使用
				if (sizeName === 'medium') {
					mainImageUrl = urlData.publicUrl;
				}
			}

			// メイン画像URLが設定されていない場合は最初のサイズを使用
			if (!mainImageUrl && Object.keys(uploadedSizes).length > 0) {
				mainImageUrl = Object.values(uploadedSizes)[0].url;
			}

			// データベースにメタデータを保存
			const { data: imageRecord, error: dbError } = await data.supabase
				.from('book_images')
				.insert({
					book_id: bookId,
					file_name: `${timestamp}_${baseName}.${extension}`,
					original_name: file.name,
					file_size: file.size,
					mime_type: file.type,
					storage_path: `books/${bookId}/images/`,
					public_url: mainImageUrl,
					alt_text: '',
					caption: '',
					image_sizes: uploadedSizes,
					metadata: {
						original_width: Object.values(sizes)[0]?.width || 0,
						original_height: Object.values(sizes)[0]?.height || 0,
						upload_timestamp: timestamp
					}
				})
				.select()
				.single();

			if (dbError) {
				console.error('Database error:', dbError);
				alert('画像の情報保存に失敗しました');
				return null;
			}

			// 画像リストを更新
			await loadBookImages();

			return mainImageUrl;

		} catch (error) {
			console.error('Error uploading image:', error);
			alert('画像のアップロードに失敗しました');
			return null;
		} finally {
			isUploadingImage = false;
		}
	}

	// 画像選択ダイアログを開く
	function openImageUpload() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';
		input.multiple = false;

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (file) {
				const imageUrl = await uploadImage(file);
				if (imageUrl) {
					// エディターに画像タグを挿入
					insertHtmlTag('image', imageUrl);
				}
			}
		};

		input.click();
	}

	// 書籍の画像一覧を読み込み（データベースから）
	async function loadBookImages() {
		try {
			const { data: images, error } = await data.supabase
				.from('book_images')
				.select('*')
				.eq('book_id', bookId)
				.order('uploaded_at', { ascending: false });

			if (error) {
				console.error('Error loading images:', error);
				return;
			}

			bookImages = images || [];

		} catch (error) {
			console.error('Error loading book images:', error);
		}
	}

	// エディター用ドラッグ&ドロップ処理
	function handleImageDragOver(event: DragEvent) {
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'copy';

		// ドラッグオーバー時の視覚的フィードバック
		const container = event.currentTarget as HTMLElement;
		container.classList.add('drag-over');
	}

	function handleImageDragLeave(event: DragEvent) {
		const container = event.currentTarget as HTMLElement;
		container.classList.remove('drag-over');
	}

	async function handleImageDrop(event: DragEvent) {
		event.preventDefault();
		const container = event.currentTarget as HTMLElement;
		container.classList.remove('drag-over');

		const files = Array.from(event.dataTransfer?.files || []);
		const imageFiles = files.filter(file => file.type.startsWith('image/'));

		if (imageFiles.length === 0) {
			alert('画像ファイルをドロップしてください');
			return;
		}

		// 複数ファイルの場合は順次アップロード
		for (const file of imageFiles) {
			const imageUrl = await uploadImage(file);
			if (imageUrl && imageFiles.length === 1) {
				// 単一ファイルの場合は自動でエディターに挿入
				insertHtmlTag('image', imageUrl);
			}
		}

		if (imageFiles.length > 1) {
			alert(`${imageFiles.length}枚の画像をアップロードしました。画像一覧から挿入できます。`);
		}
	}

	// サイドバー用ドラッグ&ドロップ処理（自動挿入なし）
	function handleSidebarImageDragOver(event: DragEvent) {
		event.preventDefault();
		event.dataTransfer!.dropEffect = 'copy';

		const container = event.currentTarget as HTMLElement;
		container.classList.add('border-blue-500', 'bg-blue-100');
		container.classList.remove('border-gray-300');
	}

	function handleSidebarImageDragLeave(event: DragEvent) {
		const container = event.currentTarget as HTMLElement;
		container.classList.remove('border-blue-500', 'bg-blue-100');
		container.classList.add('border-gray-300');
	}

	async function handleSidebarImageDrop(event: DragEvent) {
		event.preventDefault();
		const container = event.currentTarget as HTMLElement;
		container.classList.remove('border-blue-500', 'bg-blue-100');
		container.classList.add('border-gray-300');

		const files = Array.from(event.dataTransfer?.files || []);
		const imageFiles = files.filter(file => file.type.startsWith('image/'));

		if (imageFiles.length === 0) {
			alert('画像ファイルをドロップしてください');
			return;
		}

		// アップロードのみ（自動挿入はしない）
		for (const file of imageFiles) {
			await uploadImage(file);
		}

		alert(`${imageFiles.length}枚の画像をアップロードしました。`);
	}

	// URL直接挿入機能
	function insertImageByUrl() {
		const url = prompt('画像URLを入力してください:', 'https://');
		if (url && url.startsWith('http')) {
			insertHtmlTag('image', url);
		} else if (url) {
			alert('有効なURLを入力してください（https://で始まる）');
		}
	}

	// 画像をエディターに挿入
	function insertImageFromGallery(imageUrl: string, size: string = 'medium') {
		insertHtmlTag('image', imageUrl);
	}

	// 画像をサイズ指定で挿入
	function insertImageWithSize(image: any, size: string) {
		let imageUrl = image.public_url;

		// 指定サイズがある場合は該当URLを使用
		if (image.image_sizes && image.image_sizes[size]) {
			imageUrl = image.image_sizes[size].url;
		}

		insertHtmlTag('image', imageUrl);
		showImageLibraryModal = false;
	}

	// 画像のAlt textとCaptionを更新
	async function updateImageMetadata(imageId: string, altText: string, caption: string) {
		try {
			const { error } = await data.supabase
				.from('book_images')
				.update({
					alt_text: altText,
					caption: caption,
					updated_at: new Date().toISOString()
				})
				.eq('id', imageId);

			if (error) {
				console.error('Error updating image metadata:', error);
				alert('画像情報の更新に失敗しました');
			} else {
				// 画像リストを更新
				await loadBookImages();
			}
		} catch (error) {
			console.error('Error updating image metadata:', error);
		}
	}

	// 画像を削除
	async function deleteImage(image: any) {
		if (!confirm(`画像「${image.original_name}」を削除してもよろしいですか？`)) {
			return;
		}

		try {
			// ストレージから各サイズの画像を削除
			if (image.image_sizes) {
				for (const sizeData of Object.values(image.image_sizes)) {
					const path = (sizeData as any).path;
					if (path) {
						await data.supabase.storage
							.from('book-images')
							.remove([path]);
					}
				}
			}

			// データベースから削除
			const { error } = await data.supabase
				.from('book_images')
				.delete()
				.eq('id', image.id);

			if (error) {
				console.error('Error deleting image:', error);
				alert('画像の削除に失敗しました');
			} else {
				// 画像リストを更新
				await loadBookImages();
			}
		} catch (error) {
			console.error('Error deleting image:', error);
			alert('画像の削除に失敗しました');
		}
	}

	// 複数画像を選択
	function toggleImageSelection(imageId: string) {
		if (selectedImages.has(imageId)) {
			selectedImages.delete(imageId);
		} else {
			selectedImages.add(imageId);
		}
		selectedImages = selectedImages; // リアクティブ更新
	}

	// 全選択/全解除
	function toggleSelectAll() {
		if (selectedImages.size === bookImages.length) {
			selectedImages.clear();
		} else {
			selectedImages = new Set(bookImages.map(img => img.id));
		}
		selectedImages = selectedImages; // リアクティブ更新
	}

	// 選択した画像を一括削除
	async function deleteSelectedImages() {
		const selectedCount = selectedImages.size;
		if (selectedCount === 0) {
			alert('削除する画像を選択してください');
			return;
		}

		if (!confirm(`選択した${selectedCount}枚の画像を削除してもよろしいですか？`)) {
			return;
		}

		const selectedImageData = bookImages.filter(img => selectedImages.has(img.id));

		for (const image of selectedImageData) {
			await deleteImage(image);
		}

		selectedImages.clear();
		selectedImages = selectedImages; // リアクティブ更新
	}

	// 画像検索フィルター
	$: filteredImages = bookImages.filter(image => {
		if (!imageSearchQuery) return true;
		return image.original_name.toLowerCase().includes(imageSearchQuery.toLowerCase()) ||
			   image.alt_text.toLowerCase().includes(imageSearchQuery.toLowerCase()) ||
			   image.caption.toLowerCase().includes(imageSearchQuery.toLowerCase());
	});
	
	// ページレイアウトとテンプレート設定を保存する関数
	async function saveLayoutSettings() {
		try {
			const currentMetadata = book.metadata || {};
			const updatedMetadata = {
				...currentMetadata,
				pageLayout: pageLayout,
				template: selectedTemplate
			};
			
			const { error } = await data.supabase
				.from('books')
				.update({ metadata: updatedMetadata })
				.eq('id', bookId);
				
			if (error) {
				console.error('Error saving layout settings:', error);
			}
		} catch (error) {
			console.error('Error saving layout settings:', error);
		}
	}
	
	// 書籍情報を更新する関数
	async function updateBookInfo(updates: any) {
		try {
			const { error } = await data.supabase
				.from('books')
				.update(updates)
				.eq('id', bookId);

			if (error) {
				console.error('Error updating book info:', error);
				alert('書籍情報の更新に失敗しました');
			} else {
				// 書籍データを更新
				book = { ...book, ...updates };
				alert('書籍情報を更新しました');
			}
		} catch (error) {
			console.error('Error updating book info:', error);
			alert('書籍情報の更新に失敗しました');
		}
	}

	// ページレイアウトまたはテンプレートが変更されたときに自動保存
	$: if ((pageLayout || selectedTemplate) && book) {
		saveLayoutSettings();
	}
	
	// 内容が変更された時のみ自動保存タイマーを設定（debounced）
	let debounceTimeout: any;
	$: {
		const contentChanged = chapterContent !== lastContent || chapterTitle !== lastTitle;
		if (contentChanged && (selectedChapter || isCreatingChapter) && !isSaving) {
			// デバウンス用のタイマーをクリア
			clearTimeout(debounceTimeout);
			
			// 短い遅延で状態を更新
			debounceTimeout = setTimeout(() => {
				clearTimeout(saveTimeout);
				lastContent = chapterContent;
				lastTitle = chapterTitle;
				
				if (chapterTitle.trim() && chapterContent.trim()) {
					saveTimeout = setTimeout(() => {
						if (!isSaving) {
							isAutoSaving = true;
							saveChapter().finally(() => {
								isAutoSaving = false;
							});
						}
					}, 3000);
				}
			}, 100);
		}
	}
</script>

<svelte:head>
	<title>{book.title} - エディター</title>
</svelte:head>

<div class="min-h-screen bg-light-bg">
	<!-- ヘッダー -->
	<div class="navbar-blue">
		<div class="navbar-start">
			<button on:click={() => goto('/dashboard')} class="btn btn-ghost">
				← ダッシュボードに戻る
			</button>
		</div>
		<div class="navbar-center">
			<h1 class="text-xl font-bold">{book.title}</h1>
		</div>
		<div class="navbar-end flex items-center space-x-3">
			<!-- テンプレート選択 -->
			<div class="flex items-center space-x-2">
				<span class="text-sm font-medium text-base-content/80">テンプレート:</span>
				<select bind:value={selectedTemplate} class="select select-bordered select-sm w-48">
					{#each templates as template}
						<option value={template.id}>{template.icon} {template.name.replace('テンプレート', '')}</option>
					{/each}
				</select>
			</div>
			
			<!-- ページレイアウト選択 -->
			<div class="flex items-center space-x-2">
				<span class="text-sm font-medium text-base-content/80">レイアウト:</span>
				<select bind:value={pageLayout} class="select select-bordered select-sm w-20">
					<option value="none">通常</option>
					<option value="a4">A4</option>
				</select>
			</div>
			
			<!-- 保存状態表示 -->
			{#if saveStatus}
				<span class="text-sm font-medium {saveStatus.includes('失敗') ? 'text-error' : 'text-success'}">
					{saveStatus}
				</span>
			{/if}
			
			<!-- ボタン群 -->
			<div class="flex space-x-2">
				<!-- 書籍設定ボタン（一時的に無効化）
				<button
					on:click={() => showBookSettings = true}
					class="btn btn-outline btn-sm"
					type="button"
				>
					⚙️ 書籍設定
				</button>
				-->

				<button
					on:click={() => {
						clearTimeout(saveTimeout);
						saveChapter();
					}}
					class="btn btn-primary btn-sm"
					disabled={isSaving}
					type="button"
				>
					{#if isSaving}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					💾 保存
				</button>

				<button
					on:click={() => goto(`/convert/${bookId}`)}
					class="btn btn-secondary btn-sm"
					type="button"
				>
					📖 出力する
				</button>
			</div>
		</div>
	</div>

	<div class="flex h-[calc(100vh-4rem)]">
		<!-- サイドバー（章一覧） -->
		<div class="w-80 bg-white border-r border-gray-200 overflow-y-auto">
			<div class="p-4">
				<div class="flex justify-between items-center mb-4">
					<h2 class="text-lg font-bold text-gray-800">章一覧</h2>
					<button 
						on:click={() => createNewChapter()} 
						class="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
						type="button"
					>
						+ 新規章
					</button>
				</div>
				
				<div class="space-y-1">
					{#each chapters as chapter, index}
						<div
							class="p-3 cursor-move transition-colors border-l-4 {selectedChapter?.id === chapter.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-transparent hover:bg-gray-50'} {draggedIndex === index ? 'opacity-50' : ''} {dropTargetIndex === index ? 'border-t-4 border-t-blue-400' : ''}"
							draggable="true"
							on:dragstart={(e) => handleDragStart(e, chapter, index)}
							on:dragover={(e) => handleDragOver(e, index)}
							on:drop={(e) => handleDrop(e, index)}
							on:dragend={handleDragEnd}
							on:click={() => selectChapter(chapter)}
							role="button"
							tabindex="0"
							aria-label="章: {chapter.title} - ドラッグして並び替え"
						>
							<div class="flex justify-between items-start">
								<div class="flex items-center flex-1">
									<!-- ドラッグハンドル -->
									<div class="mr-2 text-gray-400 cursor-move hover:text-gray-600" title="ドラッグして並び替え">
										<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
											<circle cx="9" cy="7" r="1"/>
											<circle cx="9" cy="12" r="1"/>
											<circle cx="9" cy="17" r="1"/>
											<circle cx="15" cy="7" r="1"/>
											<circle cx="15" cy="12" r="1"/>
											<circle cx="15" cy="17" r="1"/>
										</svg>
									</div>
									<div class="flex-1">
										<h3 class="font-medium text-gray-900 truncate">{chapter.title}</h3>
										<p class="text-sm text-gray-500 mt-1">{chapter.word_count}文字</p>
									</div>
								</div>
								<button
									on:click|stopPropagation={() => deleteChapter(chapter)}
									class="text-gray-400 hover:text-red-500 text-sm px-2 py-1"
									aria-label="章を削除"
								>
									削除
								</button>
							</div>
						</div>
					{/each}
					
					{#if isCreatingChapter}
						<div class="p-3 bg-blue-50 border-l-4 border-blue-500">
							<h3 class="font-medium text-blue-700">新規章作成中...</h3>
						</div>
					{/if}
				</div>

				<!-- 画像アップロード・管理エリア -->
				<div class="border-t border-gray-200 pt-4 mt-4">
					<div class="flex justify-between items-center mb-3">
						<h3 class="text-md font-bold text-gray-800">🖼️ 画像管理</h3>
						<button
							class="btn btn-xs btn-outline"
							on:click={() => showImageLibraryModal = true}
						>
							📚 詳細ライブラリ
						</button>
					</div>

					<!-- タブナビゲーション -->
					<div class="tabs tabs-boxed mb-3 p-1">
						<a
							class="tab tab-sm flex-1"
							class:tab-active={activeImageTab === 'upload'}
							on:click={() => activeImageTab = 'upload'}
							role="button"
							tabindex="0"
						>
							📤 アップロード
						</a>
						<a
							class="tab tab-sm flex-1"
							class:tab-active={activeImageTab === 'gallery'}
							on:click={() => activeImageTab = 'gallery'}
							role="button"
							tabindex="0"
						>
							📚 画像一覧
						</a>
					</div>

					<!-- アップロードタブ内容 -->
					{#if activeImageTab === 'upload'}
						<!-- 画像ドラッグ&ドロップエリア -->
						<div
							class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-all duration-200 hover:border-blue-400 hover:bg-blue-50 {isUploadingImage ? 'border-blue-500 bg-blue-50' : ''}"
							on:dragover={handleSidebarImageDragOver}
							on:dragleave={handleSidebarImageDragLeave}
							on:drop={handleSidebarImageDrop}
							role="button"
							tabindex="0"
							on:click={openImageUpload}
							on:keydown={(e) => e.key === 'Enter' && openImageUpload()}
						>
							{#if isUploadingImage}
								<div class="space-y-2">
									<div class="loading loading-spinner loading-md text-blue-500"></div>
									<p class="text-sm text-blue-600 font-medium">アップロード中...</p>
								</div>
							{:else}
								<div class="space-y-2">
									<div class="text-3xl text-gray-400">📷</div>
									<p class="text-sm text-gray-600 font-medium">
										画像をドラッグ&ドロップ
									</p>
									<p class="text-xs text-gray-500">
										またはクリックしてファイルを選択
									</p>
									<p class="text-xs text-gray-400">
										JPG, PNG, GIF対応 (最大10MB)
									</p>
								</div>
							{/if}
						</div>

						<!-- URL挿入ボタン -->
						<div class="mt-4">
							<button
								class="btn btn-xs btn-outline w-full"
								on:click={insertImageByUrl}
							>
								🔗 URL画像を挿入
							</button>
						</div>
					{/if}

					<!-- 画像一覧タブ内容 -->
					{#if activeImageTab === 'gallery'}
						{#if bookImages.length > 0}
							<!-- 画像検索 -->
							<div class="mb-3">
								<input
									type="text"
									bind:value={imageSearchQuery}
									placeholder="画像を検索..."
									class="input input-bordered input-xs w-full"
								/>
							</div>

							<!-- 画像グリッド（スクロール可能） -->
							<div class="max-h-64 overflow-y-auto">
								<div class="grid grid-cols-3 gap-2">
									{#each bookImages.filter(img => !imageSearchQuery || img.original_name.toLowerCase().includes(imageSearchQuery.toLowerCase()) || (img.alt_text && img.alt_text.toLowerCase().includes(imageSearchQuery.toLowerCase()))) as image}
										<div
											class="relative group aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
											on:click={() => insertImageFromGallery(image.public_url)}
											role="button"
											tabindex="0"
											aria-label="画像を挿入: {image.original_name}"
										>
											<img
												src={image.image_sizes?.thumbnail?.url || image.public_url}
												alt={image.alt_text || image.original_name}
												class="w-full h-full object-cover"
												loading="lazy"
											/>
											<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
												<span class="text-white text-xs opacity-0 group-hover:opacity-100 font-medium">挿入</span>
											</div>
										</div>
									{/each}
								</div>
							</div>

							<!-- 画像統計 -->
							<div class="mt-3 text-xs text-gray-500 text-center">
								{bookImages.filter(img => !imageSearchQuery || img.original_name.toLowerCase().includes(imageSearchQuery.toLowerCase()) || (img.alt_text && img.alt_text.toLowerCase().includes(imageSearchQuery.toLowerCase()))).length} / {bookImages.length}枚表示
							</div>
						{:else}
							<!-- 画像なしの状態 -->
							<div class="text-center py-8">
								<div class="text-gray-400 text-4xl mb-2">📷</div>
								<p class="text-sm text-gray-500">画像がまだありません</p>
								<p class="text-xs text-gray-400 mt-1">
									アップロードタブから画像を追加してください
								</p>
								<button
									class="btn btn-xs btn-primary mt-3"
									on:click={() => activeImageTab = 'upload'}
								>
									📤 アップロードタブへ
								</button>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>

		<!-- メインエディター -->
		<div class="flex-1 flex flex-col">
			{#if selectedChapter || isCreatingChapter}
				<div class="p-6 h-full flex flex-col">
					<!-- 章タイトル -->
					<div class="mb-4 flex-shrink-0">
						<label class="label">
							<span class="label-text">章タイトル</span>
						</label>
						<input
							type="text"
							bind:value={chapterTitle}
							placeholder="章のタイトルを入力..."
							class="input input-bordered w-full"
						/>
					</div>
					
					<!-- 章内容 -->
					<div class="flex-1 flex flex-col min-h-0">
						<div class="flex justify-between items-center flex-shrink-0">
							<label class="label">
								<span class="label-text">内容</span>
								<span class="label-text-alt">{chapterContent.length}文字</span>
							</label>
							<div class="flex items-center space-x-3">
								<span class="text-sm font-medium text-base-content/70">📝 編集 & 👁️ プレビュー (リアルタイム)</span>

								<!-- 保存状態表示 -->
								{#if saveStatus}
									<span class="text-xs font-medium {saveStatus.includes('失敗') ? 'text-error' : 'text-success'}">
										{saveStatus}
									</span>
								{/if}

								<!-- 保存ボタン -->
								<button
									on:click={() => {
										clearTimeout(saveTimeout);
										saveChapter();
									}}
									class="btn btn-primary btn-sm"
									disabled={isSaving}
									type="button"
								>
									{#if isSaving}
										<span class="loading loading-spinner loading-sm"></span>
									{/if}
									💾 保存
								</button>
							</div>
						</div>

						<!-- HTMLフォーマットツールバー -->
						<div class="flex flex-wrap gap-2 p-3 bg-base-200 rounded-lg mb-3 flex-shrink-0">
								<!-- テキストフォーマット -->
								<div class="flex flex-wrap gap-2 border-r border-gray-300 pr-2">
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('bold')} type="button">
										<strong>B</strong>
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('italic')} type="button">
										<em>I</em>
									</button>
								</div>

								<!-- カラー設定 -->
								<div class="flex flex-wrap gap-2 border-r border-gray-300 pr-2">
									<!-- カラーピッカー -->
									<button
										class="btn btn-xs btn-outline hover:bg-red-100"
										on:click={() => openColorPicker('textcolor')}
										type="button"
										title="文字色を設定"
									>
										🎨 文字色
									</button>
									<button
										class="btn btn-xs btn-outline hover:bg-yellow-100"
										on:click={() => openColorPicker('bgcolor')}
										type="button"
										title="背景色を設定（ハイライト）"
									>
										🖍️ ハイライト
									</button>

									<!-- テンプレート別クイックカラーパレット -->
									<div class="flex gap-1 items-center ml-2">
										<span class="text-xs text-gray-600">クイック:</span>
										{#each currentColors as colorItem}
											<button
												class="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors cursor-pointer shadow-sm"
												style="background-color: {colorItem.color}"
												on:click={() => applyQuickColor(colorItem.color, colorItem.bg)}
												type="button"
												title="{colorItem.name} - {colorItem.bg ? 'ハイライト' : '文字色'}"
											></button>
										{/each}
									</div>
								</div>

								<!-- 見出し -->
								<div class="flex flex-wrap gap-2 border-r border-gray-300 pr-2">
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('h1')} type="button">
										H1
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('h2')} type="button">
										H2
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('h3')} type="button">
										H3
									</button>
								</div>

								<!-- 段落・区切り -->
								<div class="flex flex-wrap gap-2 border-r border-gray-300 pr-2">
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('p')} type="button">
										段落
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('br')} type="button">
										改行
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('hr')} type="button">
										区切り線
									</button>
								</div>

								<!-- リスト・引用 -->
								<div class="flex flex-wrap gap-2 border-r border-gray-300 pr-2">
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('ul')} type="button">
										・リスト
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('ol')} type="button">
										1.リスト
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('blockquote')} type="button">
										" 引用
									</button>
								</div>

								<!-- リンク・ページブレーク・画像 -->
								<div class="flex flex-wrap gap-2">
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('link')} type="button">
										🔗リンク
									</button>
									<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('pagebreak')} type="button">
										📄 改ページ
									</button>
									<button
										class="btn btn-xs btn-outline hover:bg-green-100"
										on:click={openImageUpload}
										type="button"
										disabled={isUploadingImage}
									>
										{#if isUploadingImage}
											<span class="loading loading-spinner loading-xs"></span>
										{/if}
										🖼️ 画像
									</button>
									<button
										class="btn btn-xs btn-outline {showImagePanel ? 'btn-active' : ''}"
										on:click={() => showImagePanel = !showImagePanel}
										type="button"
									>
										📁 画像一覧
									</button>
									<button
										class="btn btn-xs btn-outline hover:bg-blue-100"
										on:click={insertImageByUrl}
										type="button"
									>
										🔗 URL画像
									</button>
									<button
										class="btn btn-xs btn-outline hover:bg-purple-100"
										on:click={() => showImageLibraryModal = true}
										type="button"
									>
										📚 画像ライブラリ
									</button>
								</div>
							</div>

						<!-- エディター/プレビュー表示（2カラムレイアウト） -->
						<div class="flex-1 flex flex-col lg:flex-row gap-4 min-h-0" style="height: calc(100vh - 300px);">
							<!-- 左カラム：エディター -->
							<div class="flex-1 flex flex-col">
								<div class="mb-2">
									<span class="text-sm font-medium text-blue-700">📝 編集エリア</span>
									<span class="text-xs text-gray-500 ml-2">ヒント: HTMLタグが挿入されています</span>
								</div>
								<!-- Monaco Editor Container with Drag & Drop -->
								<div
									bind:this={editorContainer}
									class="monaco-editor-container"
									style="
										min-height: 450px;
										height: calc(100% - 50px);
										border: 1px solid #d1d5db;
										border-radius: 6px;
										overflow: hidden;
									"
									on:dragover={handleImageDragOver}
									on:dragleave={handleImageDragLeave}
									on:drop={handleImageDrop}
								></div>

								<!-- HTMLタグ検出インジケーター -->
								{#if detectedTags.length > 0}
									<div class="mt-2 p-2 bg-gray-50 rounded-md border">
										<div class="text-xs text-gray-600 mb-1">🏷️ 検出されたHTMLタグ:</div>
										<div class="flex flex-wrap gap-2">
											{#each detectedTags as tagInfo}
												<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white border {tagInfo.color}">
													{tagInfo.tag} ({tagInfo.count})
												</span>
											{/each}
										</div>
									</div>
								{:else}
									<div class="mt-2 p-2 bg-blue-50 rounded-md border border-blue-200">
										<div class="text-xs text-blue-600">💡 ツールバーのボタンでHTMLタグを挿入できます</div>
									</div>
								{/if}

								<!-- 画像管理パネル -->
								{#if showImagePanel}
									<div class="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
										<div class="flex justify-between items-center mb-2">
											<div class="text-sm font-medium text-gray-700">📁 この本の画像</div>
											<button
												class="btn btn-xs btn-primary"
												on:click={openImageUpload}
												disabled={isUploadingImage}
											>
												{#if isUploadingImage}
													<span class="loading loading-spinner loading-xs"></span>
													アップロード中...
												{:else}
													+ 追加
												{/if}
											</button>
										</div>

										{#if bookImages.length > 0}
											<div class="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
												{#each bookImages as image}
													<div
														class="relative cursor-pointer group bg-white border border-gray-200 rounded overflow-hidden hover:border-blue-400"
														on:click={() => insertImageFromGallery(image.url)}
														role="button"
														tabindex="0"
														aria-label="画像を挿入: {image.name}"
													>
														<img
															src={image.url}
															alt={image.name}
															class="w-full h-16 object-cover"
															loading="lazy"
														/>
														<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
															<div class="text-white text-xs opacity-0 group-hover:opacity-100">挿入</div>
														</div>
													</div>
												{/each}
											</div>
										{:else}
											<div class="text-center py-4 text-gray-500 text-sm">
												<div class="text-2xl mb-2">🖼️</div>
												<div>まだ画像がありません</div>
												<div class="text-xs mt-1">「🖼️ 画像」ボタンで追加できます</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>

							<!-- 右カラム：プレビュー -->
							<div class="flex-1 flex flex-col">
								<div class="mb-2">
									<span class="text-sm font-medium text-green-700">👁️ プレビュー</span>
								</div>
							<div class="flex-1 overflow-auto {pageLayout === 'a4' ? 'preview-container a4-layout' : 'preview-container'}" style="min-height: 500px; height: 100%; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: white; padding: 1rem; width: 100%;">
								{#if pageLayout === 'a4'}
									<!-- A4レイアウトでテンプレートスタイル適用 - 完成レビュー表示 -->
									<div class="a4-page-container">
										{#if selectedTemplate === 'satomata'}
											{@html `<style>
												.a4-page-container {
													background: #f0f0f0;
													padding: 20px;
													min-height: 100vh;
												}
												.a4-page {
													width: 210mm;
													min-height: 297mm;
													background: white;
													margin: 0 auto 20px auto;
													padding: 25mm;
													box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
													break-after: page;
													position: relative;
												}
												.a4-page * {
													font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
													font-weight: bold !important;
													color: #3F51B5 !important;
												}
												.a4-page h1 { font-size: 18pt !important; margin-bottom: 2rem !important; text-align: center !important; }
												.a4-page h2 { font-size: 16pt !important; margin-top: 1.5rem !important; margin-bottom: 1rem !important; }
												.a4-page p { font-size: 12pt !important; margin-bottom: 1rem !important; }
												.a4-page p:first-child, .a4-page p:first-of-type {
													font-size: 16pt !important;
													margin-bottom: 2rem !important;
													padding-bottom: 1.5rem !important;
													border-bottom: 2px solid #3F51B5 !important;
												}
												.chapter-page .chapter-title {
													margin-top: 0 !important;
													padding-top: 0 !important;
												}
											</style>`}
										{:else if selectedTemplate === 'essay'}
											{@html `<style>
												.a4-page-container {
													background: #f0f0f0;
													padding: 20px;
													min-height: 100vh;
												}
												.a4-page {
													width: 210mm;
													min-height: 297mm;
													background: white;
													margin: 0 auto 20px auto;
													padding: 25mm;
													box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
													break-after: page;
													position: relative;
												}
												.a4-page * {
													font-family: "Noto Serif JP", "Yu Mincho", serif !important;
													color: #2c2c2c !important;
													line-height: 1.8 !important;
												}
												.a4-page h1 {
													font-size: 18pt !important;
													text-align: center !important;
													margin: 2em 0 !important;
													font-weight: normal !important;
													color: #1a1a1a !important;
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
													font-weight: normal !important;
													border-bottom: 1px solid #ddd !important;
													padding-bottom: 0.5em !important;
												}
												.a4-page h3 {
													font-size: 14pt !important;
													margin-top: 1.5em !important;
													margin-bottom: 1em !important;
													font-weight: normal !important;
												}
												.a4-page p {
													font-size: 12pt !important;
													margin-bottom: 1rem !important;
													text-align: justify !important;
													text-indent: 1em !important;
													line-height: 1.6 !important;
												}
												.a4-page {
													padding: 10mm !important;
													min-height: 297mm !important;
													position: relative !important;
												}
												.chapter-title-header {
													position: absolute !important;
													top: 15mm !important;
													right: 25mm !important;
													font-size: 14pt !important;
													color: #666 !important;
													font-weight: normal !important;
													text-align: right !important;
													flex-grow: 0 !important;
													flex-shrink: 0 !important;
												}
												/* pagebreakで囲まれた内容のみ大きく左寄り中央配置 */
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
												}
												/* pagebreakコンテンツを確実に太字に */
												.a4-page .page-content.pagebreak-content,
												.a4-page .page-content.pagebreak-content *,
												.a4-page .page-content.pagebreak-content p,
												.a4-page .page-content.pagebreak-content div {
													font-weight: bold !important;
												}
												/* 通常の内容は標準レイアウト */
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
												}
												.page-content:not(.pagebreak-content) * {
													font-size: inherit !important;
													line-height: inherit !important;
													text-align: left !important;
													margin-bottom: 1.2em !important;
													width: auto !important;
													max-width: none !important;
												}
												.page-content:not(.pagebreak-content) p {
													text-align: left !important;
													text-indent: 1em !important;
													word-wrap: break-word !important;
													overflow-wrap: break-word !important;
													width: 100% !important;
													max-width: none !important;
													display: block !important;
													box-sizing: border-box !important;
												}
												/* 通常ページの見出しはテンプレートの色を維持 */
												.page-content:not(.pagebreak-content) h1,
												.page-content:not(.pagebreak-content) h2,
												.page-content:not(.pagebreak-content) h3 {
													color: #3F51B5 !important;
													font-weight: bold !important;
													text-align: left !important;
												}
											</style>`}
										{:else if selectedTemplate === 'satomata-life-lessons'}
											{@html `<style>
												.a4-page-container {
													background: #f0f0f0;
													padding: 20px;
													min-height: 100vh;
												}
												.a4-page {
													width: 210mm;
													min-height: 297mm;
													background: white;
													margin: 0 auto 20px auto;
													padding: 10mm;
													box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
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
												/* h1タグのサイズを確実に適用 */
												.a4-page[data-template="satomata-life-lessons"] h1 {
													font-size: 30pt !important;
													text-align: left !important;
													line-height: 1.2 !important;
												}
												.a4-page .page-content h1,
												.a4-page .page-content:not(.pagebreak-content) h1 {
													font-size: 30pt !important;
													text-align: left !important;
													font-weight: bold !important;
													color: #3F51B5 !important;
													margin: 2em 0 !important;
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
													max-width: none !important;
													word-wrap: break-word !important;
													overflow-wrap: break-word !important;
													width: 100% !important;
													max-width: none !important;
													display: block !important;
													box-sizing: border-box !important;
												}
												.a4-page {
													padding: 10mm !important;
													min-height: 297mm !important;
													position: relative !important;
												}
												.chapter-title-header {
													position: absolute !important;
													top: 8mm !important;
													right: 10mm !important;
													font-size: 12pt !important;
													color: #E91E63 !important;
													font-weight: bold !important;
													text-align: right !important;
													flex-grow: 0 !important;
													flex-shrink: 0 !important;
												}
												/* pagebreakで囲まれた内容のみ大きく左寄り中央配置 */
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
												}
												/* pagebreakコンテンツを確実に太字に */
												.a4-page .page-content.pagebreak-content,
												.a4-page .page-content.pagebreak-content *,
												.a4-page .page-content.pagebreak-content p,
												.a4-page .page-content.pagebreak-content div {
													font-weight: bold !important;
												}
												/* 通常の内容は標準レイアウト */
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
												}
												.page-content:not(.pagebreak-content) * {
													font-size: inherit !important;
													line-height: inherit !important;
													text-align: left !important;
													margin-bottom: 1.2em !important;
													width: auto !important;
													max-width: none !important;
												}
												.page-content:not(.pagebreak-content) p {
													text-align: left !important;
													text-indent: 1em !important;
													word-wrap: break-word !important;
													overflow-wrap: break-word !important;
													width: 100% !important;
													max-width: none !important;
													display: block !important;
													box-sizing: border-box !important;
												}
												/* 通常ページの見出しはテンプレートの色を維持 */
												.page-content:not(.pagebreak-content) h1,
												.page-content:not(.pagebreak-content) h2,
												.page-content:not(.pagebreak-content) h3 {
													color: #3F51B5 !important;
													font-weight: bold !important;
													text-align: left !important;
												}
											</style>`}
										{:else}
											{@html `<style>
												.a4-page-container {
													background: #f0f0f0;
													padding: 20px;
													min-height: 100vh;
												}
												.a4-page {
													width: 210mm;
													min-height: 297mm;
													background: white;
													margin: 0 auto 20px auto;
													padding: 25mm;
													box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
													break-after: page;
													position: relative;
													font-size: 12pt;
													line-height: 1.6;
													color: #333;
												}
												.a4-page h1 { font-size: 18pt; margin-bottom: 2rem; text-align: center; }
												.a4-page h2 { font-size: 16pt; margin-top: 1.5rem; margin-bottom: 1rem; }
												.a4-page p { font-size: 12pt; margin-bottom: 1rem; }
											</style>`}
										{/if}
										
										{#if selectedTemplate === 'essay'}
											<!-- エッセイテンプレート: 書籍タイトルページ -->
											<div class="a4-page" data-template={selectedTemplate}>
												<h1>{book.title}</h1>
											</div>

											<!-- エッセイテンプレート: 各章をH1で分割して表示 -->
											{#each chapters as chapter, index}
												{#if chapter.content && chapter.content.trim()}
													<!-- 章内容をページブレークタグで分割 -->
													{@const contentParts = splitContentByPageBreaks(chapter.content)}
													{#each contentParts as part, partIndex}
														<div class="a4-page" data-template={selectedTemplate}>
															<!-- 章タイトルヘッダー（右上） -->
															<div class="chapter-title-header">{chapter.title}</div>

															<!-- 分割された内容（pagebreakの場合は大きく中央配置、通常は標準レイアウト） -->
															<div class="page-content {part.isPageBreakContent ? 'pagebreak-content' : ''}">
																{@html sanitizeWithLineBreaks(part.content)}
															</div>
														</div>
													{/each}
												{:else}
													<!-- 内容がない場合 -->
													<div class="a4-page" data-template={selectedTemplate}>
														<!-- 章タイトルヘッダー（右上） -->
														<div class="chapter-title-header">{chapter.title}</div>

														<p class="text-gray-500 italic">（この章の内容はまだありません）</p>
													</div>
												{/if}
											{/each}
										{:else if selectedTemplate === 'satomata-life-lessons'}
											<!-- さとまた式人生の教えテンプレート: 書籍タイトルページ -->
											<div class="a4-page" data-template={selectedTemplate}>
												<h1>{book.title}</h1>
											</div>

											<!-- さとまた式人生の教えテンプレート: 各章をページブレークで分割 -->
											{#each chapters as chapter, index}
												{#if chapter.content && chapter.content.trim()}
													<!-- 章内容をページブレークタグで分割 -->
													{@const contentParts = splitContentByPageBreaks(chapter.content)}
													{#each contentParts as part, partIndex}
														<div class="a4-page" data-template={selectedTemplate}>
															<!-- 章タイトルヘッダー（右上） -->
															<div class="chapter-title-header">{chapter.title}</div>

															<!-- 分割された内容（pagebreakの場合は大きく中央配置、通常は標準レイアウト） -->
															<div class="page-content {part.isPageBreakContent ? 'pagebreak-content' : ''}">
																{@html sanitizeWithLineBreaks(part.content)}
															</div>
														</div>
													{/each}
												{:else}
													<!-- 内容がない場合 -->
													<div class="a4-page" data-template={selectedTemplate}>
														<!-- 章タイトルヘッダー（右上） -->
														<div class="chapter-title-header">{chapter.title}</div>

														<p class="text-gray-500 italic">（この章の内容はまだありません）</p>
													</div>
												{/if}
											{/each}
										{:else}
											<!-- 他のテンプレート: 最初のページ（タイトルページ） -->
											<div class="a4-page" data-template={selectedTemplate}>
												<h1 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 18pt; text-align: center;' : ''}">{book.title}</h1>

												<!-- 最初の章の内容（ページに収まる分だけ） -->
												{#if chapters.length > 0 && chapters[0].content}
													<div class="first-chapter">
														<h2 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第1章：{chapters[0].title}</h2>
														{@html selectedTemplate === 'satomata' ?
															`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${sanitizeWithLineBreaks(chapters[0].content)}</div>` :
															sanitizeWithLineBreaks(chapters[0].content)
														}
													</div>
												{:else if chapters.length > 0}
													<div class="first-chapter">
														<h2 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第1章：{chapters[0].title}</h2>
														<p style="{selectedTemplate === 'satomata' ? 'color: #999; font-style: italic;' : ''}" class="text-gray-500 italic">（この章の内容はまだありません）</p>
													</div>
												{/if}
											</div>

											<!-- 2章目以降は各章ごとに新しいページ -->
											{#each chapters.slice(1) as chapter, index}
												<div class="a4-page chapter-page" data-template={selectedTemplate}>
													<h2 class="chapter-title" style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第{index + 2}章：{chapter.title}</h2>
													{#if chapter.content && chapter.content.trim()}
														{@html selectedTemplate === 'satomata' ?
															`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${sanitizeWithLineBreaks(chapter.content)}</div>` :
															sanitizeWithLineBreaks(chapter.content)
														}
													{:else}
														<p style="{selectedTemplate === 'satomata' ? 'color: #999; font-style: italic;' : ''}" class="text-gray-500 italic">（この章の内容はまだありません）</p>
													{/if}
												</div>
											{/each}
										{/if}
										
										{#if chapters.length === 0}
											<div class="a4-page" data-template={selectedTemplate}>
												<p class="text-gray-500 italic">まだ章が作成されていません。最初の章を作成してください。</p>
											</div>
										{/if}
									</div>
								{:else}
									<!-- 通常レイアウトでテンプレートスタイル適用 - 完成レビュー表示 -->
									<div class="bg-white border border-base-300 rounded-lg preview-content" data-template={selectedTemplate} style="{templateStyle}; padding: 2rem; margin: 1rem;">
										{#if selectedTemplate === 'satomata'}
											{@html `<style>
												.preview-content * {
													font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
													font-weight: bold !important;
													color: #3F51B5 !important;
												}
												.preview-content h1 { font-size: 18pt !important; margin-bottom: 2rem !important; }
												.preview-content h2 { font-size: 16pt !important; margin-top: 1.5rem !important; margin-bottom: 1rem !important; }
												.preview-content p { font-size: 12pt !important; margin-bottom: 1rem !important; }
												.preview-content p:first-child, .preview-content p:first-of-type {
													font-size: 16pt !important;
													margin-bottom: 2rem !important;
													padding-bottom: 1.5rem !important;
													border-bottom: 2px solid #3F51B5 !important;
												}
												.preview-content .chapter-section:not(:first-child) {
													page-break-before: always !important;
													margin-top: 0 !important;
													padding-top: 0 !important;
												}
											</style>`}
										{:else if selectedTemplate === 'satomata-life-lessons'}
											{@html `<style>
												/* さとまた式人生の教え: 見出しのみ特別スタイル */
												.preview-content h1 {
													font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
													font-weight: bold !important;
													color: #3F51B5 !important;
													font-size: 18pt !important;
													margin-bottom: 2rem !important;
												}
												.preview-content h2 {
													font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
													font-weight: bold !important;
													color: #3F51B5 !important;
													font-size: 16pt !important;
													margin-top: 1.5rem !important;
													margin-bottom: 1rem !important;
												}
												.preview-content h3 {
													font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
													font-weight: bold !important;
													color: #3F51B5 !important;
													font-size: 14pt !important;
													margin-top: 1.2rem !important;
													margin-bottom: 0.8rem !important;
												}
												/* 通常の文字は通常スタイル - 最強制適用 */
												.preview-content p,
												.preview-content div,
												.preview-content span {
													font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
													font-weight: normal !important;
													color: #333333 !important;
													font-size: 13pt !important;
													margin-bottom: 1rem !important;
													text-align: left !important;
													text-indent: 1em !important;
												}
											</style>`}
										{/if}
										<!-- 書籍タイトル -->
										<h1 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 18pt; text-align: center;' : ''}">{book.title}</h1>
										
										<!-- 全章の内容を順番に表示 -->
										{#each chapters as chapter, index}
											<div class="chapter-section" style="margin-bottom: 2rem;">
												<h2 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第{index + 1}章：{chapter.title}</h2>
												{#if chapter.content && chapter.content.trim()}
													{@html selectedTemplate === 'satomata' ?
														`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${sanitizeWithLineBreaks(chapter.content)}</div>` :
														sanitizeWithLineBreaks(chapter.content)
													}
												{:else}
													<p style="{selectedTemplate === 'satomata' ? 'color: #999; font-style: italic;' : ''}" class="text-gray-500 italic">（この章の内容はまだありません）</p>
												{/if}
											</div>
										{/each}
										
										{#if chapters.length === 0}
											<p class="text-gray-500 italic">まだ章が作成されていません。最初の章を作成してください。</p>
										{/if}
									</div>
								{/if}
							</div>
							</div>
						</div>
					</div>
					
					<!-- 自動保存ステータス -->
					<div class="mt-4 flex justify-center">
						<div class="text-sm text-gray-500">
							文字数: {chapterContent.length} | 自動保存: 3秒後
						</div>
					</div>
				</div>
			{:else}
				<div class="flex-1 flex items-center justify-center">
					<div class="text-center">
						<div class="icon-blue text-6xl mb-4 inline-block p-4">
							<svg class="book-icon-large" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
							</svg>
						</div>
						<h3 class="text-xl font-semibold mb-2 text-blue-900">章を選択してください</h3>
						<p class="text-blue-700 mb-4">左のサイドバーから章を選択するか、新規章を作成してください</p>
						<button on:click={createNewChapter} class="btn btn-primary-gradient btn-lg shadow-lg">
							最初の章を作成
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- 書籍設定モーダル（一時的に無効化）
{#if showBookSettings}
	<div class="modal modal-open">
		<div class="modal-box bg-white border border-blue-100 shadow-xl max-w-md">
			<h3 class="font-bold text-lg mb-4 text-blue-900">書籍設定</h3>
			<p>カテゴリ機能を有効化する前に、Supabaseマイグレーションを適用してください。</p>
			<div class="modal-action">
				<button
					type="button"
					on:click={() => showBookSettings = false}
					class="btn btn-primary"
				>
					閉じる
				</button>
			</div>
		</div>
		<div class="modal-backdrop" on:click={() => showBookSettings = false}></div>
	</div>
{/if}
-->

<style>
	.textarea {
		font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
		line-height: 1.8;
	}

	/* HTMLエディターのスタイル */
	.html-editor {
		font-family: 'JetBrains Mono', 'Fira Code', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
		background-color: #ffffff;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 12px;
		transition: border-color 0.2s ease;
		color: #374151;
		line-height: 1.7;
		font-size: 14px;
		font-weight: 400;
	}

	.html-editor:focus {
		border-color: #3b82f6;
		background-color: #ffffff;
		color: #1f2937;
		outline: none;
	}

	.html-editor::placeholder {
		color: #64748b;
		font-style: italic;
		font-weight: 400;
	}

	/* 選択時のハイライト色 */
	.html-editor::selection {
		background-color: #dbeafe;
		color: #1e40af;
	}

	/* エディターコンテナ */
	.editor-container {
		position: relative;
	}

	/* シンタックスハイライト用スタイル */
	.syntax-highlight-background {
		line-height: 1.7;
	}

	.editor-container textarea {
		caret-color: #1f2937;
		selection-color: #dbeafe;
	}

	.editor-container textarea::selection {
		background-color: #dbeafe;
		color: #1e40af;
	}

	/* プレビュー内の改行とスペーシングを適切に表示 */
	.preview-content {
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.a4-page {
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	/* 改行タグの行間を適切に設定 */
	.preview-content br,
	.a4-page br {
		line-height: 1.8;
	}

	/* ドラッグ&ドロップ時の視覚的フィードバック */
	.monaco-editor-container.drag-over {
		border-color: #3b82f6 !important;
		background-color: #dbeafe !important;
	}

	.monaco-editor-container.drag-over::after {
		content: "📷 画像をドロップしてアップロード";
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(59, 130, 246, 0.9);
		color: white;
		padding: 1rem 2rem;
		border-radius: 0.5rem;
		font-weight: bold;
		pointer-events: none;
		z-index: 1000;
	}
</style>

<!-- WordPress風画像ライブラリモーダル -->
{#if showImageLibraryModal}
	<div class="modal modal-open">
		<div class="modal-box max-w-6xl w-full h-5/6 bg-white border border-gray-200 shadow-2xl">
			<!-- ヘッダー -->
			<div class="flex justify-between items-center mb-4 border-b border-gray-200 pb-4">
				<h3 class="font-bold text-xl text-gray-800">📚 画像ライブラリ</h3>
				<div class="flex items-center space-x-3">
					<!-- 検索 -->
					<input
						type="text"
						placeholder="画像を検索..."
						class="input input-bordered input-sm w-64"
						bind:value={imageSearchQuery}
					/>
					<!-- 表示切替 -->
					<div class="btn-group">
						<button
							class="btn btn-sm {imageLibraryView === 'grid' ? 'btn-active' : 'btn-outline'}"
							on:click={() => imageLibraryView = 'grid'}
						>
							🔲 グリッド
						</button>
						<button
							class="btn btn-sm {imageLibraryView === 'list' ? 'btn-active' : 'btn-outline'}"
							on:click={() => imageLibraryView = 'list'}
						>
							📋 リスト
						</button>
					</div>
					<button
						class="btn btn-sm btn-ghost"
						on:click={() => showImageLibraryModal = false}
					>
						✕
					</button>
				</div>
			</div>

			<!-- バッチ操作バー -->
			{#if selectedImages.size > 0}
				<div class="alert alert-info mb-4">
					<div class="flex justify-between items-center w-full">
						<span>{selectedImages.size}枚の画像が選択されています</span>
						<div class="space-x-2">
							<button class="btn btn-sm btn-error" on:click={deleteSelectedImages}>
								🗑️ 選択削除
							</button>
							<button class="btn btn-sm btn-ghost" on:click={() => { selectedImages.clear(); selectedImages = selectedImages; }}>
								選択解除
							</button>
						</div>
					</div>
				</div>
			{/if}

			<!-- 画像一覧 -->
			<div class="overflow-y-auto max-h-96">
				{#if imageLibraryView === 'grid'}
					<!-- グリッド表示 -->
					<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{#each filteredImages as image}
							<div class="relative group bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-blue-400 transition-all">
								<!-- 選択チェックボックス -->
								<div class="absolute top-2 left-2 z-10">
									<input
										type="checkbox"
										class="checkbox checkbox-sm"
										checked={selectedImages.has(image.id)}
										on:change={() => toggleImageSelection(image.id)}
									/>
								</div>

								<!-- 画像 -->
								<div class="aspect-square bg-gray-100 overflow-hidden">
									<img
										src={image.image_sizes?.thumbnail?.url || image.public_url}
										alt={image.alt_text || image.original_name}
										class="w-full h-full object-cover cursor-pointer"
										on:click={() => insertImageWithSize(image, 'medium')}
									/>
								</div>

								<!-- 画像情報 -->
								<div class="p-2">
									<div class="text-xs font-medium text-gray-800 truncate">
										{image.original_name}
									</div>
									<div class="text-xs text-gray-500 mt-1">
										{Math.round(image.file_size / 1024)}KB
									</div>

									<!-- サイズ選択ボタン -->
									<div class="mt-2 grid grid-cols-2 gap-1">
										{#if image.image_sizes}
											{#each ['thumbnail', 'small', 'medium', 'large'] as size}
												{#if image.image_sizes[size]}
													<button
														class="btn btn-xs btn-outline"
														on:click={() => insertImageWithSize(image, size)}
													>
														{size}
													</button>
												{/if}
											{/each}
										{/if}
									</div>

									<!-- 削除ボタン -->
									<button
										class="btn btn-xs btn-error btn-outline mt-2 w-full"
										on:click={() => deleteImage(image)}
									>
										🗑️ 削除
									</button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<!-- リスト表示 -->
					<div class="space-y-2">
						{#each filteredImages as image}
							<div class="flex items-center space-x-4 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-400">
								<!-- 選択チェックボックス -->
								<input
									type="checkbox"
									class="checkbox"
									checked={selectedImages.has(image.id)}
									on:change={() => toggleImageSelection(image.id)}
								/>

								<!-- サムネイル -->
								<img
									src={image.image_sizes?.thumbnail?.url || image.public_url}
									alt={image.alt_text || image.original_name}
									class="w-16 h-16 object-cover rounded cursor-pointer"
									on:click={() => insertImageWithSize(image, 'medium')}
								/>

								<!-- 画像情報 -->
								<div class="flex-1">
									<div class="font-medium text-gray-800">{image.original_name}</div>
									<div class="text-sm text-gray-500">
										{Math.round(image.file_size / 1024)}KB •
										{new Date(image.uploaded_at).toLocaleDateString()}
									</div>

									<!-- Alt text & Caption編集 -->
									<div class="mt-2 space-y-1">
										<input
											type="text"
											placeholder="Alt text"
											class="input input-bordered input-xs w-full"
											value={image.alt_text}
											on:blur={(e) => updateImageMetadata(image.id, e.target.value, image.caption)}
										/>
										<input
											type="text"
											placeholder="Caption"
											class="input input-bordered input-xs w-full"
											value={image.caption}
											on:blur={(e) => updateImageMetadata(image.id, image.alt_text, e.target.value)}
										/>
									</div>
								</div>

								<!-- アクションボタン -->
								<div class="flex flex-col space-y-1">
									{#if image.image_sizes}
										{#each ['thumbnail', 'small', 'medium', 'large'] as size}
											{#if image.image_sizes[size]}
												<button
													class="btn btn-xs btn-outline"
													on:click={() => insertImageWithSize(image, size)}
												>
													{size}で挿入
												</button>
											{/if}
										{/each}
									{/if}
									<button
										class="btn btn-xs btn-error btn-outline"
										on:click={() => deleteImage(image)}
									>
										🗑️ 削除
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- 画像がない場合 -->
				{#if filteredImages.length === 0}
					<div class="text-center py-12 text-gray-500">
						<div class="text-6xl mb-4">🖼️</div>
						{#if imageSearchQuery}
							<div class="text-lg font-medium">検索結果がありません</div>
							<div class="text-sm">「{imageSearchQuery}」に一致する画像が見つかりませんでした</div>
						{:else}
							<div class="text-lg font-medium">まだ画像がありません</div>
							<div class="text-sm">画像をアップロードして本を豊かにしましょう</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- フッター -->
			<div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
				<div class="flex items-center space-x-2">
					<button class="btn btn-sm btn-outline" on:click={toggleSelectAll}>
						{selectedImages.size === bookImages.length ? '全解除' : '全選択'}
					</button>
					<span class="text-sm text-gray-500">
						{filteredImages.length}枚の画像
					</span>
				</div>
				<div class="flex space-x-2">
					<button
						class="btn btn-sm btn-primary"
						on:click={openImageUpload}
						disabled={isUploadingImage}
					>
						{#if isUploadingImage}
							<span class="loading loading-spinner loading-xs"></span>
							アップロード中...
						{:else}
							📤 画像を追加
						{/if}
					</button>
					<button
						class="btn btn-sm btn-ghost"
						on:click={() => showImageLibraryModal = false}
					>
						閉じる
					</button>
				</div>
			</div>
		</div>
		<div class="modal-backdrop" on:click={() => showImageLibraryModal = false}></div>
	</div>
{/if}