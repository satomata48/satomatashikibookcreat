<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	let creating = false;
	let message = '';

	const createSampleData = async () => {
		creating = true;
		message = 'サンプルデータを作成中...';

		try {
			// デフォルトカテゴリを作成
			const { data: category, error: categoryError } = await data.supabase
				.from('categories')
				.insert({
					user_id: data.session.user.id,
					name: 'サンプルカテゴリ',
					description: '復元用のサンプルカテゴリです',
					color: '#2196F3',
					icon: 'book'
				})
				.select()
				.single();

			if (categoryError && !categoryError.message.includes('duplicate')) {
				console.error('Category creation error:', categoryError);
			}

			// サンプル書籍を作成
			const sampleBooks = [
				{
					title: '私の最初の電子書籍',
					author: 'サンプル著者',
					user_id: data.session.user.id,
					category_id: category?.id || null,
					status: 'draft',
					language: 'ja',
					metadata: {
						pageLayout: 'a4',
						template: 'simple'
					}
				},
				{
					title: 'さとまた式エッセイ集',
					author: 'さとまた',
					user_id: data.session.user.id,
					category_id: category?.id || null,
					status: 'draft',
					language: 'ja',
					metadata: {
						pageLayout: 'a4',
						template: 'satomata-life-lessons'
					}
				},
				{
					title: '技術ノート',
					author: 'エンジニア',
					user_id: data.session.user.id,
					category_id: category?.id || null,
					status: 'published',
					language: 'ja',
					metadata: {
						pageLayout: 'none',
						template: 'modern'
					}
				}
			];

			const { data: books, error: booksError } = await data.supabase
				.from('books')
				.insert(sampleBooks)
				.select();

			if (booksError) {
				throw booksError;
			}

			// 各書籍にサンプル章を作成
			for (let i = 0; i < books.length; i++) {
				const book = books[i];
				const sampleChapters = [
					{
						book_id: book.id,
						title: '第1章：はじめに',
						content: `この章では、「${book.title}」について説明します。\n\nここから素晴らしい物語が始まります。\n\n${book.title === 'さとまた式エッセイ集' ? '<pagebreak>特別なメッセージ：人生は素晴らしい冒険です。</pagebreak>' : ''}`,
						order_index: 1,
						word_count: 50
					},
					{
						book_id: book.id,
						title: '第2章：内容',
						content: `第2章では、より詳しい内容について説明します。\n\nここにメインコンテンツが入ります。\n\n重要なポイント：\n- ポイント1\n- ポイント2\n- ポイント3`,
						order_index: 2,
						word_count: 80
					},
					{
						book_id: book.id,
						title: '第3章：まとめ',
						content: 'この章では、これまでの内容をまとめます。\n\n結論として、この書籍は非常に価値のある内容となっています。\n\nありがとうございました。',
						order_index: 3,
						word_count: 60
					}
				];

				const { error: chaptersError } = await data.supabase
					.from('chapters')
					.insert(sampleChapters);

				if (chaptersError) {
					console.error(`Chapters creation error for book ${book.title}:`, chaptersError);
				}
			}

			message = `サンプルデータの作成が完了しました！${books.length}冊の書籍と章が作成されました。`;

			setTimeout(() => {
				goto('/dashboard');
			}, 2000);

		} catch (error) {
			console.error('Sample data creation error:', error);
			message = `エラーが発生しました: ${error.message}`;
		} finally {
			creating = false;
		}
	};
</script>

<svelte:head>
	<title>サンプルデータ作成</title>
</svelte:head>

<div class="container mx-auto p-8">
	<h1 class="text-3xl font-bold mb-8">サンプルデータ作成</h1>

	<div class="card bg-white shadow-xl">
		<div class="card-body">
			<h2 class="card-title">データ復元用サンプル作成</h2>
			<p class="mb-4">
				書籍が消失した場合の復元用として、以下のサンプルデータを作成します：
			</p>
			<ul class="list-disc list-inside mb-6">
				<li>サンプルカテゴリ（1件）</li>
				<li>サンプル書籍（3冊）</li>
				<li>各書籍に3章ずつのサンプル章</li>
				<li>異なるテンプレートの設定</li>
			</ul>

			{#if message}
				<div class="alert {message.includes('エラー') ? 'alert-error' : 'alert-info'} mb-4">
					{message}
				</div>
			{/if}

			<div class="card-actions">
				<button
					class="btn btn-primary"
					on:click={createSampleData}
					disabled={creating}
				>
					{#if creating}
						<span class="loading loading-spinner"></span>
					{/if}
					サンプルデータを作成
				</button>
				<a href="/debug" class="btn btn-outline">← デバッグページに戻る</a>
			</div>
		</div>
	</div>
</div>