const Storage = (() => {
  const KEY = 'xiaoao_progress';

  const defaultProgress = () => ({
    stars: 0,
    checkInDates: [],
    streak: 0,
    dailyStats: {},
    wrongQuestions: [],
    sessions: []
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultProgress();
      return { ...defaultProgress(), ...JSON.parse(raw) };
    } catch {
      return defaultProgress();
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function getLevel(stars, levels) {
    let current = levels[0];
    for (const level of levels) {
      if (stars >= level.minStars) current = level;
    }
    return current;
  }

  function ensureDaily(stats, date) {
    if (!stats.dailyStats[date]) {
      stats.dailyStats[date] = {
        minutes: 0,
        chinese: { correct: 0, total: 0 },
        math: { correct: 0, total: 0 },
        checkedIn: false
      };
    }
    return stats.dailyStats[date];
  }

  function addStars(amount) {
    const data = load();
    data.stars += amount;
    save(data);
    return data.stars;
  }

  function recordAnswer(subject, correct, questionMeta) {
    const data = load();
    const day = today();
    const daily = ensureDaily(data, day);

    daily[subject].total += 1;
    if (correct) {
      daily[subject].correct += 1;
    } else if (questionMeta) {
      const exists = data.wrongQuestions.some((q) => q.id === questionMeta.id);
      if (!exists) {
        data.wrongQuestions.unshift({
          ...questionMeta,
          wrongAt: new Date().toISOString(),
          retryCount: 0
        });
      }
      if (data.wrongQuestions.length > 100) {
        data.wrongQuestions = data.wrongQuestions.slice(0, 100);
      }
    }

    save(data);
    return data;
  }

  function removeWrong(id) {
    const data = load();
    data.wrongQuestions = data.wrongQuestions.filter((q) => q.id !== id);
    save(data);
  }

  function addStudyMinutes(minutes) {
    const data = load();
    const day = today();
    const daily = ensureDaily(data, day);
    daily.minutes += minutes;
    save(data);
  }

  function markCheckIn() {
    const data = load();
    const day = today();
    const daily = ensureDaily(data, day);

    if (!daily.checkedIn) {
      daily.checkedIn = true;
      if (!data.checkInDates.includes(day)) {
        data.checkInDates.push(day);
      }
      data.streak = calcStreak(data.checkInDates);
      save(data);
    }
    return data;
  }

  function calcStreak(dates) {
    if (!dates.length) return 0;
    const sorted = [...dates].sort().reverse();
    let streak = 0;
    let expect = today();

    for (const d of sorted) {
      if (d === expect) {
        streak += 1;
        const prev = new Date(expect);
        prev.setDate(prev.getDate() - 1);
        expect = prev.toISOString().slice(0, 10);
      } else if (streak === 0 && d === today()) {
        streak = 1;
        const prev = new Date(d);
        prev.setDate(prev.getDate() - 1);
        expect = prev.toISOString().slice(0, 10);
      } else {
        break;
      }
    }
    return streak;
  }

  function recordSession(type, score) {
    const data = load();
    data.sessions.unshift({
      type,
      score,
      date: new Date().toISOString()
    });
    if (data.sessions.length > 50) data.sessions = data.sessions.slice(0, 50);
    save(data);
  }

  function isCheckedInToday() {
    const data = load();
    const day = today();
    return data.dailyStats[day]?.checkedIn || false;
  }

  function getWeeklyReport() {
    const data = load();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        date: key,
        label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()],
        stats: data.dailyStats[key] || null
      });
    }
    return { data, days };
  }

  return {
    load,
    save,
    today,
    getLevel,
    addStars,
    recordAnswer,
    removeWrong,
    addStudyMinutes,
    markCheckIn,
    recordSession,
    isCheckedInToday,
    getWeeklyReport,
    calcStreak
  };
})();
