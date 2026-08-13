/* ============================================================
 * 逆天言论HUB 站点逻辑
 * 纯静态 GitHub Pages（无后端、无 Worker、无需登录）：
 *  - 图库：Git Trees + Contents API 列出/预览仓库图片
 *  - 上传：引导跳转到 GitHub 网页上传（用群友自己的 GitHub 账号）
 *  - 评论：只读展示仓库 Issue 评论，发言跳转 GitHub
 * ============================================================ */

// ============ 配置 ============
// 仓库信息
const REPO_OWNER = 'ChenRay-team';
const REPO_NAME = 'Outrageous-statement-Hub';
const DEFAULT_BRANCH = 'main';
// 评论用的隐藏 Issue 编号：先用 1，若仓库第一个 issue 不是评论专用，改成其它有效编号
const COMMENTS_ISSUE_NUMBER = 1;

const API = 'https://api.github.com';
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${DEFAULT_BRANCH}/`;

// 顶层目录名（人/合集分类），不在列表里的视为普通目录
const FOLDER_LABELS = {
  '@HereIsEunsia_': '@HereIsEunsia_',
  'angushushu': 'angushushu',
  'BushiAA': 'BushiAA',
  'lonelyxiya': 'lonelyxiya',
  'player233lol': 'player233lol',
  'xiaowei111': 'xiaowei111',
  '妈妈合集': '妈妈合集',
  '奶奶合集': '奶奶合集',
  '琼野': '琼野',
};

// ============ 状态 ============
let allImages = [];         // 全部图片路径
let dirNames = [];          // 顶层目录名
let currentDir = '';        // 当前浏览目录（'' = 根目录）
let visibleComments = [];   // 已加载的评论

// ============ DOM ============
const $ = (id) => document.getElementById(id);
const views = {
  gallery: $('view-gallery'),
  upload: $('view-upload'),
  comments: $('view-comments'),
};
const navBtns = {
  gallery: $('btn-gallery'),
  upload: $('btn-upload'),
  comments: $('btn-comments'),
};

// ============ 工具 ============
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('zh-CN', { hour12: false });
}

// ============ API 封装 ============
async function gh(path, opts = {}) {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(opts.headers || {}),
  };
  const res = await fetch(API + path, { ...opts, headers });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j.message || ''; } catch (e) {}
    throw new Error(`GitHub API ${res.status}: ${detail || res.statusText}`);
  }
  return res.json();
}

// ============ 图库（文件夹浏览） ============
async function loadGallery() {
  try {
    const tree = await gh(`/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${DEFAULT_BRANCH}?recursive=1`);
    const imgs = (tree.tree || []).filter(e => e.type === 'blob' && IMAGE_EXT.test(e.path));
    // 收集顶层目录名
    const dirs = new Set();
    imgs.forEach(e => { const p = e.path.split('/'); if (p.length > 1) dirs.add(p[0]); });
    dirNames = [...dirs].sort();
    populateDirs();

    allImages = imgs.map(e => e.path).sort();
    renderGallery();
  } catch (e) {
    $('gallery-empty').classList.remove('hidden');
    $('gallery-empty').textContent = '加载失败：' + e.message;
  }
}

function populateDirs() {
  const sel = $('upload-dir');
  sel.innerHTML = '<option value="">根目录（表情包 / 群友集体发言）</option>';
  dirNames.forEach(d => {
    const o = document.createElement('option');
    o.value = d;
    o.textContent = FOLDER_LABELS[d] || d;
    sel.appendChild(o);
  });
}

// 判断 path 是否位于当前目录（currentDir 及其子目录）
function inCurrentDir(path) {
  if (!currentDir) return true;
  if (currentDir === '__root__') return !path.includes('/'); // 根目录图片
  return path === currentDir || path.startsWith(currentDir + '/');
}

// 给定一个在 currentDir 下的相对路径，取第一层条目
function relativeSeg(path) {
  if (currentDir === '__root__') return path;
  const p = currentDir ? path.slice(currentDir.length + 1) : path;
  return p.split('/')[0];
}

// 判断某条目是否为文件夹（当前目录下还有其他层级）
function isFolder(seg, under) {
  return allImages.some(p => inCurrentDir(p) && p.startsWith(under + '/') && p !== under);
}

function renderGallery() {
  const box = $('gallery');
  box.innerHTML = '';
  const q = $('search-input').value.trim().toLowerCase();
  const gifOnly = $('chk-gif-only').checked;
  const isRoot = !currentDir;

  if (isRoot) {
    // ===== 根目录：先显示文件夹 =====
    const dirList = [];
    dirNames.forEach(d => {
      if (q && !d.toLowerCase().includes(q)) return;
      dirList.push(d);
    });
    dirList.sort().forEach(d => {
      const cnt = allImages.filter(p => p === d || p.startsWith(d + '/')).length;
      const card = document.createElement('div');
      card.className = 'folder-card';
      card.innerHTML = `
        <div class="folder-name">${esc(FOLDER_LABELS[d] || d)}</div>
        <div class="folder-count">${cnt} 张图片</div>`;
      card.addEventListener('click', () => navigateDir(d));
      box.appendChild(card);
    });
    // 根目录自己的图片（表情包 / 集体发言）单独作为一个入口
    const rootFiles = allImages.filter(p => !p.includes('/'));
    if (rootFiles.length && (!q || q === '' || '根目录'.includes(q))) {
      const card = document.createElement('div');
      card.className = 'folder-card';
      card.innerHTML = `
        <div class="folder-name">表情包 / 集体发言</div>
        <div class="folder-count">${rootFiles.length} 张图片</div>`;
      card.addEventListener('click', () => navigateDir('__root__'));
      box.appendChild(card);
    }
    $('gallery-empty').classList.toggle('hidden', dirList.length + (rootFiles.length ? 1 : 0) > 0);
    $('gallery-empty').textContent = '仓库里还没有图片，去传一张吧～';
    renderBreadcrumb();
    return;
  }

  // ===== 子目录：文件夹 + 图片 =====
  const folders = new Set();
  const files = [];
  allImages.forEach(path => {
    if (!inCurrentDir(path)) return;
    const seg = relativeSeg(path);
    if (isFolder(seg, currentDir + '/' + seg)) {
      folders.add(seg);
    } else {
      files.push(path);
    }
  });

  // 搜索过滤
  let f = [...folders];
  let im = files;
  if (q) {
    f = f.filter(x => x.toLowerCase().includes(q));
    im = im.filter(p => p.toLowerCase().includes(q));
  }
  if (gifOnly) im = im.filter(p => /\.gif$/i.test(p));

  f.sort().forEach(seg => {
    const full = currentDir + '/' + seg;
    const cnt = allImages.filter(p => p === full || p.startsWith(full + '/')).length;
    const card = document.createElement('div');
    card.className = 'folder-card';
    card.innerHTML = `
      <div class="folder-name">${esc(seg)}</div>
      <div class="folder-count">${cnt} 张图片</div>`;
    card.addEventListener('click', () => navigateDir(full));
    box.appendChild(card);
  });

  im.forEach(path => {
    const name = path.split('/').pop();
    const card = document.createElement('div');
    card.className = 'card-item';
    card.innerHTML = `
      <img class="card-media" loading="lazy" src="${RAW_BASE}${encodeURIComponent(path)}" alt="${esc(name)}" />
      <div class="card-info">
        <div class="card-name" title="${esc(path)}">${esc(name)}</div>
      </div>`;
    card.querySelector('.card-media').addEventListener('click', () => openLightbox(RAW_BASE + encodeURIComponent(path), path));
    box.appendChild(card);
  });

  $('gallery-empty').classList.toggle('hidden', f.length + im.length > 0);
  $('gallery-empty').textContent = '这个目录里没有内容～';
  renderBreadcrumb();
}

// 进入 / 返回目录
function navigateDir(dir) {
  currentDir = dir;
  renderGallery();
}

// 面包屑
function renderBreadcrumb() {
  const nav = $('breadcrumb');
  nav.innerHTML = '';
  const isRootSpecial = currentDir === '__root__';
  const segs = isRootSpecial ? [] : currentDir ? currentDir.split('/') : [];
  // 根目录
  const root = document.createElement('button');
  root.className = 'crumb' + (segs.length === 0 ? ' active' : '');
  root.textContent = '根目录';
  root.dataset.path = '';
  root.addEventListener('click', () => navigateDir(''));
  nav.appendChild(root);

  if (isRootSpecial) {
    const sep = document.createElement('span');
    sep.className = 'crumb-sep';
    sep.textContent = '/';
    nav.appendChild(sep);
    const c = document.createElement('button');
    c.className = 'crumb active';
    c.textContent = '表情包 / 集体发言';
    c.addEventListener('click', () => navigateDir('__root__'));
    nav.appendChild(c);
    $('dir-count').textContent = allImages.filter(p => !p.includes('/')).length + ' 张';
    return;
  }

  // 各级
  let acc = '';
  segs.forEach((s, i) => {
    acc = acc ? acc + '/' + s : s;
    const sep = document.createElement('span');
    sep.className = 'crumb-sep';
    sep.textContent = '/';
    nav.appendChild(sep);
    const c = document.createElement('button');
    c.className = 'crumb' + (i === segs.length - 1 ? ' active' : '');
    c.textContent = FOLDER_LABELS[acc] || s;
    c.dataset.path = acc;
    c.addEventListener('click', () => navigateDir(acc));
    nav.appendChild(c);
  });
  $('dir-count').textContent = allImages.filter(p => inCurrentDir(p)).length + ' 张';
}

function openLightbox(src, alt) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  const img = document.createElement('img');
  img.src = src; img.alt = alt;
  lb.appendChild(img);
  lb.addEventListener('click', () => lb.remove());
  document.body.appendChild(lb);
}

// ============ 上传（跳转 GitHub 网页上传） ============
function buildPath() {
  let dir = $('upload-dir').value;
  const custom = $('upload-dir-custom').value.trim();
  if (custom) dir = custom;
  const file = $('upload-file').files[0];
  let name = $('upload-name').value.trim();
  if (!name && file) name = file.name;
  if (!name) throw new Error('请填写文件名');
  if (!/\.(png|jpe?g|gif|webp)$/i.test(name)) {
    throw new Error('只支持 png / jpg / gif / webp 图片');
  }
  return dir ? `${dir}/${name}` : name;
}

// 打开 GitHub 网页上传页（跳到选定目录）
function submitImage() {
  const file = $('upload-file').files[0];
  if (!file) { setMsg('upload-msg', '请先选择一张图片', 'err'); return; }

  let dir = $('upload-dir').value;
  const custom = $('upload-dir-custom').value.trim();
  if (custom) dir = custom;

  // 拼 GitHub 网页上传地址（可直接拖文件进去）
  const uploadBase = `https://github.com/${REPO_OWNER}/${REPO_NAME}/upload/${DEFAULT_BRANCH}`;
  const url = dir ? `${uploadBase}/${encodeURIComponent(dir)}` : uploadBase;
  window.open(url, '_blank');
  setMsg('upload-msg', '已打开 GitHub 上传页面。把你选好的图片拖进去，写个简短的文件名，点 Commit changes 即可。管理员会审核并合入主分支。', 'ok');
}

// ============ 评论 ============
async function loadComments() {
  try {
    const data = await gh(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${COMMENTS_ISSUE_NUMBER}/comments?per_page=100&sort=created&direction=desc`);
    visibleComments = data;
    renderComments();
  } catch (e) {
    setMsg('comment-msg', '加载评论失败：' + e.message, 'err');
  }
}

function renderComments() {
  const box = $('comments-list');
  box.innerHTML = '';
  if (!visibleComments.length) {
    box.innerHTML = '<p class="hint">还没有评论，来抢沙发！</p>';
    return;
  }
  visibleComments.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment';
    // 解析正文开头的 **昵称**： 格式
    let author = c.user.login;
    let body = c.body || '';
    const m = body.match(/^\*\*(.+?)\*\*：?(.*)$/s);
    if (m && m[1].trim()) { author = m[1].trim(); body = m[2].trim(); }
    div.innerHTML = `
      <div class="comment-head">
        <img class="comment-avatar" src="${esc(c.user.avatar_url)}" alt="" />
        <span class="comment-author">${esc(author)}</span>
        <span class="comment-time">${fmtTime(c.created_at)}</span>
      </div>
      <div class="comment-body">${esc(body)}</div>`;
    box.appendChild(div);
  });
}

// 跳转到 GitHub 发言
function goComment() {
  const text = $('comment-input').value.trim();
  const name = $('comment-name').value.trim();
  const url = `https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/${COMMENTS_ISSUE_NUMBER}#new_comment_field`;
  window.open(url, '_blank');
  if (name || text) {
    setMsg('comment-msg', '已打开 GitHub 评论区，粘贴你的内容后发言即可。（本页内容建议复制过去）', 'ok');
  }
}

// ============ 页面切换 ============
function showView(name) {
  Object.keys(views).forEach(k => views[k].classList.toggle('hidden', k !== name));
  Object.keys(navBtns).forEach(k => navBtns[k].classList.toggle('active', k === name));
}

// ============ 初始化 ============
function init() {
  // 导航
  navBtns.gallery.addEventListener('click', () => showView('gallery'));
  navBtns.upload.addEventListener('click', () => showView('upload'));
  navBtns.comments.addEventListener('click', () => showView('comments'));
  // 图库
  $('search-input').addEventListener('input', renderGallery);
  $('chk-gif-only').addEventListener('change', renderGallery);
  // 上传
  $('btn-submit').addEventListener('click', submitImage);
  $('upload-file').addEventListener('change', () => {
    const f = $('upload-file').files[0];
    const pv = $('upload-preview');
    if (f) {
      $('upload-preview-img').src = URL.createObjectURL(f);
      pv.classList.remove('hidden');
      $('btn-submit').disabled = false;
    } else {
      pv.classList.add('hidden');
      $('btn-submit').disabled = true;
    }
  });
  $('upload-dir-custom').addEventListener('input', () => {
    // 自定义目录时选中它（display 用）
  });
  // 评论
  $('btn-comment-submit').addEventListener('click', goComment);

  loadGallery();
  loadComments();
}

// 工具函数 setMsg
function setMsg(id, text, type) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg' + (type ? ' ' + type : '');
}

document.addEventListener('DOMContentLoaded', init);
