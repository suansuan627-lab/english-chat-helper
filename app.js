'use strict';

// Public endpoint only. Never put model keys or access passwords in this file.
const API_ENDPOINT = 'https://english-chat-api.suansuan627.workers.dev/translate';
const examples = {
  late: '我可能会晚到十分钟，你们先点菜吧，不用等我。',
  decline: '谢谢你邀请我，但我今晚已经有安排了。改天再约吧。',
  ambiguous: '你现在方便吗？'
};
const $ = id => document.getElementById(id);
let currentEnglish = '';
let revision = 0;
let activeRequest = null;

function busy(value) {
  $('translate').disabled = value;
  $('translate').textContent = value ? '正在翻译与复核…' : '翻译并核对原意 →';
  $('cancel').hidden = !value;
  $('loading').hidden = !value;
  $('result-heading').setAttribute('aria-busy', String(value));
}
function resetResult() {
  revision++;
  activeRequest?.abort();
  activeRequest = null;
  busy(false);
  currentEnglish = '';
  for (const id of ['english', 'meaning', 'tone-note', 'question', 'notice', 'result-label']) $(id).textContent = '';
  $('warnings').replaceChildren();
  for (const id of ['result', 'clarification', 'notice', 'warnings-section']) $(id).hidden = true;
  $('empty-state').hidden = false;
  $('copy').textContent = '复制英文 ⧉';
}
function updateInput() {
  $('count').textContent = `${$('source').value.length} / 1000`;
  resetResult();
}
function showNotice(message) {
  $('notice').textContent = message;
  $('notice').hidden = false;
}
function revealResult() {
  if (window.matchMedia('(max-width: 700px)').matches) {
    $('result-heading').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
}
function validText(value, max) { return typeof value === 'string' && !!value.trim() && value.length <= max; }
function validResult(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.status === 'clarification') return validText(data.question, 800);
  return data.status === 'translated' && data.review === 'model-reviewed'
    && validText(data.english, 6000) && validText(data.meaning, 3000) && validText(data.toneNote, 1000)
    && Array.isArray(data.warnings) && data.warnings.length <= 6 && data.warnings.every(w => validText(w, 500));
}
function errorMessage(code, status) {
  const messages = {
    UNAUTHORIZED: '访问口令不正确。请填写 Cloudflare 的 APP_PASSWORD，而不是 DeepSeek 密钥。',
    NOT_CONFIGURED: '后端配置未完成。请检查两个 Secret 的名称，以及 APP_PASSWORD 是否为 24–128 位英文字母、数字、- 或 _。',
    MODEL_BALANCE: 'DeepSeek 可用余额不足。请到 DeepSeek 开放平台检查余额，再决定是否小额充值测试。',
    MODEL_AUTH: 'DeepSeek 密钥无效或无权限。请检查 Cloudflare 中的 DEEPSEEK_API_KEY。',
    MODEL_BUSY: '模型服务繁忙，请稍后再试。',
    RATE_LIMITED: '请求过于频繁，请稍后再试。',
    MODEL_UNAVAILABLE: '模型服务暂时不可用，请稍后再试。',
    TRANSLATION_FAILED: '翻译或复核未完成，因此没有显示未经复核的草稿。请稍后再试。',
    TIMEOUT: '翻译或复核超时，未显示草稿。请稍后重试；已发生的调用可能仍计费。',
    ORIGIN_DENIED: '请通过正式的 GitHub Pages 网站使用，不要直接双击本地 HTML 文件。',
    INVALID_INPUT: '请输入 1–1000 字的消息，背景也请控制在 1000 字以内。',
    TOO_LARGE: '消息过长，请缩短后再试。'
  };
  return Object.hasOwn(messages, code) ? messages[code] : `服务请求失败（${status}），请稍后再试。`;
}
async function translate() {
  if (activeRequest) return;
  resetResult();
  const source = $('source').value.trim();
  const context = $('context').value.trim();
  if (!source || source.length > 1000 || context.length > 1000) {
    showNotice('请输入 1–1000 字的中文消息；聊天背景最多 1000 字。');
    $('source').focus();
    return;
  }
  if (!/^[A-Za-z0-9_-]{24,128}$/.test($('password').value)) {
    showNotice('请先填写你设置的 APP_PASSWORD：24–128 位英文字母、数字、- 或 _，不要包含空格。不要填写 DeepSeek 密钥。');
    $('password').focus();
    return;
  }
  if (!$('consent').checked) {
    showNotice('请先阅读并勾选发送消息给 AI 服务的说明，再开始翻译。');
    $('consent').focus();
    return;
  }
  const controller = new AbortController();
  activeRequest = controller;
  const requestRevision = revision;
  const tone = $('tone').value;
  const toneLabel = $('tone').selectedOptions[0].textContent;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 65000);
  busy(true);
  $('empty-state').hidden = true;
  revealResult();
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$('password').value}` },
      body: JSON.stringify({ source, context, tone }), signal: controller.signal
    });
    if (requestRevision !== revision) return;
    const data = await response.json();
    if (requestRevision !== revision) return;
    if (!response.ok) { showNotice(errorMessage(data?.error, response.status)); return; }
    if (!validResult(data)) { showNotice('服务返回的结果不完整，未显示译文。请稍后再试。'); return; }
    if (data.status === 'clarification') {
      $('question').textContent = data.question;
      $('clarification').hidden = false;
      return;
    }
    currentEnglish = data.english;
    $('english').textContent = data.english;
    $('meaning').textContent = data.meaning;
    $('tone-note').textContent = data.toneNote;
    $('result-label').textContent = '已进行模型复核 · ' + toneLabel;
    for (const warning of data.warnings) {
      const item = document.createElement('li');
      item.textContent = warning;
      $('warnings').append(item);
    }
    $('warnings-section').hidden = data.warnings.length === 0;
    $('result').hidden = false;
  } catch {
    if (requestRevision !== revision) return;
    showNotice(timedOut ? errorMessage('TIMEOUT') : '未能完成请求。请检查网络，或在浏览器中打开后端地址确认能否访问；不要反复点击。');
  } finally {
    clearTimeout(timer);
    if (requestRevision === revision) { activeRequest = null; busy(false); }
  }
}
document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => { $('source').value = examples[button.dataset.example]; updateInput(); $('source').focus(); });
});
$('source').addEventListener('input', updateInput);
$('context').addEventListener('input', resetResult);
$('password').addEventListener('input', resetResult);
$('tone').addEventListener('change', resetResult);
$('consent').addEventListener('change', resetResult);
$('clear').addEventListener('click', () => { $('source').value = ''; updateInput(); $('source').focus(); });
$('forget-password').addEventListener('click', () => { $('password').value = ''; resetResult(); $('password').focus(); });
$('cancel').addEventListener('click', () => { resetResult(); showNotice('已取消等待。已经发出的模型请求可能仍会计费。'); });
$('add-context').addEventListener('click', () => { $('context-section').open = true; $('context').focus(); });
$('translate').addEventListener('click', translate);
window.addEventListener('pagehide', () => { $('password').value = ''; $('consent').checked = false; resetResult(); });
$('copy').addEventListener('click', async () => {
  if (!currentEnglish) return;
  const value = currentEnglish;
  const copyRevision = revision;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    if (copyRevision === revision) $('copy').textContent = '已复制，可以粘贴到微信 ✓';
  } catch {
    if (copyRevision !== revision) return;
    const range = document.createRange();
    range.selectNodeContents($('english'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    showNotice('浏览器未允许自动复制，已选中英文。请长按文字或按 Ctrl+C / ⌘C 复制。');
  }
});
