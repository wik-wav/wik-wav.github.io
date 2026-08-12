# Portfolio content

These JSON files are the source of truth. Edit them through `npm run studio`; generated HTML and runtime data should not be edited manually.

Project and collection pages may author `detailSequence` as an ordered array of stable nodes. Work nodes use `{ "id": "work-<workId>", "kind": "work", "workId": "…" }`; bilingual text nodes use `{ "id": "text-…", "kind": "text", "headingPL": "…", "headingEN": "…", "bodyPL": "…", "bodyEN": "…" }`. The optional `sequenceReveal` object selects a node boundary and a `compact`, `standard`, or `tall` preview. Set `enabled` to `false` to render the whole page without a reveal.

`detailSequenceIds` remains as an ordered work-only compatibility mirror. When both fields exist, the work IDs and their order must match exactly. Legacy records that only contain `detailSequenceIds` remain valid and resolve to equivalent work nodes.
