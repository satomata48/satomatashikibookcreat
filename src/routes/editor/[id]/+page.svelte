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
	
	// HTMLを安全にサニタイズする関数
	$: safeHtml = DOMPurify.sanitize(chapterContent || '', {
		ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
		ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
		KEEP_CONTENT: true
	});
	
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
				<select bind:value={selectedTemplate} class="select select-bordered select-sm w-36">
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
										
										<!-- 最初のページ（タイトルページ） -->
										<div class="a4-page" data-template={selectedTemplate}>
											<h1 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 18pt; text-align: center;' : ''}">{book.title}</h1>
											
											<!-- 最初の章の内容（ページに収まる分だけ） -->
											{#if chapters.length > 0 && chapters[0].content}
												<div class="first-chapter">
													<h2 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第1章：{chapters[0].title}</h2>
													{@html selectedTemplate === 'satomata' ? 
														`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${DOMPurify.sanitize(chapters[0].content, {
															ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
															ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
															KEEP_CONTENT: true
														})}</div>` : 
														DOMPurify.sanitize(chapters[0].content, {
															ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
															ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
															KEEP_CONTENT: true
														})
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
														`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${DOMPurify.sanitize(chapter.content, {
															ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
															ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
															KEEP_CONTENT: true
														})}</div>` : 
														DOMPurify.sanitize(chapter.content, {
															ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
															ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
															KEEP_CONTENT: true
														})
													}
												{:else}
													<p style="{selectedTemplate === 'satomata' ? 'color: #999; font-style: italic;' : ''}" class="text-gray-500 italic">（この章の内容はまだありません）</p>
												{/if}
											</div>
										{/each}
										
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
										{/if}
										<!-- 書籍タイトル -->
										<h1 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 18pt; text-align: center;' : ''}">{book.title}</h1>
										
										<!-- 全章の内容を順番に表示 -->
										{#each chapters as chapter, index}
											<div class="chapter-section" style="margin-bottom: 2rem;">
												<h2 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第{index + 1}章：{chapter.title}</h2>
												{#if chapter.content && chapter.content.trim()}
													{@html selectedTemplate === 'satomata' ? 
														`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${DOMPurify.sanitize(chapter.content, {
															ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
															ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
															KEEP_CONTENT: true
														})}</div>` : 
														DOMPurify.sanitize(chapter.content, {
															ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'div', 'span', 'pre', 'code'],
															ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
															KEEP_CONTENT: true
														})
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

<style>
	.textarea {
		font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
		line-height: 1.8;
	}
</style>