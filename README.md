# yakcollective-ifttt-connector

A script that creates Jekyll posts in a Github repo from IFTTT events, using the IFTTT Webhook action. Lightly modified from [the example connector](https://glitch.com/~ifttt-ghpages) [described on `webrender.net`](https://webrender.net/2017/11/23/automate-github-pages-ifttt-glitch.html)

## Setup

- Copy `_env` to `.env`.
- Set `GH_USER`, `GH_REPO`, and `GH_BRANCH` appropriately.
- Set `GH_TOKEN` to a [GitHub **Personal Access Token**](https://github.com/settings/tokens).
- Set `WEBHOOK_TOKEN` to a shared secret of your choice (the output of `uuidgen` works well).  We'll use this to verify requests are coming from our webhook.
- Go to IFTTT and create a new applet. For the "that" action, choose the **Webhooks** service, and then the **Make a web request** option.  Fill in the fields as follows:
  - The **URL** of your node server, with a `token` parameter. Optionally include a `category` parameter (posts will be stored in `$category/_posts`). For example: `https://yakcollective-ifttt-connector.glitch.me/?token=your-token&category=writings`
  - Use `POST` for the **Method**.
  - Use `text/plain` for the **Content Type**.
  - For the **Body**, create an HTML file with YAML frontmatter. Replace the newlines in the YAML with `|||`. For example:`---|||title: {{EntryTitle}}|||date: {{EntryPublished}}|||author: venkatesh-rao|||original_link: {{EntryUrl}}|||---|||{{EntryContent}}`