<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	export let data: PageData;

	let activeSection: 'books' | 'slides' | 'ai' = 'books';
	let searchQuery = '';
	let viewMode: 'grid' | 'list' = 'grid';
	let showNewBookModal = false;
	let showNewSlideModal = false;
	let newBookTitle = '';
	let newSlideTitle = '';
	let newSlideDescription = '';
	let creating = false;

	// LLMモデル設定（統一管理）
	let configName = '';
	let apiKey = '';
	let availableModels: any[] = [];
	let selectedModel = '';
	let loading = false;
	let savedConfigs: Array<{id: string, name: string, api_key: string, model: string, created_at: string, purpose: string}> = [];

	// チャットテスト機能
	let selectedTestConfig = '';
	let chatMessages: Array<{role: 'user' | 'assistant', content: string}> = [];
	let userMessage = '';
	let isSending = false;

	// AI関連の状態
	let aiTopic = '';
	let aiSlideCount = 5;
	let aiBookChapterCount = 5;
	let aiTheme = 'modern';
	let aiGenerating = false;
	let aiContentType: 'slides' | 'book' = 'slides';

	// 既存データ参照機能
	let useReferenceData = false;
	let selectedReferenceSlide = '';
	let selectedReferenceBook = '';

	// ユーザー設定を読み込み
	onMount(async () => {
		try {
			// 保存済みAPI設定を読み込む
			await loadSavedConfigs();
		} catch (error) {
			console.error('設定読み込みエラー:', error);
		}
	});

	// 保存済みAPI設定を読み込む
	const loadSavedConfigs = async () => {
		try {
			const { data: configs, error } = await data.supabase
				.from('api_configurations')
				.select('*')
				.eq('user_id', data.session?.user.id)
				.order('created_at', { ascending: false });

			if (error) throw error;

			if (configs) {
				savedConfigs = configs;
			}
		} catch (error) {
			console.error('設定読み込みエラー:', error);
		}
	};

	// Gemini APIからモデル一覧を取得
	const fetchModels = async () => {
		if (!apiKey) {
			alert('先にAPIキーを入力してください');
			return;
		}

		loading = true;

		try {
			const response = await fetch('/api/gemini/models', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiKey })
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'モデル取得に失敗しました');
			}

			// テキスト生成用モデルのみフィルタ
			availableModels = result.models.filter((m: any) =>
				m.purposes && m.purposes.includes('text')
			);

			if (availableModels.length === 0) {
				alert(`⚠️ テキスト生成用のモデルが見つかりませんでした`);
			} else {
				alert(`✅ ${availableModels.length}個のモデルを取得しました！`);
			}

		} catch (error: any) {
			console.error('モデル取得エラー:', error);
			alert(`❌ モデル取得エラー: ${error.message}`);
		} finally {
			loading = false;
		}
	};

	$: filteredBooks = data.books?.filter(book =>
		book.title.toLowerCase().includes(searchQuery.toLowerCase())
	) || [];

	$: filteredPresentations = data.presentations?.filter(presentation =>
		presentation.title.toLowerCase().includes(searchQuery.toLowerCase())
	) || [];


	const createNewBook = async () => {
		if (!newBookTitle.trim()) return;

		creating = true;
		try {
			const { data: newBook, error } = await data.supabase
				.from('books')
				.insert({
					title: newBookTitle,
					user_id: data.session?.user.id,
					status: 'draft',
					language: 'ja',
					metadata: {}
				})
				.select()
				.single();

			if (error) throw error;

			goto(`/editor/${newBook.id}`);
		} catch (error) {
			console.error('Error creating book:', error);
			alert('書籍の作成に失敗しました');
		} finally {
			creating = false;
			showNewBookModal = false;
			newBookTitle = '';
		}
	};

	const createNewSlide = async () => {
		if (!newSlideTitle.trim()) return;

		creating = true;
		try {
			const { data: newPresentation, error } = await data.supabase
				.from('presentations')
				.insert({
					title: newSlideTitle,
					description: newSlideDescription,
					user_id: data.session?.user.id,
					status: 'draft',
					theme: 'modern',
					metadata: {}
				})
				.select()
				.single();

			if (error) throw error;

			goto(`/slide-editor/${newPresentation.id}`);
		} catch (error) {
			console.error('Error creating presentation:', error);
			alert('スライドの作成に失敗しました');
		} finally {
			creating = false;
			showNewSlideModal = false;
			newSlideTitle = '';
			newSlideDescription = '';
		}
	};

	const deleteBook = async (bookId: string) => {
		if (!confirm('この書籍を削除してもよろしいですか？')) return;

		try {
			const { error } = await data.supabase
				.from('books')
				.delete()
				.eq('id', bookId);

			if (error) throw error;

			data.books = data.books.filter(book => book.id !== bookId);
		} catch (error) {
			console.error('Error deleting book:', error);
			alert('書籍の削除に失敗しました');
		}
	};

	const deletePresentation = async (presentationId: string) => {
		if (!confirm('このスライドを削除してもよろしいですか？')) return;

		try {
			const { error } = await data.supabase
				.from('presentations')
				.delete()
				.eq('id', presentationId);

			if (error) throw error;

			data.presentations = data.presentations.filter(p => p.id !== presentationId);
		} catch (error) {
			console.error('Error deleting presentation:', error);
			alert('スライドの削除に失敗しました');
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	};

	// 設定を保存
	const saveConfig = async () => {
		try {
			if (!configName.trim()) {
				alert('⚠️ 設定名を入力してください');
				return;
			}

			if (!apiKey) {
				alert('⚠️ APIキーを入力してください');
				return;
			}

			if (!selectedModel) {
				alert('⚠️ モデルを選択してください');
				return;
			}

			// 新しい設定を保存（カテゴリは常にtext）
			const { error } = await data.supabase
				.from('api_configurations')
				.insert({
					user_id: data.session?.user.id,
					purpose: 'text',
					name: configName,
					api_key: apiKey,
					model: selectedModel,
					created_at: new Date().toISOString()
				});

			if (error) throw error;

			alert(`✅ 設定「${configName}」を保存しました！`);

			// リロードして更新
			await loadSavedConfigs();

			// フォームをリセット
			configName = '';
			apiKey = '';
			selectedModel = '';
			availableModels = [];

		} catch (error: any) {
			console.error('Error saving settings:', error);
			alert(`❌ 保存エラー: ${error.message}`);
		}
	};

	// 設定を削除
	const deleteConfig = async (configId: string) => {
		if (!confirm('この設定を削除してもよろしいですか？')) return;

		try {
			const { error } = await data.supabase
				.from('api_configurations')
				.delete()
				.eq('id', configId);

			if (error) throw error;

			alert('✅ 設定を削除しました');
			await loadSavedConfigs();
		} catch (error: any) {
			console.error('Error deleting config:', error);
			alert(`❌ 削除エラー: ${error.message}`);
		}
	};

	// チャットメッセージを送信
	const sendChatMessage = async () => {
		if (!userMessage.trim() || !selectedTestConfig || isSending) return;

		const config = savedConfigs.find(c => c.id === selectedTestConfig);
		if (!config) {
			alert('設定が見つかりません');
			return;
		}

		isSending = true;
		const messageToSend = userMessage.trim();
		userMessage = '';

		// ユーザーメッセージを追加
		chatMessages = [...chatMessages, { role: 'user', content: messageToSend }];

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					apiKey: config.api_key,
					model: config.model,
					messages: chatMessages
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'メッセージ送信に失敗しました');
			}

			// アシスタントの返答を追加
			chatMessages = [...chatMessages, { role: 'assistant', content: result.message }];

		} catch (error: any) {
			console.error('チャットエラー:', error);
			alert(`❌ エラー: ${error.message}`);
			// エラーの場合、ユーザーメッセージを戻す
			chatMessages = chatMessages.slice(0, -1);
			userMessage = messageToSend;
		} finally {
			isSending = false;
		}
	};

	// チャット履歴をクリア
	const clearChat = () => {
		if (confirm('チャット履歴をクリアしますか？')) {
			chatMessages = [];
		}
	};



	// 参考データを取得
	const getReferenceData = async () => {
		if (aiContentType === 'slides' && selectedReferenceSlide) {
			// 選択されたプレゼンテーションとそのスライドを取得
			const { data: presentation } = await data.supabase
				.from('presentations')
				.select('*')
				.eq('id', selectedReferenceSlide)
				.single();

			const { data: slides } = await data.supabase
				.from('slides')
				.select('*')
				.eq('presentation_id', selectedReferenceSlide)
				.order('order_number');

			return { presentation, slides };
		} else if (aiContentType === 'book' && selectedReferenceBook) {
			// 選択された書籍とその章を取得
			const { data: book } = await data.supabase
				.from('books')
				.select('*')
				.eq('id', selectedReferenceBook)
				.single();

			const { data: chapters } = await data.supabase
				.from('chapters')
				.select('*')
				.eq('book_id', selectedReferenceBook)
				.order('order_number');

			return { book, chapters };
		}
		return null;
	};

	// AIでスライド生成
	const generateAISlides = async () => {
		// APIキーチェック
		const apiKey = geminiApiKey;
		if (!apiKey) {
			alert('先にGemini APIキーを設定してください');
			showApiKeyModal = true;
			return;
		}

		// 用途別モデルチェック（デザイン用）
		if (!purposeModels.design) {
			alert('デザイン用のモデルを設定してください');
			showApiKeyModal = true;
			return;
		}

		if (!aiTopic.trim()) {
			alert('トピックを入力してください');
			return;
		}

		aiGenerating = true;
		try {
			// 参考データを取得（オプション）
			let referenceData = null;
			if (useReferenceData && selectedReferenceSlide) {
				referenceData = await getReferenceData();
			}

			// AIにスライド生成を依頼
			const response = await fetch('/api/gemini/generate-slides', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic: aiTopic,
					slideCount: aiSlideCount,
					theme: aiTheme,
					userApiKey: apiKey,
					model: purposeModels.design,
					referenceData: referenceData
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'AI生成に失敗しました');
			}

			// プレゼンテーション作成
			const { data: newPresentation, error: presentationError } = await data.supabase
				.from('presentations')
				.insert({
					title: aiTopic,
					description: `AI生成: ${aiTopic}`,
					user_id: data.session?.user.id,
					status: 'draft',
					theme: aiTheme,
					metadata: { ai_generated: true, model: selectedModel }
				})
				.select()
				.single();

			if (presentationError) throw presentationError;

			// スライドを一括作成
			const slidesData = result.slides.map((slide: any, index: number) => ({
				presentation_id: newPresentation.id,
				title: slide.title,
				content: slide.content,
				layout_type: slide.layout_type || 'title-content',
				speaker_notes: slide.speaker_notes || '',
				order_number: index,
				background_color: '#FFFFFF'
			}));

			const { error: slidesError } = await data.supabase
				.from('slides')
				.insert(slidesData);

			if (slidesError) throw slidesError;

			// 成功したらエディタに移動
			alert(`✅ AI生成成功！${result.slides.length}枚のスライドを作成しました。`);
			goto(`/slide-editor/${newPresentation.id}`);

		} catch (error: any) {
			console.error('AI generation error:', error);
			alert(`❌ AI生成エラー: ${error.message}`);
		} finally {
			aiGenerating = false;
		}
	};

	// AIで電子書籍生成
	const generateAIBook = async () => {
		// APIキーチェック
		const apiKey = geminiApiKey;
		if (!apiKey) {
			alert('先にGemini APIキーを設定してください');
			showApiKeyModal = true;
			return;
		}

		// 用途別モデルチェック（テキスト用）
		if (!purposeModels.text) {
			alert('テキスト用のモデルを設定してください');
			showApiKeyModal = true;
			return;
		}

		if (!aiTopic.trim()) {
			alert('トピック/書籍タイトルを入力してください');
			return;
		}

		aiGenerating = true;
		try {
			// 参考データを取得（オプション）
			let referenceData = null;
			if (useReferenceData && selectedReferenceBook) {
				referenceData = await getReferenceData();
			}

			// AIに電子書籍生成を依頼
			const response = await fetch('/api/gemini/generate-book', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					topic: aiTopic,
					chapterCount: aiBookChapterCount,
					bookTitle: aiTopic,
					userApiKey: apiKey,
					model: purposeModels.text,
					referenceData: referenceData
				})
			});

			const result = await response.json();

			if (!response.ok || !result.success) {
				throw new Error(result.error || 'AI生成に失敗しました');
			}

			// 書籍作成
			const { data: newBook, error: bookError } = await data.supabase
				.from('books')
				.insert({
					title: result.bookTitle,
					user_id: data.session?.user.id,
					status: 'draft',
					language: 'ja',
					metadata: { ai_generated: true, model: selectedModel }
				})
				.select()
				.single();

			if (bookError) throw bookError;

			// 章を一括作成
			const chaptersData = result.chapters.map((chapter: any, index: number) => ({
				book_id: newBook.id,
				title: chapter.title,
				content: chapter.content,
				order_number: index,
				word_count: chapter.content.replace(/<[^>]*>/g, '').length
			}));

			const { error: chaptersError } = await data.supabase
				.from('chapters')
				.insert(chaptersData);

			if (chaptersError) throw chaptersError;

			// 成功したらエディタに移動
			alert(`✅ AI生成成功！${result.chapters.length}章の電子書籍を作成しました。`);
			goto(`/editor/${newBook.id}`);

		} catch (error: any) {
			console.error('AI generation error:', error);
			alert(`❌ AI生成エラー: ${error.message}`);
		} finally {
			aiGenerating = false;
		}
	};
</script>

<svelte:head>
	<title>ダッシュボード - さとまた式電子書籍クリエイター</title>
</svelte:head>

<div class="flex min-h-screen bg-light-bg">
	<!-- サイドバー -->
	<aside class="w-64 bg-white border-r border-blue-200 shadow-sm">
		<div class="p-6">
			<h2 class="text-lg font-bold text-blue-900 mb-4">メニュー</h2>
			<nav class="space-y-2">
				<button
					on:click={() => { activeSection = 'books'; searchQuery = ''; }}
					class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {activeSection === 'books' ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-blue-700 hover:bg-blue-50'}"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
						<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
					</svg>
					<span>電子書籍作成</span>
				</button>

				<button
					on:click={() => { activeSection = 'slides'; searchQuery = ''; }}
					class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {activeSection === 'slides' ? 'bg-blue-100 text-blue-900 font-semibold' : 'text-blue-700 hover:bg-blue-50'}"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
						<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
					</svg>
					<span>スライド作成</span>
				</button>

				<button
					on:click={() => { activeSection = 'ai'; searchQuery = ''; }}
					class="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors {activeSection === 'ai' ? 'bg-purple-100 text-purple-900 font-semibold' : 'text-purple-700 hover:bg-purple-50'}"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
						<path d="M12 7.5c.83 0 1.5-.67 1.5-1.5S12.83 4.5 12 4.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm0 9c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM7.5 12c0-.83-.67-1.5-1.5-1.5S4.5 11.17 4.5 12s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zm9 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z"/>
					</svg>
					<span>AI API設定</span>
				</button>
			</nav>
		</div>

		<div class="px-6 py-4 border-t border-blue-100">
			<div class="text-xs text-blue-600">
				<p class="font-semibold mb-1">統計</p>
				<p>書籍: {data.books?.length || 0}件</p>
				<p>スライド: {data.presentations?.length || 0}件</p>
			</div>
		</div>
	</aside>

	<!-- メインコンテンツ -->
	<main class="flex-1 overflow-y-auto">
		<div class="container mx-auto px-8 py-8">
			<!-- 電子書籍セクション -->
			{#if activeSection === 'books'}
				<div class="flex justify-between items-center mb-8">
					<h1 class="text-3xl font-bold text-blue-900">電子書籍作成</h1>
					<button
						on:click={() => showNewBookModal = true}
						class="btn btn-primary-gradient btn-lg shadow-lg"
					>
						+ 新規作成
					</button>
				</div>

				<div class="flex flex-col md:flex-row gap-4 mb-6">
					<div class="flex-1">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="書籍を検索..."
							class="input input-bordered w-full border-blue-200 focus:border-blue-400"
						/>
					</div>
					<div class="btn-group">
						<button
							on:click={() => viewMode = 'grid'}
							class="btn border-blue-200 text-blue-700 hover:bg-blue-50 {viewMode === 'grid' ? 'bg-blue-100 border-blue-400' : ''}"
							aria-label="グリッド表示"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
							</svg>
						</button>
						<button
							on:click={() => viewMode = 'list'}
							class="btn border-blue-200 text-blue-700 hover:bg-blue-50 {viewMode === 'list' ? 'bg-blue-100 border-blue-400' : ''}"
							aria-label="リスト表示"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				</div>

				{#if filteredBooks.length === 0}
					<div class="text-center py-20">
						<div class="icon-blue text-6xl mb-4 inline-block p-4">
							<svg class="book-icon-large" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
							</svg>
						</div>
						<h2 class="text-2xl font-semibold mb-2 text-blue-900">まだ書籍がありません</h2>
						<p class="text-blue-700 mb-6">最初の書籍を作成してみましょう</p>
						<button
							on:click={() => showNewBookModal = true}
							class="btn btn-primary-gradient btn-lg shadow-lg"
						>
							書籍を作成
						</button>
					</div>
				{:else if viewMode === 'grid'}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{#each filteredBooks as book}
							<div class="card-flat">
								<figure class="px-10 pt-10">
									{#if book.cover_image_url}
										<img src={book.cover_image_url} alt={book.title} class="rounded-xl h-48 w-full object-cover" />
									{:else}
										<div class="rounded-xl h-48 w-full bg-gradient-to-br from-primary-blue to-secondary-blue flex items-center justify-center">
											<svg class="w-16 h-16 fill-blue-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6C22.4 5.55 21.75 5.25 21 5zM21 18.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5V18.5z"/>
												<path d="M17.5 10.5c.88 0 1.73.09 2.5.26V9.24C19.21 9.09 18.36 9 17.5 9c-1.7 0-3.24.29-4.5.83v1.66C14.13 10.81 15.7 10.5 17.5 10.5z"/>
												<path d="M13 12.49v1.66c1.13-.64 2.7-.99 4.5-.99.88 0 1.73.09 2.5.26V11.9c-.79-.15-1.64-.24-2.5-.24C15.8 11.66 14.26 11.96 13 12.49z"/>
												<path d="M17.5 14.33c-1.7 0-3.24.29-4.5.83v1.66c1.26-.54 2.8-.83 4.5-.83.88 0 1.73.09 2.5.26v-1.52C19.21 14.58 18.36 14.33 17.5 14.33z"/>
											</svg>
										</div>
									{/if}
								</figure>
								<div class="card-body">
									<h2 class="card-title text-blue-900">{book.title}</h2>
									<p class="text-sm text-blue-700">
										{book.author || '著者未設定'}
									</p>
									<div class="flex gap-2 flex-wrap">
										<div class="badge border-blue-300 text-blue-700">
											{book.status === 'draft' ? '下書き' : book.status === 'published' ? '公開済み' : 'アーカイブ'}
										</div>
									</div>
									<p class="text-xs text-blue-600 mt-2">
										更新: {formatDate(book.updated_at)}
									</p>
									<div class="card-actions justify-end mt-4">
										<a href="/editor/{book.id}" class="btn bg-blue-500 hover:bg-blue-600 text-white border-0 btn-sm">編集</a>
										<button
											on:click={() => deleteBook(book.id)}
											class="btn btn-outline btn-sm border-red-300 text-red-600 hover:bg-red-50"
										>
											削除
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table w-full bg-white border border-blue-100 rounded-xl">
							<thead>
								<tr class="bg-blue-50 text-blue-900">
									<th>タイトル</th>
									<th>著者</th>
									<th>ステータス</th>
									<th>更新日</th>
									<th>アクション</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredBooks as book}
									<tr class="hover:bg-blue-25 border-blue-100">
										<td class="font-semibold text-blue-900">{book.title}</td>
										<td class="text-blue-700">{book.author || '著者未設定'}</td>
										<td>
											<div class="badge border-blue-300 text-blue-700">
												{book.status === 'draft' ? '下書き' : book.status === 'published' ? '公開済み' : 'アーカイブ'}
											</div>
										</td>
										<td class="text-blue-600">{formatDate(book.updated_at)}</td>
										<td>
											<div class="flex gap-2">
												<a href="/editor/{book.id}" class="btn bg-blue-500 hover:bg-blue-600 text-white border-0 btn-xs">編集</a>
												<button
													on:click={() => deleteBook(book.id)}
													class="btn btn-outline btn-xs border-red-300 text-red-600 hover:bg-red-50"
												>
													削除
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

			<!-- スライドセクション -->
			{:else if activeSection === 'slides'}
				<div class="flex justify-between items-center mb-8">
					<h1 class="text-3xl font-bold text-blue-900">スライド作成</h1>
					<button
						on:click={() => showNewSlideModal = true}
						class="btn btn-primary-gradient btn-lg shadow-lg"
					>
						+ 新規作成
					</button>
				</div>

				<div class="flex flex-col md:flex-row gap-4 mb-6">
					<div class="flex-1">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="スライドを検索..."
							class="input input-bordered w-full border-blue-200 focus:border-blue-400"
						/>
					</div>
					<div class="btn-group">
						<button
							on:click={() => viewMode = 'grid'}
							class="btn border-blue-200 text-blue-700 hover:bg-blue-50 {viewMode === 'grid' ? 'bg-blue-100 border-blue-400' : ''}"
							aria-label="グリッド表示"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
							</svg>
						</button>
						<button
							on:click={() => viewMode = 'list'}
							class="btn border-blue-200 text-blue-700 hover:bg-blue-50 {viewMode === 'list' ? 'bg-blue-100 border-blue-400' : ''}"
							aria-label="リスト表示"
						>
							<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
								<path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd" />
							</svg>
						</button>
					</div>
				</div>

				{#if filteredPresentations.length === 0}
					<div class="text-center py-20">
						<div class="icon-blue text-6xl mb-4 inline-block p-4">
							<svg class="w-16 h-16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
								<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
							</svg>
						</div>
						<h2 class="text-2xl font-semibold mb-2 text-blue-900">まだスライドがありません</h2>
						<p class="text-blue-700 mb-6">最初のスライドを作成してみましょう</p>
						<button
							on:click={() => showNewSlideModal = true}
							class="btn btn-primary-gradient btn-lg shadow-lg"
						>
							スライドを作成
						</button>
					</div>
				{:else if viewMode === 'grid'}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{#each filteredPresentations as presentation}
							<div class="card-flat">
								<figure class="px-10 pt-10">
									{#if presentation.cover_image_url}
										<img src={presentation.cover_image_url} alt={presentation.title} class="rounded-xl h-48 w-full object-cover" />
									{:else}
										<div class="rounded-xl h-48 w-full bg-gradient-to-br from-primary-blue to-secondary-blue flex items-center justify-center">
											<svg class="w-16 h-16 fill-blue-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
												<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
											</svg>
										</div>
									{/if}
								</figure>
								<div class="card-body">
									<h2 class="card-title text-blue-900">{presentation.title}</h2>
									<p class="text-sm text-blue-700">
										{presentation.description || '説明なし'}
									</p>
									<div class="flex gap-2 flex-wrap">
										<div class="badge border-blue-300 text-blue-700">
											{presentation.status === 'draft' ? '下書き' : presentation.status === 'published' ? '公開済み' : 'アーカイブ'}
										</div>
										<div class="badge border-purple-300 text-purple-700 bg-purple-50">
											{presentation.theme}
										</div>
									</div>
									<p class="text-xs text-blue-600 mt-2">
										更新: {formatDate(presentation.updated_at)}
									</p>
									<div class="card-actions justify-end mt-4">
										<a href="/slide-editor/{presentation.id}" class="btn bg-blue-500 hover:bg-blue-600 text-white border-0 btn-sm">編集</a>
										<button
											on:click={() => deletePresentation(presentation.id)}
											class="btn btn-outline btn-sm border-red-300 text-red-600 hover:bg-red-50"
										>
											削除
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="table w-full bg-white border border-blue-100 rounded-xl">
							<thead>
								<tr class="bg-blue-50 text-blue-900">
									<th>タイトル</th>
									<th>説明</th>
									<th>テーマ</th>
									<th>ステータス</th>
									<th>更新日</th>
									<th>アクション</th>
								</tr>
							</thead>
							<tbody>
								{#each filteredPresentations as presentation}
									<tr class="hover:bg-blue-25 border-blue-100">
										<td class="font-semibold text-blue-900">{presentation.title}</td>
										<td class="text-blue-700">{presentation.description || '説明なし'}</td>
										<td>
											<div class="badge border-purple-300 text-purple-700 bg-purple-50">
												{presentation.theme}
											</div>
										</td>
										<td>
											<div class="badge border-blue-300 text-blue-700">
												{presentation.status === 'draft' ? '下書き' : presentation.status === 'published' ? '公開済み' : 'アーカイブ'}
											</div>
										</td>
										<td class="text-blue-600">{formatDate(presentation.updated_at)}</td>
										<td>
											<div class="flex gap-2">
												<a href="/slide-editor/{presentation.id}" class="btn bg-blue-500 hover:bg-blue-600 text-white border-0 btn-xs">編集</a>
												<button
													on:click={() => deletePresentation(presentation.id)}
													class="btn btn-outline btn-xs border-red-300 text-red-600 hover:bg-red-50"
												>
													削除
												</button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

			<!-- AI API設定セクション -->
			{:else if activeSection === 'ai'}
				<div class="max-w-6xl mx-auto">
					<div class="flex justify-between items-center mb-8">
						<div>
							<h1 class="text-3xl font-bold text-purple-900">AI API設定</h1>
							<p class="text-purple-700 mt-2">用途別にGemini AIモデルを設定します（複数保存可能）</p>
						</div>
						<svg class="w-16 h-16 fill-purple-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
							<path d="M12 7.5c.83 0 1.5-.67 1.5-1.5S12.83 4.5 12 4.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm0 9c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM7.5 12c0-.83-.67-1.5-1.5-1.5S4.5 11.17 4.5 12s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5zm9 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5z"/>
						</svg>
					</div>

						<!-- 新規設定作成フォーム -->
					<div class="card bg-white border border-blue-200 shadow-md mb-6">
						<div class="card-body">
							<h3 class="card-title text-blue-900 mb-4">⚙️ 新規API設定</h3>

							<div class="form-control mb-4">
								<label class="label">
									<span class="label-text text-blue-700 font-semibold">1️⃣ 設定名</span>
								</label>
								<input
									type="text"
									bind:value={configName}
									placeholder="例: メイン設定"
									class="input input-bordered border-blue-300 focus:border-blue-500"
								/>
							</div>

							<div class="form-control mb-4">
								<label class="label">
									<span class="label-text text-blue-700 font-semibold">2️⃣ Gemini APIキー</span>
								</label>
								<input
									type="password"
									bind:value={apiKey}
									placeholder="AIza..."
									class="input input-bordered border-blue-300 focus:border-blue-500"
									disabled={loading}
								/>
								<label class="label">
									<span class="label-text-alt text-blue-600">
										<a href="https://makersuite.google.com/app/apikey" target="_blank" class="link link-primary">
											Google AI Studioでキーを取得
										</a>
									</span>
								</label>
							</div>

							<button
								type="button"
								on:click={fetchModels}
								class="btn btn-outline btn-primary w-full mb-4"
								disabled={loading || !apiKey}
							>
								{#if loading}
									<span class="loading loading-spinner"></span>
									<span>モデル取得中...</span>
								{:else}
									<span>3️⃣ 接続してモデルを取得</span>
								{/if}
							</button>

							{#if availableModels.length > 0}
								<div class="form-control mb-4">
									<label class="label">
										<span class="label-text text-blue-700 font-semibold">4️⃣ モデル選択</span>
									</label>
									<select
										bind:value={selectedModel}
										class="select select-bordered border-blue-300 focus:border-blue-500"
									>
										<option value="">-- モデルを選択 --</option>
										{#each availableModels as model}
											<option value={model.name}>{model.displayName || model.name}</option>
										{/each}
									</select>
								</div>

								<button
									type="button"
									on:click={saveConfig}
									class="btn bg-blue-500 text-white border-0 w-full"
									disabled={!selectedModel || !configName.trim()}
								>
									💾 設定を保存
								</button>
							{/if}
						</div>
					</div>

					<!-- 保存済み設定一覧 -->
					<div class="card bg-white border border-gray-200 shadow-md mb-6">
						<div class="card-body">
							<h3 class="card-title text-gray-900 mb-4">📚 保存済み設定</h3>

							{#if savedConfigs.length === 0}
								<p class="text-gray-600 text-sm">まだ設定がありません</p>
							{:else}
								<div class="space-y-3">
									{#each savedConfigs as config}
										<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
											<div class="flex justify-between items-start mb-2">
												<div>
													<h4 class="font-bold text-blue-900">{config.name}</h4>
												</div>
												<button
													on:click={() => deleteConfig(config.id)}
													class="btn btn-xs btn-outline border-red-300 text-red-600"
												>
													削除
												</button>
											</div>
											<p class="text-sm text-blue-900 mb-1 mt-2">
												<strong>モデル:</strong> {config.model.replace('models/', '')}
											</p>
											<p class="text-xs text-blue-700">
												{new Date(config.created_at).toLocaleDateString('ja-JP')}
											</p>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					</div>

					<!-- モデルテスト（チャット） -->
					<div class="card bg-white border border-green-200 shadow-md">
						<div class="card-body">
							<h3 class="card-title text-green-900 mb-4">💬 モデルテスト</h3>

							{#if savedConfigs.length === 0}
								<p class="text-gray-600 text-sm">テストするには、まず設定を保存してください</p>
							{:else}
								<!-- 設定選択 -->
								<div class="form-control mb-4">
									<label class="label">
										<span class="label-text text-green-700 font-semibold">テストする設定</span>
									</label>
									<select
										bind:value={selectedTestConfig}
										on:change={() => chatMessages = []}
										class="select select-bordered border-green-300 focus:border-green-500"
									>
										<option value="">-- 設定を選択 --</option>
										{#each savedConfigs as config}
											<option value={config.id}>{config.name} ({config.model.replace('models/', '')})</option>
										{/each}
									</select>
								</div>

								{#if selectedTestConfig}
									<!-- チャット履歴 -->
									<div class="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto border border-gray-200">
										{#if chatMessages.length === 0}
											<p class="text-gray-500 text-center text-sm">メッセージを送信してテストを開始</p>
										{:else}
											<div class="space-y-3">
												{#each chatMessages as message}
													{#if message.role === 'user'}
														<div class="flex justify-end">
															<div class="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-[80%]">
																{message.content}
															</div>
														</div>
													{:else}
														<div class="flex justify-start">
															<div class="bg-white border border-gray-300 rounded-lg px-4 py-2 max-w-[80%]">
																{message.content}
															</div>
														</div>
													{/if}
												{/each}
											</div>
										{/if}
									</div>

									<!-- メッセージ入力 -->
									<div class="flex gap-2 mb-2">
										<input
											type="text"
											bind:value={userMessage}
											on:keypress={(e) => e.key === 'Enter' && sendChatMessage()}
											placeholder="メッセージを入力..."
											class="input input-bordered border-green-300 focus:border-green-500 flex-1"
											disabled={isSending}
										/>
										<button
											on:click={sendChatMessage}
											class="btn bg-green-500 text-white border-0"
											disabled={isSending || !userMessage.trim()}
										>
											{#if isSending}
												<span class="loading loading-spinner"></span>
											{:else}
												送信
											{/if}
										</button>
									</div>

									<!-- クリアボタン -->
									{#if chatMessages.length > 0}
										<button
											on:click={clearChat}
											class="btn btn-sm btn-outline border-gray-300 text-gray-700 w-full"
										>
											履歴をクリア
										</button>
									{/if}
								{/if}
							{/if}
						</div>
					</div>

				</div>
			{/if}
		</div>
	</main>
</div>


<!-- 新規書籍作成モーダル -->
{#if showNewBookModal}
	<div class="modal modal-open">
		<div class="modal-box bg-white border border-blue-100 shadow-xl">
			<h3 class="font-bold text-lg mb-4 text-blue-900">新規書籍作成</h3>
			<form on:submit|preventDefault={createNewBook}>
				<div class="form-control mb-4">
					<label class="label" for="book-title">
						<span class="label-text text-blue-700">書籍タイトル</span>
					</label>
					<input
						id="book-title"
						type="text"
						bind:value={newBookTitle}
						required
						class="input input-bordered border-blue-200 focus:border-blue-400"
						placeholder="例: 私の最初の電子書籍"
						disabled={creating}
					/>
				</div>
				<div class="modal-action">
					<button
						type="button"
						on:click={() => showNewBookModal = false}
						class="btn border-blue-200 text-blue-700 hover:bg-blue-50"
						disabled={creating}
					>
						キャンセル
					</button>
					<button type="submit" class="btn btn-primary-gradient" disabled={creating}>
						{#if creating}
							<span class="loading loading-spinner"></span>
						{/if}
						作成
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" on:click={() => showNewBookModal = false} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && (showNewBookModal = false)}></div>
	</div>
{/if}

<!-- 新規スライド作成モーダル -->
{#if showNewSlideModal}
	<div class="modal modal-open">
		<div class="modal-box bg-white border border-blue-100 shadow-xl">
			<h3 class="font-bold text-lg mb-4 text-blue-900">新規スライド作成</h3>
			<form on:submit|preventDefault={createNewSlide}>
				<div class="form-control mb-4">
					<label class="label" for="slide-title">
						<span class="label-text text-blue-700">スライドタイトル</span>
					</label>
					<input
						id="slide-title"
						type="text"
						bind:value={newSlideTitle}
						required
						class="input input-bordered border-blue-200 focus:border-blue-400"
						placeholder="例: プロジェクト提案書"
						disabled={creating}
					/>
				</div>
				<div class="form-control mb-4">
					<label class="label" for="slide-description">
						<span class="label-text text-blue-700">説明（任意）</span>
					</label>
					<textarea
						id="slide-description"
						bind:value={newSlideDescription}
						class="textarea textarea-bordered border-blue-200 focus:border-blue-400"
						placeholder="スライドの簡単な説明"
						disabled={creating}
						rows="3"
					></textarea>
				</div>
				<div class="modal-action">
					<button
						type="button"
						on:click={() => showNewSlideModal = false}
						class="btn border-blue-200 text-blue-700 hover:bg-blue-50"
						disabled={creating}
					>
						キャンセル
					</button>
					<button type="submit" class="btn btn-primary-gradient" disabled={creating}>
						{#if creating}
							<span class="loading loading-spinner"></span>
						{/if}
						作成
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" on:click={() => showNewSlideModal = false} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && (showNewSlideModal = false)}></div>
	</div>
{/if}

