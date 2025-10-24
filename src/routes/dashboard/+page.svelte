<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let data: PageData;

	const quickActions = [
		{
			title: '新規書籍作成',
			description: '新しい電子書籍を作成',
			icon: 'M12 4v16m8-8H4',
			action: () => goto('/dashboard/books?new=true'),
			gradient: 'from-blue-400 to-blue-600'
		},
		{
			title: '書籍一覧',
			description: '作成した書籍を管理',
			icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
			action: () => goto('/dashboard/books'),
			gradient: 'from-indigo-400 to-indigo-600'
		},
		{
			title: 'テンプレート',
			description: 'テンプレートを見る',
			icon: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z',
			action: () => alert('テンプレート機能は近日公開予定です'),
			gradient: 'from-purple-400 to-purple-600',
			disabled: true
		}
	];
</script>

<svelte:head>
	<title>ダッシュボード - さとまた式電子書籍クリエイター</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- ウェルカムセクション -->
	<div class="hero-blue rounded-2xl p-8 mb-8 shadow-lg">
		<div class="hero-content text-center">
			<div>
				<h1 class="text-4xl font-bold text-blue-900 mb-4">
					ようこそ、さとまた式電子書籍クリエイターへ
				</h1>
				<p class="text-lg text-blue-700 mb-6">
					{data.session?.user.email} でログイン中
				</p>
				<div class="flex justify-center gap-4">
					<button
						on:click={() => goto('/dashboard/books?new=true')}
						class="btn btn-primary-gradient btn-lg shadow-lg"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						新規書籍を作成
					</button>
					<a href="/dashboard/books" class="btn btn-outline border-blue-400 text-blue-700 hover:bg-blue-50 btn-lg">
						書籍一覧を見る
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- クイックアクション -->
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-blue-900 mb-4">クイックアクション</h2>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			{#each quickActions as action}
				<button
					on:click={action.action}
					disabled={action.disabled}
					class="card-flat hover:shadow-xl transition-all duration-300 {action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}"
				>
					<div class="card-body items-center text-center">
						<div class="w-16 h-16 rounded-full bg-gradient-to-br {action.gradient} flex items-center justify-center mb-4">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={action.icon} />
							</svg>
						</div>
						<h3 class="card-title text-blue-900 text-lg">{action.title}</h3>
						<p class="text-blue-700">{action.description}</p>
						{#if action.disabled}
							<div class="badge badge-sm bg-gray-200 text-gray-600 mt-2">近日公開</div>
						{/if}
					</div>
				</button>
			{/each}
		</div>
	</div>

	<!-- 統計情報 -->
	<div class="mb-8">
		<h2 class="text-2xl font-bold text-blue-900 mb-4">統計情報</h2>
		<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
			<div class="card-flat">
				<div class="card-body">
					<div class="stat">
						<div class="stat-figure text-blue-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
							</svg>
						</div>
						<div class="stat-title text-blue-700">総書籍数</div>
						<div class="stat-value text-blue-900">{data.stats?.totalBooks || 0}</div>
					</div>
				</div>
			</div>

			<div class="card-flat">
				<div class="card-body">
					<div class="stat">
						<div class="stat-figure text-green-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div class="stat-title text-blue-700">完成書籍</div>
						<div class="stat-value text-green-600">{data.stats?.publishedBooks || 0}</div>
					</div>
				</div>
			</div>

			<div class="card-flat">
				<div class="card-body">
					<div class="stat">
						<div class="stat-figure text-yellow-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
							</svg>
						</div>
						<div class="stat-title text-blue-700">下書き</div>
						<div class="stat-value text-yellow-600">{data.stats?.draftBooks || 0}</div>
					</div>
				</div>
			</div>

			<div class="card-flat">
				<div class="card-body">
					<div class="stat">
						<div class="stat-figure text-purple-500">
							<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
							</svg>
						</div>
						<div class="stat-title text-blue-700">カテゴリ</div>
						<div class="stat-value text-purple-600">{data.stats?.categories || 0}</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- 最近の活動 -->
	<div>
		<h2 class="text-2xl font-bold text-blue-900 mb-4">最近更新された書籍</h2>
		{#if data.recentBooks && data.recentBooks.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.recentBooks as book}
					<a href="/editor/{book.id}" class="card-flat hover:shadow-xl transition-all duration-300 hover:scale-105">
						<div class="card-body">
							<h3 class="card-title text-blue-900">{book.title}</h3>
							<p class="text-sm text-blue-700">{book.author || '著者未設定'}</p>
							<div class="flex gap-2">
								<div class="badge border-blue-300 text-blue-700">
									{book.status === 'draft' ? '下書き' : book.status === 'published' ? '公開済み' : 'アーカイブ'}
								</div>
							</div>
							<p class="text-xs text-blue-600 mt-2">
								更新: {new Date(book.updated_at).toLocaleDateString('ja-JP')}
							</p>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="card-flat">
				<div class="card-body text-center py-12">
					<p class="text-blue-700">まだ書籍がありません</p>
					<button
						on:click={() => goto('/dashboard/books?new=true')}
						class="btn btn-primary-gradient mt-4"
					>
						最初の書籍を作成
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
