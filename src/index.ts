/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { createHash } from 'node:crypto';
import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import createDOMPurify from 'dompurify';

export default {
	async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
		const reqUrl = new URL(request.url);
		const url = reqUrl.searchParams.get('url') || '';
		const token = reqUrl.searchParams.get('token');

		const hash = createHash('sha1');
		if (!env.TOKEN_SECRET) {
			return new Response('No token secret found', { status: 500 });
		}
		hash.update(`${env.TOKEN_SECRET}:${url}`);
		const digest = hash.digest('hex');
		if (token !== digest) {
			console.log(`Invalid token, expected ${digest} got ${token}`);
			return new Response(
				`
				<h1>Invalid token</h1>
				for <a href="${url}">${url}</a>
			`,
				{
					status: 403,
					headers: { 'Content-Type': 'text/html' },
				}
			);
		}

		const fetched = await fetch(url, { headers: { 'User-Agent': `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"` } });
		if (!fetched.ok) {
			return new Response(
				`
				<h1>Failed to fetch</h1>
				<p><a href="${url}">${url}<'a></p>
				<p>${await fetched.text()}</p>
			`,
				{
					status: fetched.status,
					headers: { 'Content-Type': 'text/html' },
				}
			);
		}
		const body = await fetched.text();
		const DOMPurify = createDOMPurify(parseHTML(''));
		const clean = DOMPurify.sanitize(body);
		const doc = parseHTML(clean);

		// clean out a few extra elements
		doc.document.querySelectorAll('nav, header, footer').forEach((node) => node.remove());
		const DROP_TEXT = new Set(['Skip to content', 'The Latest']);
		doc.document.querySelectorAll('a,h1,h2,h3').forEach((node) => {
			if (DROP_TEXT.has(node.textContent?.trim() ?? '')) {
				node.remove();
			}
		});

		const reader = new Readability(doc.document);
		const article = reader.parse();

		const content = `<!DOCTYPE html>
<html>
<head>
  <title>${article?.title || url}</title>
</head>
<body>
<h1>${article?.title || url}</h1>
${article?.byline ? `<p>By: ${article.byline}</p>` : ''}
<p>Original: <a href="${url}">${url}</a></p>
${article?.content}
</body>
</html>
		`;

		return new Response(content, {
			headers: {
				'Content-Type': fetched.headers.get('content-type') || 'text/html',
			},
		});
	},
};
