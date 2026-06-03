# MLP.DB Tabletop Simulator Importer

This folder contains the first TTS-side importer for MLP.DB deck exports.

## Use It

1. In the website, build a deck and open `Export`.
2. Select `TTS`.
3. Copy or download the text export.
4. In Tabletop Simulator, open `Scripting > Scripting Editor`.
5. Paste `tts/mlpdb-importer.lua` into the Global script and click `Save & Play`.
6. Paste the TTS deck export into the on-table importer panel and press `Import Deck`.

The importer spawns separate piles for main character, main deck, story deck, and scene deck. Card faces load from the raw GitHub URLs for `card_images/`. Main deck cards use `tts/mlp-main-deck-back.jpg`; main character, story, and scene cards use `tts/mlp-other-deck-back.jpg`.

## Export Format

The importer accepts sectioned exports like this:

```text
=== Main Character ===
1 SD01-GR01

=== Main Deck ===
4 BP01-C01
4 BP01-C02
```

It also accepts plain lines such as `4 BP01-C01`; those default to the main deck pile.
