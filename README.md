A mini [readability](https://github.com/mozilla/readability) proxy for personal use. This is designed to not be a publicly useful tool as it requires a private signing key.

It is deployable as a [Cloudflare Worker](https://developers.cloudflare.com/workers/).

# Deployment

```sh
pnpm install
pnpm run deploy
pnpm run set-token-secret
```

# Usage

To get a readability version of a page, you'll need to generate a token by creating a sha1 of "{secret}:{url}".

Then you can use the following URL template to access your processed page: https://{your-name}.workers.dev/?token={token}&url={url}
