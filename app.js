'use strict';

// Deliberately local, curated examples. No model request or chat storage.
const samples = {
  late: {
    source: '我可能会晚到十分钟，你们先点菜吧，不用等我。',
    meaning: '我可能会晚到十分钟；你们可以先点菜，不必等我到了再点。',
    versions: {
      natural: ["I might be about ten minutes late. Go ahead and order—no need to wait for me.", '自然、友好。“might”保留了“可能”，没有把不确定的时间说成确定承诺。'],
      casual: ["Might be about ten minutes late. Go ahead and order without me!", '省略句首的 I，更像熟人之间的即时消息。“order without me”在这里指先点菜。'],
      polite: ["I may be about ten minutes late. Please go ahead and order; there's no need to wait for me.", '完整句式加上 please，表达更礼貌，同时保留不确定性。']
    }
  },
  decline: {
    source: '谢谢你邀请我，但我今晚已经有安排了。改天再约吧。',
    meaning: '感谢对方的邀请；今晚已有安排，不能赴约，希望换一天再约。',
    versions: {
      natural: ["Thanks for inviting me, but I already have plans tonight. Let's get together another time.", '友好地拒绝今晚的邀请，并表达改天再约的意愿；没有编造具体原因或日期。'],
      casual: ["Thanks for the invite! I've already got plans tonight, but let's hang out another time.", '“Thanks for the invite”和“hang out”适合朋友间比较轻松的交流。'],
      polite: ["Thank you for the invitation. I already have plans this evening, but I'd be happy to get together another time.", '更完整、礼貌，适合不太熟悉的对象；改天见面的意愿也更明确。']
    }
  },
  ambiguous: { source: '你现在方便吗？' },
  time: {
    source: '你现在有时间聊一下吗？',
    meaning: '询问对方此刻是否有时间简短聊一下。',
    versions: {
      natural: ['Do you have a moment to chat?', '自然地询问对方有没有时间聊天。'],
      casual: ['Got a minute to chat?', '熟人聊天中的简短口语表达。'],
      polite: ['Would now be a good time for a quick chat?', '先询问时间是否合适，语气更体贴。']
    }
  },
  help: {
    source: '你现在方便帮我个忙吗？',
    meaning: '询问对方现在是否方便帮自己一个忙。',
    versions: {
      natural: ['Could you help me with something right now?', '明确是在请求帮忙，而非泛泛询问是否有空。'],
      casual: ['Can you give me a hand with something right now?', '“give me a hand”是口语中自然的“帮我个忙”。'],
      polite: ['Would you be able to help me with something right now?', '礼貌地询问能否帮忙，保留“现在”的时间要求。']
    }
  }
};
const $ = id => document.getElementById(id);
let currentEnglish = '';
function resetResult() {
  currentEnglish = '';
  $('english').textContent = '';
  $('result').hidden = true;
  $('clarification').hidden = true;
  $('notice').hidden = true;
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
    $('result-heading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
function translate() {
  resetResult();
  const source = $('source').value.trim();
  if (!source) {
    showNotice('请先选择一句示例，或输入你想说的话。');
    $('source').focus();
    return;
  }
  // Exact match only. Never pretend a similar input has the same meaning.
  const entry = Object.values(samples).find(item => item.source === source);
  if (!entry || $('context').value.trim()) {
    $('empty-state').hidden = true;
    showNotice('当前是示例体验版，还不能翻译自由输入的消息或结合聊天背景生成结果。请点击上方例句，并清空补充背景后体验。接入 AI 服务后才能处理你的实际消息。');
    revealResult();
    return;
  }
  $('empty-state').hidden = true;
  if (!entry.versions) {
    $('clarification').hidden = false;
    revealResult();
    return;
  }
  const tone = $('tone').value;
  const [english, note] = entry.versions[tone];
  currentEnglish = english;
  $('english').textContent = english;
  $('meaning').textContent = entry.meaning;
  $('tone-note').textContent = note;
  $('result-label').textContent = '预置示例 · ' + $('tone').selectedOptions[0].textContent;
  $('result').hidden = false;
  revealResult();
}
document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => {
    $('source').value = samples[button.dataset.example].source;
    updateInput();
    $('source').focus();
  });
});
document.querySelectorAll('[data-choice]').forEach(button => {
  button.addEventListener('click', () => {
    $('source').value = samples[button.dataset.choice].source;
    updateInput();
    translate();
  });
});
$('source').addEventListener('input', updateInput);
$('context').addEventListener('input', resetResult);
$('tone').addEventListener('change', resetResult);
$('clear').addEventListener('click', () => {
  $('source').value = '';
  updateInput();
  $('source').focus();
});
$('translate').addEventListener('click', translate);
$('copy').addEventListener('click', async () => {
  if (!currentEnglish) return;
  const value = currentEnglish;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(value);
    if (currentEnglish === value) $('copy').textContent = '已复制，可以粘贴到微信 ✓';
  } catch {
    if (currentEnglish !== value) return;
    const range = document.createRange();
    range.selectNodeContents($('english'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    showNotice('浏览器未允许自动复制，已选中英文。请长按文字或按 Ctrl+C / ⌘C 复制。');
  }
});
