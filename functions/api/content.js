import { getState, json } from '../_lib/store.js';

export async function onRequestGet(context) {
  try {
    return json(await getState(context.env?.DB));
  } catch (e) {
    // Log the real cause on the server; do not expose SQL errors or secrets publicly.
    console.error('ICD10_CONTENT_ERROR', e?.stage || 'UNKNOWN', e?.cause || e);
    return json({
      error: 'D1 өгөгдөл уншихад алдаа гарлаа.',
      stage: e?.stage || 'UNKNOWN',
      hint: e?.stage === 'BINDING'
        ? 'Pages Production орчны DB binding болон хамгийн сүүлийн deploy-ийг шалгана уу.'
        : 'Pages Functions live logs дотор ICD10_CONTENT_ERROR мөрийг шалгана уу.'
    }, 503);
  }
}
