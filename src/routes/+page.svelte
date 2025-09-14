<script lang="ts">
	import type { PageData } from './$types';
	
	export let data: PageData;
</script>

<svelte:head>
	<title>さとまた式電子書籍クリエイター - 電子書籍を簡単作成</title>
</svelte:head>

<div class="hero min-h-[60vh] hero-blue">
	<div class="hero-content text-center">
		<div class="max-w-2xl">
			<h1 class="text-5xl font-bold text-blue-900 mb-6">
				<div class="icon-blue text-6xl mb-4 inline-block p-4">
					<svg class="book-icon-large" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
					</svg>
				</div><br />
				さとまた式<br />電子書籍クリエイター
			</h1>
			<p class="py-6 text-lg text-blue-800 leading-relaxed">
				プロ品質の電子書籍をわずか数分で生成。<br />
				EPUB、PDF、JPEG形式で出力可能。<br />
				執筆から出版まで、すべてをワンストップで。
			</p>
			{#if data.session}
				<a href="/dashboard" class="btn btn-primary-gradient btn-lg shadow-lg">ダッシュボードへ</a>
			{:else}
				<a href="/auth" class="btn btn-primary-gradient btn-lg shadow-lg">無料で始める</a>
			{/if}
		</div>
	</div>
</div>

<section class="py-20 px-4">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-12 text-blue-900">3ステップで簡単作成</h2>
		<div class="grid md:grid-cols-3 gap-8">
			<div class="card-flat p-6">
				<div class="card-body items-center text-center">
					<div class="icon-blue text-3xl mb-4">✍️</div>
					<h3 class="text-xl font-bold text-blue-900 mb-3">1. 執筆</h3>
					<p class="text-blue-700">直感的なエディターで快適に執筆。章ごとの管理も簡単です。</p>
				</div>
			</div>
			<div class="card-flat p-6">
				<div class="card-body items-center text-center">
					<div class="icon-blue text-3xl mb-4">🎨</div>
					<h3 class="text-xl font-bold text-blue-900 mb-3">2. デザイン</h3>
					<p class="text-blue-700">美しいテンプレートから選んで、プロ品質の仕上がりに。</p>
				</div>
			</div>
			<div class="card-flat p-6">
				<div class="card-body items-center text-center">
					<div class="icon-blue text-3xl mb-4">📖</div>
					<h3 class="text-xl font-bold text-blue-900 mb-3">3. 出版</h3>
					<p class="text-blue-700">ワンクリックでEPUB、PDF、JPEG形式に変換。KDPへの登録も簡単。</p>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="py-20 px-4 bg-base-200">
	<div class="max-w-6xl mx-auto">
		<h2 class="text-3xl font-bold text-center mb-12">主な機能</h2>
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
			<div class="card bg-base-100">
				<div class="card-body">
					<h3 class="card-title">📝 リッチテキストエディター</h3>
					<p>見出し、段落、リスト、画像挿入など、必要な機能をすべて搭載。</p>
				</div>
			</div>
			<div class="card bg-base-100">
				<div class="card-body">
					<h3 class="card-title">💾 自動保存</h3>
					<p>リアルタイムで自動保存。作業内容を失う心配はありません。</p>
				</div>
			</div>
			<div class="card bg-base-100">
				<div class="card-body">
					<h3 class="card-title">📱 マルチデバイス対応</h3>
					<p>PC、タブレット、スマートフォンから編集可能。</p>
				</div>
			</div>
			<div class="card bg-base-100">
				<div class="card-body">
					<h3 class="card-title">👁️ リアルタイムプレビュー</h3>
					<p>テンプレート別に実際の表示を確認しながら編集。</p>
				</div>
			</div>
			<div class="card bg-base-100">
				<div class="card-body">
					<h3 class="card-title">📁 複数形式対応</h3>
					<p>EPUB、PDF、JPEG形式で出力可能。様々な用途に対応。</p>
				</div>
			</div>
			<div class="card bg-base-100">
				<div class="card-body">
					<h3 class="card-title">🌐 多言語対応</h3>
					<p>日本語、英語、中国語、韓国語に対応。</p>
				</div>
			</div>
		</div>
	</div>
</section>