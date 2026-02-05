const { detaGetItem, BASE_APPSTATE } = require('./_deta_helpers');

exports.handler = async function handler() {
  try {
    const item = await detaGetItem(BASE_APPSTATE, 'config');
    const forcedPage = item && item.item && item.item.forcedPage ? item.item.forcedPage : null;
    const acceptingSubmissions = item && item.item && typeof item.item.acceptingSubmissions !== 'undefined' ? item.item.acceptingSubmissions : true;
    const submitDelayMs = item && item.item && typeof item.item.submitDelayMs !== 'undefined' ? item.item.submitDelayMs : 3000;
    return { statusCode: 200, body: JSON.stringify({ forcedPage, acceptingSubmissions, submitDelayMs }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
