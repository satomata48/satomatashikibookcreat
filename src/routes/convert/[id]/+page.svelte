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
	
	$: book = data.book;
	$: chapters = data.chapters;
	$: totalWordCount = chapters.reduce((sum, chapter) => sum + (chapter.word_count || 0), 0);
	
	// 書籍のメタデータから設定を復元
	$: if (book?.metadata?.template) {
		selectedTemplate = book.metadata.template;
	}
	
	// 選択されたテンプレートのスタイル取得
	$: selectedTemplateData = getTemplate(selectedTemplate);
	$: selectedTemplateStyle = selectedTemplateData?.previewStyle || '';
	
	// HTMLを安全にサニタイズ
	function sanitizeHtml(html: string) {
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'hr', 'a'],
			ALLOWED_ATTR: ['href', 'target', 'rel']
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

	<div class="container mx-auto p-6 max-w-4xl">
		<!-- 書籍情報サマリー -->
		<div class="card bg-base-100 shadow-xl mb-6">
			<div class="card-body">
				<h2 class="card-title text-2xl mb-4">📚 書籍情報</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="stat">
						<div class="stat-title">タイトル</div>
						<div class="stat-value text-lg">{book.title}</div>
					</div>
					<div class="stat">
						<div class="stat-title">章数</div>
						<div class="stat-value text-lg">{chapters.length}章</div>
					</div>
					<div class="stat">
						<div class="stat-title">総文字数</div>
						<div class="stat-value text-lg">{totalWordCount.toLocaleString()}文字</div>
					</div>
				</div>
				
				{#if book.description}
					<div class="mt-4">
						<h3 class="text-lg font-semibold mb-2">概要</h3>
						<p class="text-gray-600">{book.description}</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- 章一覧プレビュー -->
		<div class="card bg-base-100 shadow-xl mb-6">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">📝 章構成プレビュー</h2>
				<div class="space-y-3">
					{#each chapters as chapter, index}
						<div class="collapse collapse-arrow bg-base-200">
							<input type="radio" name="chapter-preview" />
							<div class="collapse-title text-lg font-medium">
								第{index + 1}章: {chapter.title}
								<span class="text-sm text-gray-500 ml-2">({chapter.word_count}文字)</span>
							</div>
							<div class="collapse-content">
								<div class="prose prose-sm max-w-none p-4 bg-white rounded-lg">
									{@html sanitizeHtml(chapter.content || '')}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- テンプレート選択 -->
		<div class="card bg-base-100 shadow-xl mb-6">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">🎨 出力テンプレート選択</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
					{#each templates as template}
						<div class="card bg-base-200 shadow-sm cursor-pointer transition-all hover:shadow-md {selectedTemplate === template.id ? 'ring-2 ring-primary bg-primary/10' : ''}"
							 on:click={() => selectedTemplate = template.id}
							 on:keydown={(e) => e.key === 'Enter' && (selectedTemplate = template.id)}
							 tabindex="0"
							 role="button"
							 aria-pressed={selectedTemplate === template.id}>
							<div class="card-body p-4">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center gap-3 flex-1 min-w-0">
										<span class="text-2xl flex-shrink-0">{template.icon}</span>
										<h3 class="font-semibold text-lg truncate">{template.name}</h3>
									</div>
									{#if selectedTemplate === template.id}
										<span class="badge badge-primary badge-sm flex-shrink-0 ml-2">選択中</span>
									{/if}
								</div>
								<p class="text-sm text-gray-600 mb-3">{template.description}</p>
								<div class="space-y-1">
									{#each template.features as feature}
										<div class="flex items-center gap-2">
											<span class="text-xs">✓</span>
											<span class="text-xs text-gray-600">{feature}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<!-- テンプレートプレビュー -->
		<div class="card bg-base-100 shadow-xl mb-6">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">👁️ テンプレートプレビュー</h2>
				<div class="alert alert-info mb-4">
					<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					<span class="text-sm">選択したテンプレートのスタイルでプレビューを表示しています</span>
				</div>
				
				<!-- テンプレート別プレビュー -->
				<div class="mockup-window border bg-base-300">
					<div class="px-4 py-6 bg-white overflow-y-auto max-h-96">
						<div style={selectedTemplateStyle}>
							<!-- タイトル表示 -->
							{#if selectedTemplate === 'a4-print'}
								<h1 style="font-size: 18pt; text-align: center; margin-bottom: 2em; border-bottom: 1px solid #333; padding-bottom: 0.5em;">
									{book.title}
								</h1>
							{:else if selectedTemplate === 'novel'}
								<h1 style="font-size: 20pt; text-align: center; margin: 2em 0; font-weight: normal;">
									{book.title}
								</h1>
							{:else if selectedTemplate === 'business'}
								<h1 style="color: #2563eb; font-size: 24pt; text-align: center; margin-bottom: 1.5em; font-weight: bold;">
									{book.title}
								</h1>
							{:else if selectedTemplate === 'satomata'}
								<h1 style="font-family: 'Source Han Sans JP', 'Noto Sans JP', sans-serif; font-size: 18pt; font-weight: bold; margin-bottom: 1rem;">
									{book.title}
								</h1>
							{:else}
								<h1 style="font-size: 20pt; margin-bottom: 1em; font-weight: bold;">
									{book.title}
								</h1>
							{/if}
							
							<!-- 著者名 -->
							{#if authorName}
								{#if selectedTemplate === 'satomata'}
									<p style="font-family: 'Source Han Sans JP', 'Noto Sans JP', sans-serif; font-weight: bold; text-align: center; margin-bottom: 2em; opacity: 0.8;">
										{authorName}
									</p>
								{:else}
									<p style="text-align: center; margin-bottom: 2em; opacity: 0.8;">
										{authorName}
									</p>
								{/if}
							{/if}
							
							<!-- 最初の章のプレビュー -->
							{#if chapters.length > 0}
								{#if selectedTemplate === 'a4-print'}
									<h2 style="font-size: 14pt; border-bottom: 1px solid #333; padding-bottom: 0.3em; margin-top: 1.5em;">
										第1章: {chapters[0].title}
									</h2>
								{:else if selectedTemplate === 'novel'}
									<h2 style="font-size: 16pt; margin-top: 2em; text-align: center;">
										第一章　{chapters[0].title}
									</h2>
								{:else if selectedTemplate === 'business'}
									<h2 style="color: #2563eb; font-size: 16pt; border-bottom: 2px solid #2563eb; padding-bottom: 0.3em; margin-top: 1.5em;">
										Chapter 1: {chapters[0].title}
									</h2>
								{:else if selectedTemplate === 'satomata'}
									<h2 style="font-family: 'Source Han Sans JP', 'Noto Sans JP', sans-serif; font-size: 16pt; font-weight: bold; color: #3F51B5; margin-top: 1.5rem; margin-bottom: 1rem;">
										第1章: {chapters[0].title}
									</h2>
								{:else}
									<h2 style="font-size: 16pt; margin-top: 1.5em; font-weight: bold;">
										第1章: {chapters[0].title}
									</h2>
								{/if}
								
								<!-- コンテンツプレビュー -->
								<div style="margin-top: 1em;">
									{#if selectedTemplate === 'novel'}
										<div style="text-indent: 1em;">
											{@html sanitizeHtml(chapters[0].content?.substring(0, 300) || '')}...
										</div>
									{:else if selectedTemplate === 'business'}
										<div>
											{@html sanitizeHtml(chapters[0].content?.substring(0, 300) || '')}
											{#if chapters[0].content && chapters[0].content.length > 300}
												<span style="opacity: 0.6;">...</span>
											{/if}
										</div>
									{:else if selectedTemplate === 'satomata'}
										<div style="font-family: 'Source Han Sans JP', 'Noto Sans JP', sans-serif; font-weight: bold; color: #3F51B5;">
											{@html sanitizeHtml(chapters[0].content?.substring(0, 300) || '')}
											{#if chapters[0].content && chapters[0].content.length > 300}
												<span style="opacity: 0.6; font-weight: bold; color: #3F51B5;">...</span>
											{/if}
										</div>
									{:else}
										<div>
											{@html sanitizeHtml(chapters[0].content?.substring(0, 300) || '')}
											{#if chapters[0].content && chapters[0].content.length > 300}
												<span style="opacity: 0.6;">...</span>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				</div>
				
				<!-- テンプレート特徴の詳細 -->
				<div class="mt-4 p-4 bg-base-200 rounded-lg">
					<h3 class="font-semibold mb-2">📊 {selectedTemplateData?.name}の特徴</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
						{#if selectedTemplateData?.features}
							{#each selectedTemplateData.features as feature}
								<div>• {feature}</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- 変換設定 -->
		<div class="card bg-base-100 shadow-xl mb-6">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">⚙️ エクスポート設定</h2>
				
				<!-- フォーマット選択 -->
				<div class="form-control mb-4">
					<label class="label">
						<span class="label-text">📁 出力フォーマット</span>
					</label>
					<div class="grid grid-cols-3 gap-4">
						<label class="cursor-pointer">
							<input type="radio" name="format" value="epub" bind:group={selectedFormat} class="radio radio-primary" />
							<span class="ml-2">📚 EPUB</span>
							<div class="text-xs text-gray-500 mt-1">電子書籍形式</div>
						</label>
						<label class="cursor-pointer">
							<input type="radio" name="format" value="pdf" bind:group={selectedFormat} class="radio radio-primary" />
							<span class="ml-2">📄 PDF</span>
							<div class="text-xs text-gray-500 mt-1">印刷・配布用</div>
						</label>
						<label class="cursor-pointer">
							<input type="radio" name="format" value="jpeg" bind:group={selectedFormat} class="radio radio-primary" />
							<span class="ml-2">🖼️ JPEG</span>
							<div class="text-xs text-gray-500 mt-1">表紙画像</div>
						</label>
					</div>
				</div>
				<div class="form-control">
					<label class="label">
						<span class="label-text">著者名</span>
					</label>
					<input type="text" placeholder="著者名を入力" class="input input-bordered w-full" bind:value={authorName} />
				</div>
				
				<div class="form-control mt-4">
					<label class="label">
						<span class="label-text">言語設定</span>
					</label>
					<select class="select select-bordered w-full" bind:value={selectedLanguage}>
						<option value="ja">日本語</option>
						<option value="en">English</option>
					</select>
				</div>

				<div class="form-control mt-4">
					<label class="cursor-pointer label">
						<span class="label-text">目次を自動生成する</span>
						<input type="checkbox" bind:checked={generateToc} class="checkbox" />
					</label>
				</div>
			</div>
		</div>

		<!-- 変換実行 -->
		<div class="card bg-primary text-primary-content shadow-xl">
			<div class="card-body">
				<h2 class="card-title text-xl mb-4">🚀 ファイル生成</h2>
				
				{#if !isConverting}
					<div class="mb-4">
						<p class="mb-2">準備完了！選択されたフォーマットでファイルを生成します。</p>
						<div class="flex flex-col gap-2">
							<div class="flex items-center gap-2 p-3 bg-base-100 rounded-lg">
								<span class="text-lg">{selectedTemplateData?.icon}</span>
								<div>
									<span class="font-semibold">{selectedTemplateData?.name}</span>
									<span class="text-sm text-gray-600 ml-2">を使用</span>
								</div>
							</div>
							<div class="flex items-center gap-2 p-3 bg-base-100 rounded-lg">
								<span class="text-lg">
									{selectedFormat === 'pdf' ? '📄' : selectedFormat === 'jpeg' ? '🖼️' : '📚'}
								</span>
								<div>
									<span class="font-semibold">
										{selectedFormat === 'pdf' ? 'PDF' : selectedFormat === 'jpeg' ? 'JPEG画像' : 'EPUB'}
									</span>
									<span class="text-sm text-gray-600 ml-2">形式で出力</span>
								</div>
							</div>
						</div>
					</div>
					<button 
						on:click={convertToEpub}
						class="btn btn-secondary btn-lg"
						type="button"
					>
						{selectedFormat === 'pdf' ? '📄 PDFファイル' : selectedFormat === 'jpeg' ? '🖼️ JPEG画像' : '📚 EPUBファイル'}を生成
					</button>
				{:else}
					<div class="space-y-4">
						<div class="text-lg font-semibold">{convertStatus}</div>
						<progress class="progress progress-secondary w-full" value={convertProgress} max="100"></progress>
						<div class="text-sm opacity-80">{convertProgress}% 完了</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>