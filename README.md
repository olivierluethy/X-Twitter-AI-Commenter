# GhostReply AI

A Chrome extension (Manifest V3) that adds one-click, AI-generated **replies and
quote-posts** to X / Twitter. Open a reply box, pick a tone, and GhostReply drafts a
personalized comment for the post you are looking at — powered by GPT-4 through a small
PHP proxy that keeps your API key off the client.

## Features

- Injects a toolbar of tone buttons into the X reply composer (positive, joke, idea,
  disagree, question, and more).
- Reads the target post's text and generates a fitting reply or quote-post in one click.
- Inserts the generated text straight into X's `contenteditable` reply editor.
- Runs only on `https://x.com/*`; nothing loads on other sites.
- The OpenAI key lives server-side in `api.php`, so it is never exposed in the extension.

## How it works

- `content.js` — content script injected on X. Builds the tone UI, scrapes the tweet
  being replied to, calls the backend, and writes the result into the composer.
- `api.php` — server-side proxy. Receives the prompt, calls the OpenAI
  `chat/completions` endpoint with the server's `OPENAI_API_KEY`, and returns the reply.
  The extension points at `https://x.prompt-in.com/api.php` by default.
- `manifest.json` — MV3 manifest wiring the content script and CSS into X.
- `styles.css` — styling for the injected controls.

## Setup

### 1. Backend

Host `api.php` on any PHP server with cURL enabled and set your key at the top of the file:

```php
$OPENAI_API_KEY = "sk-...your key...";
```

Point `content.js` at your endpoint if you are not using the default host.

### 2. Extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open X, start a reply, and use the GhostReply tone buttons.

## Disclaimer

Automating engagement may conflict with X's Terms of Service. Use responsibly and at your
own risk.
