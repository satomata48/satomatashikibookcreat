<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	
	export let data: PageData;
	
	let searchQuery = '';
	let viewMode: 'grid' | 'list' = 'grid';
	let showNewBookModal = false;
	let newBookTitle = '';
	let creating = false;
	
	$: filteredBooks = data.books?.filter(book => 
		book.title.toLowerCase().includes(searchQuery.toLowerCase())
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
	
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('ja-JP', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	};
</script>

<svelte:head>
	<title>ダッシュボード - さとまた式電子書籍クリエイター</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-bold text-blue-900">マイブック</h1>
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
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
				</svg>
			</button>
			<button
				on:click={() => viewMode = 'list'}
				class="btn border-blue-200 text-blue-700 hover:bg-blue-50 {viewMode === 'list' ? 'bg-blue-100 border-blue-400' : ''}"
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
						<div class="badge border-blue-300 text-blue-700">
							{book.status === 'draft' ? '下書き' : book.status === 'published' ? '公開済み' : 'アーカイブ'}
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
</div>

{#if showNewBookModal}
	<div class="modal modal-open">
		<div class="modal-box bg-white border border-blue-100 shadow-xl">
			<h3 class="font-bold text-lg mb-4 text-blue-900">新規書籍作成</h3>
			<form on:submit|preventDefault={createNewBook}>
				<div class="form-control">
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
		<div class="modal-backdrop" on:click={() => showNewBookModal = false}></div>
	</div>
{/if}