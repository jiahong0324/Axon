const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview_data.json'), 'utf8'));

const artifactPath = 'C:\\Users\\jiaho\\.gemini\\antigravity\\brain\\b1df4807-0094-4cd2-9274-45c35a96955c\\favicon_showcase.html';

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Axon Favicon 圆滑方案效果对比</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
</head>
<body class="bg-[#0B0F19] text-slate-100 antialiased p-4 md:p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div>
        <h1 class="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <span class="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></span>
          Axon Favicon 圆滑优化效果对比 (Google Style)
        </h1>
        <p class="text-xs md:text-sm text-slate-400 mt-1">告别生硬的黑方块直角，像 Google 一样圆润自然地融入浏览器标签页</p>
      </div>
      <div class="flex items-center gap-2 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
        <button id="btnDark" onclick="setTheme('dark')" class="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold transition-all">深色标签页</button>
        <button id="btnLight" onclick="setTheme('light')" class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all">浅色标签页</button>
      </div>
    </div>

    <!-- Problem Diagnosis Banner -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
        <div class="flex items-center gap-2 text-rose-400 font-bold text-sm mb-1">
          <span>❌ 优化前 (您截图里的问题)</span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">favicon 指向了带纯黑底色的 1254px 方形底图，在灰色的 Chrome 深色标签页上会显示出<b>生硬的 90 度黑方块死角</b>，显得突兀。</p>
      </div>
      <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm mb-1">
          <span>✅ 优化后 (Google 同款设计原理)</span>
        </div>
        <p class="text-xs text-slate-300 leading-relaxed">将四角完全做成<b>透明通道 (Alpha 0)</b>，底板采用<b>亚像素抗锯齿正圆</b>，中间优雅放置渐变 Logo，无论在何种背景上都是极致圆润。</p>
      </div>
    </div>

    <!-- 4 Scheme Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

      <!-- Option 1: Google Style (Recommended) -->
      <div class="p-5 rounded-2xl bg-slate-900/80 border-2 border-blue-500/60 shadow-xl relative overflow-hidden group hover:border-blue-400 transition-all">
        <div class="absolute top-3 right-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
          🌟 推荐·与 Google 质感一致
        </div>
        <h3 class="text-base font-bold text-white">方案 1：Google 同款纯白圆底徽标</h3>
        <p class="text-xs text-slate-400 mt-1 mb-4">完美复刻 Google 标签页圆形徽章，白底高反差，在深浅标签栏上均极度清晰圆润。</p>
        <!-- Tab Mockup -->
        <div class="tab-bar p-3 rounded-xl transition-colors duration-200 bg-[#292A2D]">
          <div class="flex items-center gap-2.5 bg-[#202124] tab-item px-3 py-2 rounded-t-xl border-t border-x border-white/5 shadow-sm">
            <img src="${data.opt1}" class="h-4 w-4 shrink-0 rounded-full shadow-sm" alt="Option 1">
            <span class="text-xs font-medium text-slate-200 tab-text truncate">Health | Axon</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
          <span>底座：纯白圆形 (White Circle)</span>
          <span class="text-emerald-400 font-semibold">已预先配置并支持一键应用</span>
        </div>
      </div>

      <!-- Option 2: Axon Dark Space Navy Circle -->
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 transition-all">
        <div class="absolute top-3 right-3 text-slate-400 text-[11px] font-medium">
          深邃科技感
        </div>
        <h3 class="text-base font-bold text-white">方案 2：Axon 深空深蓝微光圆盘</h3>
        <p class="text-xs text-slate-400 mt-1 mb-4">深色圆形底盘 + 蓝紫外发光圆环，四角完全透明，与 Axon 界面浑然一体且完全圆润。</p>
        <!-- Tab Mockup -->
        <div class="tab-bar p-3 rounded-xl transition-colors duration-200 bg-[#292A2D]">
          <div class="flex items-center gap-2.5 bg-[#202124] tab-item px-3 py-2 rounded-t-xl border-t border-x border-white/5 shadow-sm">
            <img src="${data.opt2}" class="h-4 w-4 shrink-0 rounded-full shadow-sm" alt="Option 2">
            <span class="text-xs font-medium text-slate-200 tab-text truncate">Health | Axon</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
          <span>底座：深蓝圆盘 + 霓虹微圈</span>
          <span>暗黑极客风</span>
        </div>
      </div>

      <!-- Option 3: Pure Transparent Logo -->
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 transition-all">
        <div class="absolute top-3 right-3 text-slate-400 text-[11px] font-medium">
          极简无框
        </div>
        <h3 class="text-base font-bold text-white">方案 3：极简纯透明浮空 Logo</h3>
        <p class="text-xs text-slate-400 mt-1 mb-4">完全去除任何底板框，背景 100% 透明，仅保留丝滑的 Axon 双斜向渐变线条自然悬浮。</p>
        <!-- Tab Mockup -->
        <div class="tab-bar p-3 rounded-xl transition-colors duration-200 bg-[#292A2D]">
          <div class="flex items-center gap-2.5 bg-[#202124] tab-item px-3 py-2 rounded-t-xl border-t border-x border-white/5 shadow-sm">
            <img src="${data.opt3}" class="h-4 w-4 shrink-0" alt="Option 3">
            <span class="text-xs font-medium text-slate-200 tab-text truncate">Health | Axon</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
          <span>底座：无 (全透明)</span>
          <span>极简优雅</span>
        </div>
      </div>

      <!-- Option 4: Squircle Superellipse -->
      <div class="p-5 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/40 transition-all">
        <div class="absolute top-3 right-3 text-slate-400 text-[11px] font-medium">
          苹果 App 风格
        </div>
        <h3 class="text-base font-bold text-white">方案 4：iOS 仿 Squircle 超大圆角</h3>
        <p class="text-xs text-slate-400 mt-1 mb-4">采用 28% 超椭圆平滑大圆角（类似 Apple 风格），四边弧度顺畅过渡，无死角。</p>
        <!-- Tab Mockup -->
        <div class="tab-bar p-3 rounded-xl transition-colors duration-200 bg-[#292A2D]">
          <div class="flex items-center gap-2.5 bg-[#202124] tab-item px-3 py-2 rounded-t-xl border-t border-x border-white/5 shadow-sm">
            <img src="${data.opt4}" class="h-4 w-4 shrink-0" alt="Option 4">
            <span class="text-xs font-medium text-slate-200 tab-text truncate">Health | Axon</span>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/5">
          <span>底座：超椭圆平滑角</span>
          <span>类 App 质感</span>
        </div>
      </div>

    </div>

    <!-- Magnified Detail Comparison -->
    <div class="p-5 rounded-2xl bg-slate-900/90 border border-white/10">
      <h4 class="text-sm font-bold text-white mb-3">🔍 高倍放大细节展示 (128x128 像素渲染)</h4>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col items-center gap-2">
          <img src="${data.opt1}" class="h-16 w-16 drop-shadow-md rounded-full" alt="Opt 1">
          <span class="text-xs font-bold text-white">方案 1 (Google 白圆)</span>
          <span class="text-[11px] text-blue-400">最推荐</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col items-center gap-2">
          <img src="${data.opt2}" class="h-16 w-16 drop-shadow-md rounded-full" alt="Opt 2">
          <span class="text-xs font-bold text-white">方案 2 (深空圆盘)</span>
          <span class="text-[11px] text-slate-400">科技蓝光圈</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col items-center gap-2">
          <img src="${data.opt3}" class="h-16 w-16 drop-shadow-md" alt="Opt 3">
          <span class="text-xs font-bold text-white">方案 3 (透明浮空)</span>
          <span class="text-[11px] text-slate-400">纯线条悬浮</span>
        </div>
        <div class="p-4 rounded-xl bg-slate-950/80 border border-white/5 flex flex-col items-center gap-2">
          <img src="${data.opt4}" class="h-16 w-16 drop-shadow-md" alt="Opt 4">
          <span class="text-xs font-bold text-white">方案 4 (圆滑方圆)</span>
          <span class="text-[11px] text-slate-400">iOS Squircle</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    function setTheme(theme) {
      const isDark = theme === 'dark';
      document.getElementById('btnDark').className = isDark ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold transition-all' : 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all';
      document.getElementById('btnLight').className = !isDark ? 'px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold transition-all' : 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition-all';
      
      document.querySelectorAll('.tab-bar').forEach(el => {
        el.style.backgroundColor = isDark ? '#292A2D' : '#DFE1E5';
      });
      document.querySelectorAll('.tab-item').forEach(el => {
        el.style.backgroundColor = isDark ? '#202124' : '#FFFFFF';
      });
      document.querySelectorAll('.tab-text').forEach(el => {
        el.style.color = isDark ? '#E8EAED' : '#3C4043';
      });
    }
  </script>
</body>
</html>`;

fs.writeFileSync(artifactPath, html);
console.log('Artifact created at:', artifactPath);
