<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	let debugInfo = {
		books: [],
		chapters: [],
		profiles: [],
		categories: [],
		errors: []
	};

	onMount(async () => {
		try {
			// 全ての書籍を取得
			const { data: books, error: booksError } = await data.supabase
				.from('books')
				.select('*')
				.eq('user_id', data.session?.user.id);

			if (booksError) {
				debugInfo.errors.push(`Books error: ${booksError.message}`);
			} else {
				debugInfo.books = books || [];
			}

			// 全ての章を取得
			const { data: chapters, error: chaptersError } = await data.supabase
				.from('chapters')
				.select(`
					*,
					book:books(title, user_id)
				`);

			if (chaptersError) {
				debugInfo.errors.push(`Chapters error: ${chaptersError.message}`);
			} else {
				debugInfo.chapters = chapters || [];
			}

			// プロフィール情報を取得
			const { data: profiles, error: profilesError } = await data.supabase
				.from('profiles')
				.select('*')
				.eq('id', data.session?.user.id);

			if (profilesError) {
				debugInfo.errors.push(`Profiles error: ${profilesError.message}`);
			} else {
				debugInfo.profiles = profiles || [];
			}

			// カテゴリを取得
			const { data: categories, error: categoriesError } = await data.supabase
				.from('categories')
				.select('*')
				.eq('user_id', data.session?.user.id);

			if (categoriesError) {
				debugInfo.errors.push(`Categories error: ${categoriesError.message}`);
			} else {
				debugInfo.categories = categories || [];
			}

		} catch (err) {
			debugInfo.errors.push(`General error: ${err}`);
		}
	});
</script>

<svelte:head>
	<title>デバッグ情報</title>
</svelte:head>

<div class="container mx-auto p-8">
	<h1 class="text-3xl font-bold mb-8">データベースデバッグ情報</h1>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- 書籍情報 -->
		<div class="card bg-white shadow-xl">
			<div class="card-body">
				<h2 class="card-title">書籍データ ({debugInfo.books.length}件)</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ID</th>
								<th>タイトル</th>
								<th>作成日</th>
								<th>更新日</th>
							</tr>
						</thead>
						<tbody>
							{#each debugInfo.books as book}
								<tr>
									<td>{book.id}</td>
									<td>{book.title}</td>
									<td>{new Date(book.created_at).toLocaleString('ja-JP')}</td>
									<td>{new Date(book.updated_at).toLocaleString('ja-JP')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- 章情報 -->
		<div class="card bg-white shadow-xl">
			<div class="card-body">
				<h2 class="card-title">章データ ({debugInfo.chapters.length}件)</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ID</th>
								<th>タイトル</th>
								<th>書籍</th>
								<th>作成日</th>
							</tr>
						</thead>
						<tbody>
							{#each debugInfo.chapters as chapter}
								<tr>
									<td>{chapter.id}</td>
									<td>{chapter.title}</td>
									<td>{chapter.book?.title || 'N/A'}</td>
									<td>{new Date(chapter.created_at).toLocaleString('ja-JP')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>

		<!-- ユーザー情報 -->
		<div class="card bg-white shadow-xl">
			<div class="card-body">
				<h2 class="card-title">ユーザー情報</h2>
				{#if data.session}
					<p><strong>User ID:</strong> {data.session.user.id}</p>
					<p><strong>Email:</strong> {data.session.user.email}</p>
					<p><strong>プロフィール件数:</strong> {debugInfo.profiles.length}</p>
				{:else}
					<p>未ログイン</p>
				{/if}
			</div>
		</div>

		<!-- カテゴリ情報 -->
		<div class="card bg-white shadow-xl">
			<div class="card-body">
				<h2 class="card-title">カテゴリ情報 ({debugInfo.categories.length}件)</h2>
				<div class="overflow-x-auto">
					<table class="table table-zebra">
						<thead>
							<tr>
								<th>ID</th>
								<th>名前</th>
								<th>作成日</th>
							</tr>
						</thead>
						<tbody>
							{#each debugInfo.categories as category}
								<tr>
									<td>{category.id}</td>
									<td>{category.name}</td>
									<td>{new Date(category.created_at).toLocaleString('ja-JP')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>

	<!-- エラー情報 -->
	{#if debugInfo.errors.length > 0}
		<div class="alert alert-error mt-6">
			<h3 class="font-bold">エラー情報:</h3>
			<ul>
				{#each debugInfo.errors as error}
					<li>{error}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- 復元ツール -->
	<div class="card bg-white shadow-xl mt-6">
		<div class="card-body">
			<h2 class="card-title">データ復元ツール</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<button class="btn btn-warning" on:click={() => {
					// 削除された書籍の復元を試行
					window.location.href = '/debug/restore';
				}}>
					削除データ復元
				</button>
				<button class="btn btn-info" on:click={() => {
					// バックアップからの復元
					alert('バックアップ機能は実装予定です');
				}}>
					バックアップ復元
				</button>
				<button class="btn btn-success" on:click={() => {
					// サンプルデータの作成
					window.location.href = '/debug/sample';
				}}>
					サンプルデータ作成
				</button>
			</div>
		</div>
	</div>

	<div class="mt-6">
		<a href="/dashboard" class="btn btn-primary">← ダッシュボードに戻る</a>
	</div>
</div>