<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let selectedSlideIndex = 0;
	let showAddSlideModal = false;
	let newSlideTitle = '';
	let newSlideLayout: 'title-only' | 'title-content' | 'two-column' | 'image-text' | 'full-image' = 'title-content';
	let saving = false;

	$: currentSlide = data.slides[selectedSlideIndex];
	$: canMoveUp = selectedSlideIndex > 0;
	$: canMoveDown = selectedSlideIndex < data.slides.length - 1;

	// プレゼンテーション情報更新
	const updatePresentation = async (field: string, value: any) => {
		try {
			const { error } = await data.supabase
				.from('presentations')
				.update({ [field]: value })
				.eq('id', data.presentation.id);

			if (error) throw error;
			data.presentation = { ...data.presentation, [field]: value };
		} catch (error) {
			console.error('Error updating presentation:', error);
			alert('更新に失敗しました');
		}
	};

	// スライド追加
	const addSlide = async () => {
		if (!newSlideTitle.trim()) return;

		try {
			const newOrderNumber = data.slides.length;

			const { data: newSlide, error } = await data.supabase
				.from('slides')
				.insert({
					presentation_id: data.presentation.id,
					title: newSlideTitle,
					content: '',
					layout_type: newSlideLayout,
					order_number: newOrderNumber,
					background_color: '#FFFFFF'
				})
				.select()
				.single();

			if (error) throw error;

			data.slides = [...data.slides, newSlide];
			selectedSlideIndex = data.slides.length - 1;
			showAddSlideModal = false;
			newSlideTitle = '';
		} catch (error) {
			console.error('Error adding slide:', error);
			alert('スライドの追加に失敗しました');
		}
	};

	// スライド削除
	const deleteSlide = async (slideId: string, index: number) => {
		if (!confirm('このスライドを削除してもよろしいですか？')) return;

		try {
			const { error } = await data.supabase
				.from('slides')
				.delete()
				.eq('id', slideId);

			if (error) throw error;

			data.slides = data.slides.filter((_, i) => i !== index);

			// order_numberを再整列
			for (let i = 0; i < data.slides.length; i++) {
				await data.supabase
					.from('slides')
					.update({ order_number: i })
					.eq('id', data.slides[i].id);
				data.slides[i].order_number = i;
			}

			if (selectedSlideIndex >= data.slides.length) {
				selectedSlideIndex = Math.max(0, data.slides.length - 1);
			}
		} catch (error) {
			console.error('Error deleting slide:', error);
			alert('スライドの削除に失敗しました');
		}
	};

	// スライド内容更新
	const updateSlide = async (field: string, value: any) => {
		if (!currentSlide) return;

		saving = true;
		try {
			const { error } = await data.supabase
				.from('slides')
				.update({ [field]: value })
				.eq('id', currentSlide.id);

			if (error) throw error;

			currentSlide[field] = value;
			data.slides[selectedSlideIndex] = { ...currentSlide };
		} catch (error) {
			console.error('Error updating slide:', error);
		} finally {
			saving = false;
		}
	};

	// スライド順序移動
	const moveSlide = async (direction: 'up' | 'down') => {
		const newIndex = direction === 'up' ? selectedSlideIndex - 1 : selectedSlideIndex + 1;
		if (newIndex < 0 || newIndex >= data.slides.length) return;

		try {
			// スライドを入れ替え
			const temp = data.slides[selectedSlideIndex];
			data.slides[selectedSlideIndex] = data.slides[newIndex];
			data.slides[newIndex] = temp;

			// order_numberを更新
			await data.supabase
				.from('slides')
				.update({ order_number: newIndex })
				.eq('id', data.slides[newIndex].id);

			await data.supabase
				.from('slides')
				.update({ order_number: selectedSlideIndex })
				.eq('id', data.slides[selectedSlideIndex].id);

			data.slides[selectedSlideIndex].order_number = selectedSlideIndex;
			data.slides[newIndex].order_number = newIndex;

			selectedSlideIndex = newIndex;
		} catch (error) {
			console.error('Error moving slide:', error);
			alert('スライドの移動に失敗しました');
		}
	};

	// 自動保存（デバウンス）
	let saveTimeout: NodeJS.Timeout;
	const autoSave = (field: string, value: any) => {
		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			updateSlide(field, value);
		}, 1000);
	};
</script>

<svelte:head>
	<title>{data.presentation.title} - スライドエディタ</title>
</svelte:head>

<div class="min-h-screen bg-light-bg">
	<!-- ヘッダー -->
	<header class="navbar-blue sticky top-0 z-10 px-4 py-3">
		<div class="flex justify-between items-center max-w-7xl mx-auto">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="btn btn-ghost btn-sm">
					← ダッシュボード
				</a>
				<input
					type="text"
					value={data.presentation.title}
					on:change={(e) => updatePresentation('title', e.currentTarget.value)}
					class="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 text-blue-900"
				/>
			</div>

			<div class="flex items-center gap-2">
				{#if saving}
					<div class="flex items-center gap-1 px-3 py-1 bg-blue-100 rounded-full">
						<svg class="w-4 h-4 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						<span class="text-sm text-blue-700 font-medium whitespace-nowrap" style="writing-mode: horizontal-tb;">保存中</span>
					</div>
				{:else}
					<div class="flex items-center gap-1 px-3 py-1 bg-green-100 rounded-full">
						<svg class="w-4 h-4 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
						</svg>
						<span class="text-sm text-green-700 font-medium whitespace-nowrap" style="writing-mode: horizontal-tb;">保存済み</span>
					</div>
				{/if}

				<select
					bind:value={data.presentation.theme}
					on:change={(e) => updatePresentation('theme', e.currentTarget.value)}
					class="select select-sm border-blue-200"
				>
					<option value="modern">Modern</option>
					<option value="classic">Classic</option>
					<option value="minimal">Minimal</option>
					<option value="business">Business</option>
				</select>

				<a href="/slide-preview/{data.presentation.id}" target="_blank" class="btn btn-sm bg-blue-500 text-white">
					プレビュー
				</a>
			</div>
		</div>
	</header>

	<div class="flex h-[calc(100vh-64px)]">
		<!-- サイドバー（スライド一覧） -->
		<aside class="w-64 bg-white border-r border-blue-200 overflow-y-auto">
			<div class="p-4">
				<button
					on:click={() => showAddSlideModal = true}
					class="btn btn-primary-gradient w-full mb-4"
				>
					+ スライド追加
				</button>

				<div class="space-y-2">
					{#each data.slides as slide, index}
						<div class="relative">
							<button
								on:click={() => selectedSlideIndex = index}
								class="w-full text-left p-3 rounded-lg border transition-colors {selectedSlideIndex === index ? 'bg-blue-100 border-blue-400' : 'border-blue-200 hover:bg-blue-50'}"
							>
								<div class="flex justify-between items-start pr-6">
									<div class="flex-1">
										<div class="text-xs text-blue-600 mb-1">スライド {index + 1}</div>
										<div class="text-sm font-semibold text-blue-900 truncate">
											{slide.title || '無題のスライド'}
										</div>
										<div class="text-xs text-blue-500 mt-1">{slide.layout_type}</div>
									</div>
								</div>
							</button>
							<button
								on:click={() => deleteSlide(slide.id, index)}
								class="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xl leading-none"
								aria-label="削除"
							>
								×
							</button>
						</div>
					{/each}

					{#if data.slides.length === 0}
						<div class="text-center py-8 text-blue-600 text-sm">
							スライドがありません<br>
							<span class="text-xs">上のボタンから追加してください</span>
						</div>
					{/if}
				</div>
			</div>
		</aside>

		<!-- メインエディタエリア（2カラム） -->
		<main class="flex-1 overflow-hidden flex">
			{#if currentSlide}
				<!-- 左カラム：編集エリア -->
				<div class="w-1/2 overflow-y-auto p-6 border-r border-blue-200 bg-gray-50">
					<div class="flex justify-between items-center mb-6">
						<h2 class="text-3xl font-bold text-blue-900">
							スライド {selectedSlideIndex + 1} の編集
						</h2>

						<div class="flex gap-2">
							<button
								on:click={() => moveSlide('up')}
								disabled={!canMoveUp}
								class="btn btn-sm bg-white border-2 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
								aria-label="上に移動"
							>
								↑
							</button>
							<button
								on:click={() => moveSlide('down')}
								disabled={!canMoveDown}
								class="btn btn-sm bg-white border-2 border-blue-300 hover:bg-blue-50 disabled:opacity-50"
								aria-label="下に移動"
							>
								↓
							</button>
						</div>
					</div>

					<!-- 基本情報セクション -->
					<div class="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-5">
						<h3 class="text-lg font-bold text-blue-800 mb-5 pb-2 border-b border-blue-200">📝 基本情報</h3>

						<!-- スライドタイトル -->
						<div class="mb-5">
							<label class="block text-blue-900 font-bold text-base mb-2" for="slide-title">
								タイトル
							</label>
							<input
								id="slide-title"
								type="text"
								bind:value={currentSlide.title}
								on:input={(e) => autoSave('title', e.currentTarget.value)}
								class="w-full input input-bordered border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-4 py-3 bg-white"
								placeholder="スライドのタイトルを入力"
							/>
						</div>

						<!-- レイアウト選択 -->
						<div>
							<label class="block text-blue-900 font-bold text-base mb-2" for="layout-type">
								レイアウト
							</label>
							<select
								id="layout-type"
								bind:value={currentSlide.layout_type}
								on:change={(e) => updateSlide('layout_type', e.currentTarget.value)}
								class="w-full select select-bordered border-2 border-blue-300 focus:border-blue-500 text-base px-4 py-3 bg-white"
							>
								<option value="title-only">タイトルのみ</option>
								<option value="title-content">タイトル + コンテンツ</option>
								<option value="two-column">2カラム</option>
								<option value="image-text">画像 + テキスト</option>
								<option value="full-image">フル画像</option>
							</select>
						</div>
					</div>

					<!-- コンテンツセクション -->
					<div class="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-5">
						<h3 class="text-lg font-bold text-blue-800 mb-5 pb-2 border-b border-blue-200">✏️ コンテンツ</h3>

						<div>
							<label class="block text-blue-900 font-bold text-base mb-2" for="slide-content">
								本文 <span class="text-sm text-gray-500 font-normal">（HTML・Markdown対応）</span>
							</label>
							<textarea
								id="slide-content"
								bind:value={currentSlide.content}
								on:input={(e) => autoSave('content', e.currentTarget.value)}
								class="w-full textarea textarea-bordered border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-4 py-3 leading-relaxed bg-white font-mono"
								rows="18"
								placeholder="スライドの内容を入力してください&#10;&#10;例：&#10;<h2>見出し</h2>&#10;<p>本文テキスト</p>&#10;<ul>&#10;  <li>リスト項目1</li>&#10;  <li>リスト項目2</li>&#10;</ul>"
							></textarea>
						</div>
					</div>

					<!-- デザイン設定セクション -->
					<div class="bg-white rounded-lg shadow-sm border border-blue-200 p-6 mb-5">
						<h3 class="text-lg font-bold text-blue-800 mb-5 pb-2 border-b border-blue-200">🎨 デザイン設定</h3>

						<div>
							<label class="block text-blue-900 font-bold text-base mb-2" for="bg-color">
								背景色
							</label>
							<div class="flex items-center gap-3">
								<input
									id="bg-color"
									type="color"
									bind:value={currentSlide.background_color}
									on:change={(e) => updateSlide('background_color', e.currentTarget.value)}
									class="w-20 h-12 rounded-lg border-2 border-blue-300 cursor-pointer flex-shrink-0"
								/>
								<input
									type="text"
									bind:value={currentSlide.background_color}
									on:change={(e) => updateSlide('background_color', e.currentTarget.value)}
									class="flex-1 input input-bordered border-2 border-blue-300 focus:border-blue-500 text-base px-4 py-3"
									placeholder="#FFFFFF"
								/>
							</div>
						</div>
					</div>

					<!-- スピーカーノートセクション -->
					<div class="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
						<h3 class="text-lg font-bold text-blue-800 mb-5 pb-2 border-b border-blue-200">📋 スピーカーノート</h3>

						<div>
							<label class="block text-blue-900 font-bold text-base mb-2" for="speaker-notes">
								発表者用メモ <span class="text-sm text-gray-500 font-normal">（観客には表示されません）</span>
							</label>
							<textarea
								id="speaker-notes"
								bind:value={currentSlide.speaker_notes}
								on:input={(e) => autoSave('speaker_notes', e.currentTarget.value)}
								class="w-full textarea textarea-bordered border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-base px-4 py-3 leading-relaxed bg-white"
								rows="5"
								placeholder="発表時に参照するメモを入力してください"
							></textarea>
						</div>
					</div>
				</div>

				<!-- 右カラム：プレビュー -->
				<div class="w-1/2 overflow-y-auto p-6 bg-gray-50">
					<h3 class="text-lg font-semibold text-blue-900 mb-4">プレビュー</h3>
					<div class="sticky top-0">
						<div
							class="border-2 border-blue-200 rounded-lg p-8 aspect-video bg-white shadow-lg"
							style="background-color: {currentSlide.background_color}"
						>
							<div class="h-full flex flex-col justify-center items-center">
								<h1 class="text-4xl font-bold mb-4 text-center">{currentSlide.title || '無題のスライド'}</h1>
								{#if currentSlide.content}
									<div class="prose max-w-none text-center">
										{@html currentSlide.content}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{:else}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<svg class="w-24 h-24 mx-auto mb-4 fill-blue-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
						</svg>
						<h2 class="text-2xl font-bold text-blue-900 mb-2">スライドを選択してください</h2>
						<p class="text-blue-700">左のサイドバーからスライドを追加または選択してください</p>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

<!-- スライド追加モーダル -->
{#if showAddSlideModal}
	<div class="modal modal-open">
		<div class="modal-box bg-white border border-blue-100 shadow-xl">
			<h3 class="font-bold text-lg mb-4 text-blue-900">新規スライド追加</h3>
			<form on:submit|preventDefault={addSlide}>
				<div class="form-control mb-4">
					<label class="label" for="new-slide-title">
						<span class="label-text text-blue-700">タイトル</span>
					</label>
					<input
						id="new-slide-title"
						type="text"
						bind:value={newSlideTitle}
						required
						class="input input-bordered border-blue-200 focus:border-blue-400"
						placeholder="例: イントロダクション"
					/>
				</div>

				<div class="form-control mb-4">
					<label class="label" for="new-slide-layout">
						<span class="label-text text-blue-700">レイアウト</span>
					</label>
					<select
						id="new-slide-layout"
						bind:value={newSlideLayout}
						class="select select-bordered border-blue-200"
					>
						<option value="title-only">タイトルのみ</option>
						<option value="title-content">タイトル + コンテンツ</option>
						<option value="two-column">2カラム</option>
						<option value="image-text">画像 + テキスト</option>
						<option value="full-image">フル画像</option>
					</select>
				</div>

				<div class="modal-action">
					<button
						type="button"
						on:click={() => showAddSlideModal = false}
						class="btn border-blue-200 text-blue-700 hover:bg-blue-50"
					>
						キャンセル
					</button>
					<button type="submit" class="btn btn-primary-gradient">
						追加
					</button>
				</div>
			</form>
		</div>
		<div class="modal-backdrop" on:click={() => showAddSlideModal = false} role="button" tabindex="0" on:keydown={(e) => e.key === 'Escape' && (showAddSlideModal = false)}></div>
	</div>
{/if}
