<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import DOMPurify from 'dompurify';
	import { templates, getTemplate, getTemplatePreviewStyle } from '$lib/templates';
	
	export let data: PageData;
	
	let selectedChapter: any = null;
	let chapterTitle = '';
	let chapterContent = '';
	let isCreatingChapter = false;
	let isSaving = false;
	let saveStatus = '';
	let isPreviewMode = false;
	let pageLayout = 'none'; // 'none' または 'a4'
	let selectedTemplate = 'simple'; // テンプレート選択
	let showBookSettings = false;
	
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
	
	// デバッグ用: プレビューの状態をログ出力
	$: if (typeof window !== 'undefined') {
		console.log('Chapter content:', chapterContent?.substring(0, 100));
		console.log('Safe HTML:', safeHtml?.substring(0, 100));
		console.log('Preview mode:', isPreviewMode);
	}
	
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
	
	function selectChapter(chapter: any) {
		selectedChapter = chapter;
		chapterTitle = chapter.title;
		chapterContent = chapter.content || '';
		isCreatingChapter = false;
		
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
		
		// 自動保存用の追跡変数を更新
		lastTitle = '';
		lastContent = '';
		
		// 新規章作成モードに移行
	}

	// HTMLフォーマット関数
	function insertHtmlTag(tag: string) {
		const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
		if (!textarea) return;

		const start = textarea.selectionStart;
		const end = textarea.selectionEnd;
		const selectedText = chapterContent.substring(start, end);
		
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
		}

		chapterContent = chapterContent.substring(0, start) + insertText + chapterContent.substring(end);
		
		// カーソル位置を調整
		setTimeout(() => {
			textarea.focus();
			textarea.setSelectionRange(start + insertText.length, start + insertText.length);
		}, 0);
	}
	
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
					📖 EPUB変換
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
							class="p-3 cursor-pointer transition-colors border-l-4 {selectedChapter?.id === chapter.id ? 'bg-blue-50 border-blue-500' : 'bg-white border-transparent hover:bg-gray-50'}"
							on:click={() => selectChapter(chapter)}
						>
							<div class="flex justify-between items-start">
								<div class="flex-1">
									<h3 class="font-medium text-gray-900 truncate">{chapter.title}</h3>
									<p class="text-sm text-gray-500 mt-1">{chapter.word_count}文字</p>
								</div>
								<button 
									on:click|stopPropagation={() => deleteChapter(chapter)}
									class="text-gray-400 hover:text-red-500 text-sm px-2 py-1"
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
							<div class="flex space-x-2">
								<button 
									class="btn btn-sm {isPreviewMode ? 'btn-ghost' : 'btn-primary'}"
									on:click={() => isPreviewMode = false}
									type="button"
								>
									編集
								</button>
								<button 
									class="btn btn-sm {isPreviewMode ? 'btn-primary' : 'btn-ghost'}"
									on:click={() => isPreviewMode = true}
									type="button"
								>
									プレビュー
								</button>
							</div>
						</div>

						<!-- HTMLフォーマットツールバー -->
						{#if !isPreviewMode}
							<div class="flex flex-wrap gap-2 p-3 bg-base-200 rounded-lg mb-3 flex-shrink-0">
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('bold')} type="button">
									<strong>B</strong>
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('italic')} type="button">
									<em>I</em>
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('h1')} type="button">
									H1
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('h2')} type="button">
									H2
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('h3')} type="button">
									H3
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('p')} type="button">
									段落
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('br')} type="button">
									改行
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('hr')} type="button">
									区切り線
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('ul')} type="button">
									・リスト
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('ol')} type="button">
									1.リスト
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('link')} type="button">
									🔗リンク
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('blockquote')} type="button">
									" 引用
								</button>
								<button class="btn btn-xs btn-outline" on:click={() => insertHtmlTag('pagebreak')} type="button">
									📄 改ページ
								</button>
							</div>
						{/if}

						<!-- エディター/プレビュー表示 -->
						{#if isPreviewMode}
							<div class="flex-1 overflow-auto {pageLayout === 'a4' ? 'preview-container a4-layout' : 'preview-container'}">
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
													font-size: 20pt !important;
													text-align: center !important;
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
						{:else}
							<textarea
								bind:value={chapterContent}
								placeholder="章の内容を入力... HTMLタグを使用できます。例: <strong>太字</strong>, <em>斜体</em>, <h1>見出し</h1>"
								class="textarea textarea-bordered flex-1 w-full resize-none leading-relaxed font-mono"
								style="min-height: 500px; font-size: 14px; line-height: 1.6; height: 100%;"
							></textarea>
						{/if}
					</div>
					
					<!-- ツールバー -->
					<div class="mt-4 flex justify-between items-center flex-shrink-0">
						<div class="text-sm text-gray-500">
							文字数: {chapterContent.length} | 自動保存: 3秒後
						</div>
						<div class="space-x-2">
							<button 
								on:click={() => {
									clearTimeout(saveTimeout);
									saveChapter();
								}} 
								class="btn btn-primary" 
								disabled={isSaving}
								type="button"
							>
								手動保存
							</button>
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
</style>