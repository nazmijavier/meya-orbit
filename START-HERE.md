# Meya Animate

An animated media cloud for your Meya header: transparent background, mixed card shapes, opening animation, rotation, and drag interaction. Click a card to open the full image or video with an optional title. Sample photos are placeholders from Unsplash; replace them with your work.

## Easiest way to use it

1. Open **orbit-editor.html** in your browser (double-click the file). The hosted project’s main URL opens this editor; **orbit-preview.html** remains the visual-only preview.
2. Click **Clear samples**, then **+ Add URL** to add your media. Choose Image, MP4 / WebM, or Vimeo for each item.
3. Use **Card aspect ratio** to set every card to Mixed, 1:1, 4:3, 3:4, 16:9, or 9:16. You can still change one card’s shape separately in its own dropdown. Returning to **Mixed** restores the original varied proportions. Enter an optional title and enable or disable its popup. Adjust section height, card count, speed, and corners. Media repeats when the card count exceeds the number of items, up to 48 cards.
4. Choose **Orbit**, **Carousel**, or **Wave** under **Animation template**. Set the canvas width and height directly, or use HD 16:9, Square 1:1, 4:3, or Portrait 9:16. These dimensions are used by the MP4 export; the Webflow section remains responsive.
5. Use **Preview** to open an orbit-only full-screen view. **Export JSON** saves the complete project settings. **Export MP4** renders a downloadable video in browsers that provide WebCodecs/H.264 support.
6. Click **Copy Webflow embed**. **View code** lets you select and copy it manually; **Download embed** saves it as a text file.
5. In Webflow, add a **Code Embed** element inside the header where the image placeholder belongs. Set its width to 100%, and paste the code. Do not add another full HTML document around it.
6. Save and check Webflow Preview with custom code enabled, then your published staging page. The default export uses a direct embed so the popup can cover the whole page. The script notice in Designer is normal.

The editor has no cloud storage or automatic saving. Export your changes before closing it. Preview, editor, and embed are self-contained files, so you can move them individually. Media URLs still need an internet connection.

## What you can add

**Images:** upload JPG, PNG, WebP, or AVIF images to Webflow Assets. Copy each asset URL into the editor. Cards crop to the selected shape. The popup shows the full image in its original proportions. Use a source large enough for the enlarged preview, ideally at least 1200 pixels on the long edge.

**Vimeo:** use `https://vimeo.com/VIDEO_ID` or the `https://player.vimeo.com/video/VIDEO_ID` URL. Unlisted links with their privacy hash also work. Choose the source video's proportions in the editor so it crops correctly. Vimeo needs embedding enabled for your Webflow staging domain and your final domain. Background playback requires a paid Vimeo plan. Videos are muted and loop.

**Uploaded video:** upload the video to a host that provides a public direct MP4 or WebM URL, then choose **MP4 / WebM**. A link to a video webpage or sharing page is not a direct video URL. Webflow's normal Assets panel does not accept video files; Webflow's Background Video element has a separate upload flow. If using that flow, use the actual hosted MP4/WebM source URL from the published Background Video element, not the page URL. Vimeo is simpler if you do not already have video hosting.

**Local files:** **Preview local files** lets you try images and MP4/WebM files from your computer without uploading them. These temporary previews cannot be exported to Webflow: replace their empty URL fields with hosted links before exporting. Local files remain on your computer.

For each video, add a **poster image URL**. Posters show before playback, if autoplay is blocked, and when visitors request reduced motion. Keep videos short and use mostly images; at most three foreground videos play at once. Vimeo may show its own player error if the link or domain permissions are wrong.

## Visual behavior

- Slowly rotates automatically; hover slows it down.
- Cards arrive from a wide spread and ease into the orbit in about two seconds. Use **Replay opening** to check it, or disable **Animate cards on arrival**.
- Card proportions apply only to cards. The section fills the available width with an independently adjustable height.
- Click a card to open an enlarged image or a video with controls. Only your optional title appears beneath it. Close with ×, Escape, or a click outside the media. The orbit pauses while the popup is open.
- Drag horizontally to rotate. Vertical touch scrolling stays available.
- Keyboard: Tab to the visual, arrow keys to rotate, Space to pause/resume.
- Respects the visitor's reduced-motion setting; videos do not autoplay in that mode.
- Pauses while the visual is offscreen or the browser tab is hidden.
- Default height: 420 px on desktop, at most 330 px on mobile.
- No logo or heading in the orbit. Titles appear only in the popup.

## If Webflow Shows a Script Warning

You did not do anything wrong. Webflow Designer shows a gray warning for direct script embeds. The updated **Copy Webflow embed** button exports this version because a full-page popup needs to sit outside the header frame. Replace the entire previous embed and test in Preview with custom code enabled. **webflow-iframe-embed.html** is an optional alternative, but its popup stays confined to the header frame.

## Verification

The updated editor was checked for all five card shapes, global ratio changes, per-card overrides, Mixed restoration, clipboard export, a 390 px wide preview, mouse click and keyboard popup opening, Escape close, drag without opening, per-card popup toggles, and exported titles and proportions. The sample direct embed is about 24,000 characters, below Webflow’s 50,000-character limit. Vimeo playback still needs verification on your published Webflow page because the local preview environment previously blocked its player script.

## Files

- **orbit-preview.html** — visual only.
- **orbit-editor.html** — media editor with live preview and Webflow export.
- **assets/meya-logo.png** — Meya Animate header mark.
- **vendor/mp4-muxer.js** — bundled MP4 container writer used by the editor export.
- **video-export.js** — browser MP4 export module.
- **webflow-embed.html** — ready-to-paste direct embed with sample images and full-page popups. Open as text to copy its contents.
- **webflow-script-embed.html** — same direct embed, retained for compatibility.
- **webflow-iframe-embed.html** — optional iframe version; its popup is confined to the frame.
- **orbit.css / orbit.js** — separate source files for a developer.
- **build.mjs / editor-template.html** — source for rebuilding the three deliverables with Node.

## Reference documentation

- [Webflow Code Embed](https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed): supports HTML/CSS/JS; requires an eligible plan; 50,000-character limit.
- [Webflow Assets](https://help.webflow.com/hc/en-us/articles/33961269934227-Assets-panel): supported image types and asset URLs.
- [Webflow Video](https://help.webflow.com/hc/en-us/articles/33961304305427-Video): regular Assets do not accept videos; Background Video uses a separate upload flow.
- [Vimeo background embedding](https://help.vimeo.com/hc/en-us/articles/12426285089681-About-embedding-background-and-Chromeless-videos): paid plan, muted looping playback, and unlisted privacy hashes.
