<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import DOMPurify from 'dompurify';
	import { templates, getTemplate } from '$lib/templates';
	
	export let data: PageData;
	
	let isConverting = false;
	let convertProgress = 0;
	let convertStatus = '';
	let selectedTemplate = 'simple';
	let authorName = '';
	let selectedLanguage = 'ja';
	let generateToc = true;
	let selectedFormat = 'epub';
	let pageLayout = 'none'; // 'none' または 'a4'
	
	$: book = data.book;
	$: chapters = data.chapters;
	$: totalWordCount = chapters.reduce((sum, chapter) => sum + (chapter.word_count || 0), 0);
	
	// 書籍のメタデータから設定を復元
	$: if (book?.metadata?.template) {
		selectedTemplate = book.metadata.template;
	}
	$: if (book?.metadata?.pageLayout) {
		pageLayout = book.metadata.pageLayout;
	}
	
	// 選択されたテンプレートのスタイル取得
	$: selectedTemplateData = getTemplate(selectedTemplate);
	$: selectedTemplateStyle = selectedTemplateData?.previewStyle || '';
	
	// HTMLを安全にサニタイズ（改行を保持）
	function sanitizeHtml(html: string) {
		if (!html) return '';
		// プレーンテキストの改行を<br>タグに変換
		const htmlWithBreaks = html.replace(/\n/g, '<br>');
		return DOMPurify.sanitize(htmlWithBreaks, {
			ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
		});
	}

	// エッセイテンプレート用：カスタムページブレークタグで章内容を分割する関数
	function splitContentByPageBreaks(content: string): { content: string, isPageBreakContent: boolean }[] {
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
	}

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
	
	async function convertToEpub() {
		isConverting = true;
		convertProgress = 0;
		convertStatus = 'EPUB生成を開始しています...';
		
		try {
			const selectedTemplateData = getTemplate(selectedTemplate);
			
			// プログレス表示
			const progressSteps = [
				{ progress: 10, status: `${selectedTemplateData?.name}を適用中...` },
				{ progress: 25, status: '章データを準備中...' },
				{ progress: 45, status: 'HTMLコンテンツを処理中...' },
				{ progress: 65, status: 'スタイリングを適用中...' },
				{ progress: 85, status: 'EPUBファイルを生成中...' }
			];
			
			// プログレス表示を開始
			let currentStep = 0;
			const progressInterval = setInterval(() => {
				if (currentStep < progressSteps.length) {
					convertProgress = progressSteps[currentStep].progress;
					convertStatus = progressSteps[currentStep].status;
					currentStep++;
				}
			}, 600);
			
			// 実際のエクスポートAPIを呼び出し
			const response = await fetch('/api/generate-export', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					bookId: book.id,
					format: selectedFormat,
					template: selectedTemplate,
					authorName: authorName || 'Anonymous',
					language: selectedLanguage,
					generateToc: generateToc
				})
			});
			
			clearInterval(progressInterval);
			
			if (!response.ok) {
				const errorData = await response.text();
				throw new Error(`EPUB生成に失敗しました: ${errorData}`);
			}
			
			// ファイルをダウンロード
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			const extension = selectedFormat === 'pdf' ? 'pdf' : selectedFormat === 'jpeg' ? 'jpg' : 'html';
			a.download = `${book.title}.${extension}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			
			convertProgress = 100;
			const formatName = selectedFormat === 'pdf' ? 'PDF' : selectedFormat === 'jpeg' ? 'JPEG画像' : 'EPUB';
			convertStatus = `${selectedTemplateData?.name}で${formatName}ファイルを生成しました！ダウンロードが開始されました。`;
			
			// 5秒後に元の状態に戻す
			setTimeout(() => {
				isConverting = false;
				convertProgress = 0;
				convertStatus = '';
			}, 5000);
			
		} catch (error) {
			console.error('EPUB conversion error:', error);
			convertStatus = `エラー: ${error instanceof Error ? error.message : 'EPUB生成に失敗しました'}`;
			setTimeout(() => {
				isConverting = false;
				convertProgress = 0;
				convertStatus = '';
			}, 3000);
		}
	}
</script>

<svelte:head>
	<title>{book.title} - EPUB変換</title>
</svelte:head>

<div class="min-h-screen bg-base-100">
	<!-- ヘッダー -->
	<div class="navbar bg-base-200 shadow-sm">
		<div class="navbar-start">
			<button on:click={() => goto(`/editor/${book.id}`)} class="btn btn-ghost">
				← エディターに戻る
			</button>
		</div>
		<div class="navbar-center">
			<h1 class="text-xl font-bold">📖 EPUB変換 - {book.title}</h1>
		</div>
	</div>

	<!-- 2カラムレイアウト（エディターページと同じ構造） -->
	<div class="flex h-screen">
		<!-- 左カラム：設定とコントロール -->
		<div class="w-1/2 overflow-y-auto p-6 bg-base-200">
			<!-- 書籍情報サマリー -->
			<div class="card bg-base-100 shadow-xl mb-6">
				<div class="card-body p-4">
					<h2 class="card-title text-xl mb-3">📚 書籍情報</h2>
					<div class="grid grid-cols-1 gap-3">
						<div class="stat bg-base-200 p-3 rounded">
							<div class="stat-title text-xs">タイトル</div>
							<div class="stat-value text-sm">{book.title}</div>
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div class="stat bg-base-200 p-3 rounded">
								<div class="stat-title text-xs">章数</div>
								<div class="stat-value text-sm">{chapters.length}章</div>
							</div>
							<div class="stat bg-base-200 p-3 rounded">
								<div class="stat-title text-xs">文字数</div>
								<div class="stat-value text-sm">{totalWordCount.toLocaleString()}</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ページレイアウト選択 -->
			<div class="card bg-base-100 shadow-xl mb-4">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3">📐 レイアウト設定</h2>
					<div class="flex items-center space-x-3">
						<span class="text-sm font-medium">表示形式:</span>
						<select bind:value={pageLayout} class="select select-bordered select-sm">
							<option value="none">通常</option>
							<option value="a4">A4</option>
						</select>
					</div>
				</div>
			</div>

			<!-- テンプレート選択 -->
			<div class="card bg-base-100 shadow-xl mb-4">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3">🎨 テンプレート選択</h2>
					<div class="grid grid-cols-1 gap-2">
						{#each templates as template}
							<div class="card bg-base-200 shadow-sm cursor-pointer transition-all hover:shadow-md {selectedTemplate === template.id ? 'ring-2 ring-primary bg-primary/10' : ''}"
								 on:click={() => selectedTemplate = template.id}
								 on:keydown={(e) => e.key === 'Enter' && (selectedTemplate = template.id)}
								 tabindex="0"
								 role="button"
								 aria-pressed={selectedTemplate === template.id}>
								<div class="card-body p-3">
									<div class="flex items-center gap-2">
										<span class="text-lg">{template.icon}</span>
										<h3 class="font-semibold text-sm truncate">{template.name}</h3>
										{#if selectedTemplate === template.id}
											<span class="badge badge-primary badge-xs ml-auto">選択中</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>

			<!-- エクスポート設定 -->
			<div class="card bg-base-100 shadow-xl mb-4">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3">⚙️ エクスポート設定</h2>

					<!-- フォーマット選択 -->
					<div class="form-control mb-3">
						<label class="label py-1">
							<span class="label-text text-sm">📁 出力フォーマット</span>
						</label>
						<div class="grid grid-cols-3 gap-2">
							<label class="cursor-pointer">
								<input type="radio" name="format" value="epub" bind:group={selectedFormat} class="radio radio-primary radio-xs" />
								<span class="ml-1 text-xs">📚 EPUB</span>
							</label>
							<label class="cursor-pointer">
								<input type="radio" name="format" value="pdf" bind:group={selectedFormat} class="radio radio-primary radio-xs" />
								<span class="ml-1 text-xs">📄 PDF</span>
							</label>
							<label class="cursor-pointer">
								<input type="radio" name="format" value="jpeg" bind:group={selectedFormat} class="radio radio-primary radio-xs" />
								<span class="ml-1 text-xs">🖼️ JPEG</span>
							</label>
						</div>
					</div>

				</div>
			</div>

			<!-- 変換実行 -->
			<div class="card bg-primary text-primary-content shadow-xl">
				<div class="card-body p-4">
					<h2 class="card-title text-lg mb-3">🚀 ファイル生成</h2>

					{#if !isConverting}
						<button
							on:click={convertToEpub}
							class="btn btn-secondary btn-sm w-full"
							type="button"
						>
							{selectedFormat === 'pdf' ? '📄 PDFファイル' : selectedFormat === 'jpeg' ? '🖼️ JPEG画像' : '📚 EPUBファイル'}を生成
						</button>
					{:else}
						<div class="space-y-2">
							<div class="text-sm font-semibold">{convertStatus}</div>
							<progress class="progress progress-secondary w-full" value={convertProgress} max="100"></progress>
							<div class="text-xs opacity-80">{convertProgress}% 完了</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- 右カラム：プレビュー（editorページと同じ） -->
		<div class="w-1/2 flex flex-col">
			<div class="p-4 border-b border-base-300">
				<span class="text-lg font-medium text-green-700">👁️ プレビュー（{selectedTemplateData?.name}）</span>
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
								.a4-page .page-content.pagebreak-content * {
									font-weight: bold !important;
								}
								/* 通常のページコンテンツのスタイル */
								.page-content:not(.pagebreak-content) {
									padding: 15mm 10mm 10mm 10mm !important;
									font-size: 12pt !important;
									line-height: 1.6 !important;
									text-align: justify !important;
									display: block !important;
									justify-content: flex-start !important;
									align-items: flex-start !important;
									width: 100% !important;
									max-width: none !important;
									box-sizing: border-box !important;
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
								}
							</style>`}
						{/if}

						{#if selectedTemplate === 'essay'}
							<!-- エッセイテンプレート: 各章をページブレークで分割 -->
							{#each chapters as chapter, index}
								{#if chapter.content && chapter.content.trim()}
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
							<!-- 書籍タイトルページ -->
							<div class="a4-page" data-template={selectedTemplate}>
								<h1>{book.title}</h1>
							</div>

							<!-- 各章をページブレークで分割 -->
							{#each chapters as chapter, index}
								{#if chapter.content && chapter.content.trim()}
									{@const contentParts = splitContentByPageBreaks(chapter.content)}
									{#each contentParts as part, partIndex}
										<div class="a4-page" data-template={selectedTemplate}>
											<div class="page-content {part.isPageBreakContent ? 'pagebreak-content' : ''}">
												{@html sanitizeWithLineBreaks(part.content)}
											</div>
										</div>
									{/each}
								{:else}
									<div class="a4-page" data-template={selectedTemplate}>
										<div class="page-content">
											<p class="text-gray-500 italic">（この章の内容はまだありません）</p>
										</div>
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
					<div class="bg-white border border-base-300 rounded-lg preview-content" data-template={selectedTemplate} style="{selectedTemplateData?.previewStyle || ''}; padding: 2rem; margin: 1rem;">
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
								.preview-content p {
									font-family: "Source Han Sans JP", "Noto Sans JP", sans-serif !important;
									font-weight: normal !important;
									color: #333 !important;
									font-size: 12pt !important;
									margin-bottom: 1rem !important;
								}
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

						<h1 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 18pt; text-align: center;' : ''}">{book.title}</h1>

						{#if chapters.length > 0}
							<!-- 最初の章（ページ分割なし、レイアウト確認用） -->
							<div class="first-chapter">
								<h2 style="{selectedTemplate === 'satomata' ? 'color: #3F51B5; font-family: Source Han Sans JP, sans-serif; font-weight: bold; font-size: 16pt;' : ''}">第1章：{chapters[0].title}</h2>
								{#if chapters[0].content}
									{@html selectedTemplate === 'satomata' ?
										`<div style="color: #3F51B5; font-family: 'Source Han Sans JP', sans-serif; font-weight: bold;">${sanitizeWithLineBreaks(chapters[0].content)}</div>` :
										sanitizeWithLineBreaks(chapters[0].content)
									}
								{:else}
									<p style="{selectedTemplate === 'satomata' ? 'color: #999; font-style: italic;' : ''}" class="text-gray-500 italic">（この章の内容はまだありません）</p>
								{/if}
							</div>

							<!-- 2章目以降（レイアウト確認用）-->
							{#each chapters.slice(1) as chapter, index}
								<div class="chapter-section">
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
						{:else}
							<p class="text-gray-500 italic">まだ章が作成されていません。最初の章を作成してください。</p>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>