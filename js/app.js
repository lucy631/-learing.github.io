/* 小奥学习 - 主应用 */
const App = (() => {
  let config = null;
  let chineseData = null;
  let mathData = null;
  let currentView = 'home';
  let sessionStart = null;
  let studyTimer = null;

  let chineseSession = null;
  let mathSession = null;
  let mathTimerInterval = null;
  let lastResult = null;

  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const modalEl = document.getElementById('modal');

  async function init() {
    await loadData();
    registerServiceWorker();
    render();
    startStudyTimer();
  }

  async function loadData() {
    try {
      const [cfg, cn, math] = await Promise.all([
        fetch('./data/config.json').then((r) => r.json()),
        fetch('./data/chinese.json').then((r) => r.json()),
        fetch('./data/math.json').then((r) => r.json()).catch(() => ({ questions: [] }))
      ]);
      config = cfg;
      chineseData = cn;
      mathData = math;
    } catch (e) {
      config = {
        appName: '小奥学习',
        parentPassword: '1234',
        dailyGoalMinutes: 30,
        mathTimeLimitSeconds: 300,
        mathQuestionCount: 20,
        chineseQuestionCount: 10,
        starsPerCorrect: 1,
        bonusStarsOnComplete: 3,
        levels: [
          { name: '光之学徒', minStars: 0, icon: '🌟' },
          { name: '见习战士', minStars: 10, icon: '⚡' },
          { name: '光之战士', minStars: 30, icon: '🦸' },
          { name: '奥特英雄', minStars: 60, icon: '💫' },
          { name: '传说奥特曼', minStars: 100, icon: '🏆' }
        ]
      };
      chineseData = { questions: generateFallbackChinese() };
      mathData = { questions: [] };
    }
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  function startStudyTimer() {
    sessionStart = Date.now();
    if (studyTimer) clearInterval(studyTimer);
    studyTimer = setInterval(() => {
      const mins = Math.floor((Date.now() - sessionStart) / 60000);
      if (mins >= 1) {
        Storage.addStudyMinutes(1);
        sessionStart = Date.now();
      }
    }, 60000);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove('hidden');
    setTimeout(() => toastEl.classList.add('hidden'), 2500);
  }

  function showModal(title, bodyHtml, actions) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    actions.forEach(({ label, className, onClick }) => {
      const btn = document.createElement('button');
      btn.className = `btn ${className || 'btn-secondary'}`;
      btn.textContent = label;
      btn.onclick = () => {
        modalEl.classList.add('hidden');
        onClick && onClick();
      };
      actionsEl.appendChild(btn);
    });
    modalEl.classList.remove('hidden');
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function render() {
    const views = {
      home: renderHome,
      chinese: renderChineseQuiz,
      math: renderMathQuiz,
      checkin: renderCheckin,
      wrong: renderWrongBook,
      report: renderReport,
      result: renderResult
    };
    (views[currentView] || renderHome).call(this);
  }

  function navigate(view, data) {
    currentView = view;
  }

  function renderHome() {
    const progress = Storage.load();
    const level = Storage.getLevel(progress.stars, config.levels);
    const todayStats = progress.dailyStats[Storage.today()] || { minutes: 0 };
    const checkedIn = Storage.isCheckedInToday();

    app.innerHTML = `
      <header class="page-header">
        <p class="hero-badge">${level.icon} ${level.name}</p>
        <h1 class="page-title">⚡ 小奥学习 ⚡</h1>
        <p class="page-subtitle">光之国课堂 · 一起变强吧！</p>
      </header>

      <div class="stats-bar">
        <div class="stat-card">
          <div class="stat-value">⭐ ${progress.stars}</div>
          <p class="stat-label">星星总数</p>
        </div>
        <div class="stat-card">
          <div class="stat-value">${progress.streak}天</div>
          <div class="stat-label">连续打卡</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${todayStats.minutes}/${config.dailyGoalMinutes}</div>
          <div class="stat-label">今日分钟</div>
        </div>
      </div>

      <div class="checkin-card">
        <div>${checkedIn ? '🎉 今日已打卡！' : '📅 完成练习即可打卡'}</div>
        <div class="checkin-streak">${checkedIn ? '✅' : '⏳'} ${progress.streak} 天连续</div>
      </div>

      <div class="menu-grid">
        <div class="menu-card hero" data-go="chinese">
          <div class="menu-icon">📖</div>
          <div class="menu-title">语文识字</div>
          <div class="menu-desc">二年级汉字</div>
        </div>
        <div class="menu-card hero" data-go="math">
          <div class="menu-icon">🔢</div>
          <div class="menu-title">口算练习</div>
          <p class="menu-desc">20 以内加减法</p>
        </div>
        <div class="menu-card" data-go="wrong">
          <div class="menu-icon">📋</div>
          <div class="menu-title">错题本</div>
          <div class="menu-desc">${progress.wrongQuestions.length} 道待复习</div>
        </div>
        <div class="menu-card" data-go="checkin">
          <div class="menu-icon">🗓️</div>
          <div class="menu-title">打卡记录</div>
          <div class="menu-desc">查看学习日历</div>
        </div>
      </div>

      <div class="bottom-bar">
        <button class="btn btn-secondary" id="btn-parent">👨‍👩‍👦 家长报告</button>
      </div>

      <div class="install-tip">
        💡 Android 安装：Chrome 浏览器打开 → 右上角菜单 → 「添加到主屏幕」，即可像 App 一样离线使用。
      </div>
    `;

    app.querySelectorAll('[data-go]').forEach((el) => {
      el.onclick = () => {
        currentView = el.dataset.go;
        render();
      };
    });

    document.getElementById('btn-parent').onclick = promptParentPassword;
  }

  function promptParentPassword() {
    showModal('家长验证', `
      <p style="text-align:center;margin-bottom:12px;color:#b0bec5;">请输入家长密码</p>
      <input type="password" class="pin-input" id="parent-pin" maxlength="4" inputmode="numeric" placeholder="····">
    `, [
      { label: '取消', className: 'btn-secondary', onClick: null },
      { label: '进入', className: 'btn-primary', onClick: () => {
        const pin = document.getElementById('parent-pin')?.value;
        if (pin === config.parentPassword) {
          currentView = 'report';
          render();
        } else {
          showToast('密码错误');
        }
      }}
    ]);
    setTimeout(() => document.getElementById('parent-pin')?.focus(), 100);
  }


  function renderChineseQuiz() {
    if (!chineseSession) {
      const pool = shuffle(chineseData.questions).slice(0, config.chineseQuestionCount);
      chineseSession = { questions: pool, index: 0, correct: 0, answered: false };
    }
    const s = chineseSession;
    const q = s.questions[s.index];

    if (!q) {
      finishChineseSession();
      return;
    }

    const optionsHtml = q.type === 'choice'
      ? q.options.map((opt, i) => `<button class="btn btn-option" data-opt="${i}">${opt}</button>`).join('')
      : `<button class="btn btn-option" data-opt="true">✅ 对</button>
         <button class="btn btn-option" data-opt="false">❌ 错</button>`;

    app.innerHTML = `
      <button class="back-btn" id="btn-back">← 返回</button>
      <div class="quiz-header">
        <span class="quiz-progress">第 ${s.index + 1}/${s.questions.length} 题</span>
        <span>⭐ ${Storage.load().stars}</span>
      </div>
      <div class="question-box">
        ${q.char ? `<p class="question-char">${q.char}</p>` : ''}
        <p class="question-text">${q.question}</p>
      </div>
      <section id="options">${optionsHtml}</section>
      <div id="feedback" class="feedback"></div>
      ${s.answered ? `<button class="btn btn-primary btn-block" id="btn-next">下一题 →</button>` : ''}
    `;

    document.getElementById('btn-back').onclick = () => {
      chineseSession = null;
      currentView = 'home';
      render();
    };

    if (!s.answered) {
      app.querySelectorAll('[data-opt]').forEach((btn) => {
        btn.onclick = () => handleChineseAnswer(q, btn.dataset.opt, s);
      });
    } else {
      document.getElementById('btn-next').onclick = () => {
        s.index += 1;
        s.answered = false;
        render();
      };
    }
  }

  function handleChineseAnswer(q, selected, session) {
    if (session.answered) return;
    session.answered = true;

    let correct = false;
    if (q.type === 'choice') {
      correct = parseInt(selected, 10) === q.answer;
    } else {
      correct = (selected === 'true') === q.answer;
    }

    const meta = { id: q.id, subject: 'chinese', type: q.type, question: q.question, char: q.char, hint: q.hint };
    Storage.recordAnswer('chinese', correct, correct ? null : meta);

    if (correct) {
      session.correct += 1;
      Storage.addStars(config.starsPerCorrect);
      document.getElementById('feedback').textContent = '🌟 太棒了！' + (q.hint ? ' ' + q.hint : '');
      document.getElementById('feedback').className = 'feedback correct';
    } else {
      document.getElementById('feedback').textContent = '💪 加油！' + (q.hint ? ' ' + q.hint : '');
      document.getElementById('feedback').className = 'feedback wrong';
    }

    app.querySelectorAll('[data-opt]').forEach((btn) => {
      btn.disabled = true;
      if (q.type === 'choice') {
        if (parseInt(btn.dataset.opt, 10) === q.answer) btn.classList.add('correct');
        else if (btn.dataset.opt === selected) btn.classList.add('wrong');
      } else {
        const sel = selected === 'true';
        if (sel === q.answer) btn.classList.add('correct');
        else if (btn.dataset.opt === selected) btn.classList.add('wrong');
      }
    });

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary btn-block';
    nextBtn.id = 'btn-next';
    nextBtn.textContent = session.index + 1 >= session.questions.length ? '查看结果' : '下一题 →';
    nextBtn.onclick = () => {
      session.index += 1;
      session.answered = false;
      render();
    };
    app.appendChild(nextBtn);
  }

  function finishChineseSession() {
    const s = chineseSession;
    const total = s.questions.length;
    const score = Math.round((s.correct / total) * 100);
    Storage.addStars(config.bonusStarsOnComplete);
    Storage.markCheckIn();
    Storage.recordSession('chinese', score);
    chineseSession = null;
    lastResult = { type: 'chinese', score, correct: s.correct, total };
    currentView = 'result';
    render();
  }

  /* ---- 口算练习 ---- */
  function generateMathQuestions(count) {
    if (mathData?.questions?.length >= count) {
      return shuffle(mathData.questions).slice(0, count);
    }
    const qs = [];
    while (qs.length < count) {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      const add = Math.random() > 0.5;
      let expr, ans;
      if (add) {
        if (a + b > 20) continue;
        expr = `${a} + ${b}`;
        ans = a + b;
      } else {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        expr = `${big} - ${small}`;
        ans = big - small;
      }
      qs.push({ id: `math-${Date.now()}-${qs.length}`, type: 'math', expression: expr, answer: ans });
    }
    return qs;
  }

  function renderMathQuiz() {
    if (!mathSession) {
      mathSession = {
        questions: generateMathQuestions(config.mathQuestionCount),
        index: 0,
        correct: 0,
        timeLeft: config.mathTimeLimitSeconds,
        finished: false
      };
      if (mathTimerInterval) clearInterval(mathTimerInterval);
      mathTimerInterval = setInterval(() => {
        if (mathSession && !mathSession.finished) {
          mathSession.timeLeft -= 1;
          const timerEl = document.getElementById('math-timer');
          if (timerEl) timerEl.textContent = formatTime(mathSession.timeLeft);
          if (mathSession.timeLeft <= 0) {
            finishMathSession();
          }
        }
      }, 1000);
    }

    const s = mathSession;
    if (s.finished) return;

    const q = s.questions[s.index % s.questions.length];

    app.innerHTML = `
      <button class="back-btn" id="btn-back">← 返回</button>
      <div class="quiz-header">
        <span class="quiz-progress">正确 ${s.correct} 题</span>
        <span class="timer" id="math-timer">${formatTime(s.timeLeft)}</span>
      </div>
      <div class="question-box">
        <div class="math-expression">${q.expression} = ?</div>
        <input type="number" class="math-input" id="math-answer" inputmode="numeric" autofocus>
      </div>
      <div id="feedback" class="feedback"></div>
      <button class="btn btn-primary btn-block" id="btn-submit">确认 ⚡</button>
    `;

    document.getElementById('btn-back').onclick = () => {
      if (mathTimerInterval) clearInterval(mathTimerInterval);
      mathSession = null;
      currentView = 'home';
      render();
    };

    const submit = () => {
      const val = parseInt(document.getElementById('math-answer').value, 10);
      if (isNaN(val)) {
        showToast('请输入答案');
        return;
      }
      const correct = val === q.answer;
      const meta = { id: q.id, subject: 'math', type: 'math', question: q.expression + ' = ?', answer: q.answer };
      Storage.recordAnswer('math', correct, correct ? null : meta);

      if (correct) {
        s.correct += 1;
        Storage.addStars(config.starsPerCorrect);
        document.getElementById('feedback').textContent = '🌟 正确！';
        document.getElementById('feedback').className = 'feedback correct';
      } else {
        document.getElementById('feedback').textContent = `💪 答案是 ${q.answer}`;
        document.getElementById('feedback').className = 'feedback wrong';
      }

      s.index += 1;
      s.questions.push(generateMathQuestions(1)[0]);
      setTimeout(() => render(), correct ? 400 : 800);
    };

    document.getElementById('btn-submit').onclick = submit;
    document.getElementById('math-answer').onkeydown = (e) => {
      if (e.key === 'Enter') submit();
    };
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function finishMathSession() {
    if (!mathSession) return;
    mathSession.finished = true;
    if (mathTimerInterval) clearInterval(mathTimerInterval);
    const s = mathSession;
    const total = s.index;
    const score = total > 0 ? Math.round((s.correct / total) * 100) : 0;
    Storage.addStars(config.bonusStarsOnComplete);
    Storage.markCheckIn();
    Storage.recordSession('math', score);
    mathSession = null;
    lastResult = { type: 'math', score, correct: s.correct, total };
    currentView = 'result';
    render();
  }

  function renderResult() {
    const r = lastResult;
    if (!r) { currentView = 'home'; render(); return; }

    app.innerHTML = `
      <div class="result-screen">
        <div class="star-burst">⭐🦸⭐</div>
        <h2 style="margin:16px 0;color:#ffd54f;">战斗结束！</h2>
        <div class="result-score">${r.score}分</div>
        <p style="margin:12px 0;color:#b0bec5;">答对 ${r.correct} / ${r.total} 题</p>
        <p style="margin-bottom:24px;">获得额外 ${config.bonusStarsOnComplete} 颗星星！</p>
        <button class="btn btn-primary btn-block" id="btn-home">返回首页</button>
        <button class="btn btn-secondary btn-block" style="margin-top:10px;" id="btn-retry">再来一次</button>
      </div>
    `;

    document.getElementById('btn-home').onclick = () => {
      lastResult = null;
      currentView = 'home';
      render();
    };
    document.getElementById('btn-retry').onclick = () => {
      lastResult = null;
      currentView = r.type;
      render();
    };
  }

  function renderCheckin() {
    const progress = Storage.load();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        key,
        label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        done: progress.checkInDates.includes(key)
      });
    }

    app.innerHTML = `
      <button class="back-btn" id="btn-back">← 返回</button>
      <header class="page-header">
        <h2 class="page-title" style="font-size:22px;">📅 打卡记录</h2>
      </header>
      <div class="checkin-card">
        <div>连续打卡</div>
        <div class="checkin-streak">${progress.streak} 天 🔥</div>
        <div class="checkin-days">
          ${days.map((d) => `<div class="day-dot ${d.done ? 'done' : ''}">${d.label}</div>`).join('')}
        </div>
      </div>
      <p style="text-align:center;color:#b0bec5;font-size:14px;">
        累计打卡 ${progress.checkInDates.length} 天 · 共获得 ⭐ ${progress.stars} 颗星星
      </p>
    `;
    document.getElementById('btn-back').onclick = () => { currentView = 'home'; render(); };
  }

  function renderWrongBook() {
    const progress = Storage.load();
    const wrongs = progress.wrongQuestions;

    app.innerHTML = `
      <button class="back-btn" id="btn-back">← 返回</button>
      <header class="page-header">
        <h2 class="page-title" style="font-size:22px;">📋 错题本</h2>
      </header>
      ${wrongs.length === 0 ? `
        <div class="empty-state">
          <div class="emoji">🎉</div>
          <p>没有错题，你真棒！</p>
        </div>
      ` : `<ul class="wrong-list">${wrongs.map((w) => `
        <li class="wrong-item">
          <span class="subject-tag">${w.subject === 'chinese' ? '语文' : '数学'}</span>
          <div>${w.char ? '【' + w.char + '】' : ''}${w.question}</div>
          ${w.hint ? `<div style="color:#b0bec5;margin-top:4px;">${w.hint}</div>` : ''}
          ${w.answer !== undefined ? `<p style="color:#ffd54f;margin-top:4px;">答案：${w.answer}</p>` : ''}
          <button class="btn btn-success" style="margin-top:8px;width:100%;" data-remove="${w.id}">我会了 ✓</button>
        </li>
      `).join('')}</ul>`}
    `;

    document.getElementById('btn-back').onclick = () => { currentView = 'home'; render(); };
    app.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.onclick = () => {
        Storage.removeWrong(btn.dataset.remove);
        showToast('已移出错题本');
        render();
      };
    });
  }

  function renderReport() {
    const { data, days } = Storage.getWeeklyReport();
    const today = data.dailyStats[Storage.today()] || { minutes: 0, chinese: { correct: 0, total: 0 }, math: { correct: 0, total: 0 } };
    const level = Storage.getLevel(data.stars, config.levels);

    const weekMinutes = days.reduce((s, d) => s + (d.stats?.minutes || 0), 0);
    const weekChinese = days.reduce((s, d) => s + (d.stats?.chinese?.correct || 0), 0);
    const weekMath = days.reduce((s, d) => s + (d.stats?.math?.correct || 0), 0);

    app.innerHTML = `
      <button class="back-btn" id="btn-back">← 返回首页</button>
      <header class="page-header">
        <h2 class="page-title" style="font-size:22px;">👨‍👩‍👦 家长报告</h2>
      </header>

      <div class="report-section">
        <h4>今日学习</h4>
        <div class="report-row"><span>学习时长</span><span>${today.minutes} 分钟</span></div>
        <div class="report-row"><span>语文正确</span><span>${today.chinese?.correct || 0} / ${today.chinese?.total || 0}</span></div>
        <div class="report-row"><span>数学正确</span><span>${today.math?.correct || 0} / ${today.math?.total || 0}</span></div>
        <div class="report-row"><span>今日打卡</span><span>${Storage.isCheckedInToday() ? '✅ 已完成' : '⏳ 未完成'}</span></div>
      </div>

      <div class="report-section">
        <h4>本周汇总</h4>
        <div class="report-row"><span>总学习时长</span><span>${weekMinutes} 分钟</span></div>
        <div class="report-row"><span>语文答对</span><span>${weekChinese} 题</span></div>
        <div class="report-row"><span>数学答对</span><span>${weekMath} 题</span></div>
        <div class="report-row"><span>连续打卡</span><span>${data.streak} 天</span></div>
      </div>

      <div class="report-section">
        <h4>成长等级</h4>
        <div class="report-row"><span>当前等级</span><span>${level.icon} ${level.name}</span></div>
        <div class="report-row"><span>累计星星</span><span>⭐ ${data.stars}</span></div>
        <div class="report-row"><span>错题待复习</span><span>${data.wrongQuestions.length} 道</span></div>
      </div>

      <div class="report-section">
        <h4>近 7 天</h4>
        ${days.map((d) => `
          <div class="report-row">
            <span>${d.date.slice(5)} 周${d.label}</span>
            <span>${d.stats ? `${d.stats.minutes}分钟 · ${d.stats.checkedIn ? '✅' : '—'}` : '—'}</span>
          </div>
        `).join('')}
      </div>
    `;

    document.getElementById('btn-back').onclick = () => { currentView = 'home'; render(); };
  }

  function generateFallbackChinese() {
    const chars = [
      ['学', 'xué'], ['校', 'xiào'], ['园', 'yuán'], ['书', 'shū'], ['读', 'dú'],
      ['写', 'xiě'], ['字', 'zì'], ['词', 'cí'], ['春', 'chūn'], ['夏', 'xià'],
      ['秋', 'qiū'], ['冬', 'dōng'], ['东', 'dōng'], ['南', 'nán'], ['西', 'xī'],
      ['北', 'běi'], ['风', 'fēng'], ['雨', 'yǔ'], ['花', 'huā'], ['草', 'cǎo']
    ];
    const qs = [];
    let n = 1;
    for (const [ch, py] of chars) {
      const others = chars.filter((c) => c[1] !== py).map((c) => c[1]);
      const opts = [py, others[0], others[1], others[2]];
      qs.push({
        id: 'cn-f' + n++,
        type: 'choice',
        char: ch,
        question: '「' + ch + '」字的正确读音是？',
        options: opts,
        answer: 0,
        hint: '「' + ch + '」读 ' + py
      });
      qs.push({
        id: 'cn-f' + n++,
        type: 'judge',
        char: ch,
        question: '「' + ch + '」是二年级要求认识的汉字。',
        answer: true,
        hint: '答对了！'
      });
    }
    return qs;
  }

  document.addEventListener('DOMContentLoaded', init);
  return { init };
})();
