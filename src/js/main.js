// src/js/main.js

const STORAGE_USERS = "cf2_users_v1";
const STORAGE_SESSION = "cf2_session_v1";
const STORAGE_POSTS = "cf2_posts_v1";

function loadUsers(){ return JSON.parse(localStorage.getItem(STORAGE_USERS) || "{}"); }
function saveUsers(u){ localStorage.setItem(STORAGE_USERS, JSON.stringify(u)); }
function setSession(username){ localStorage.setItem(STORAGE_SESSION, username); }
function getSession(){ return localStorage.getItem(STORAGE_SESSION); }
function clearSession(){ localStorage.removeItem(STORAGE_SESSION); }
function loadPosts(){ return JSON.parse(localStorage.getItem(STORAGE_POSTS) || "[]"); }
function savePosts(p){ localStorage.setItem(STORAGE_POSTS, JSON.stringify(p)); }

// Konverter fil til data URL (base64)
function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    if(!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = ()=> resolve(reader.result);
    reader.onerror = (e)=> reject(e);
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', ()=>{

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const newPostForm = document.getElementById('newPostForm');

  // safety-logout (sender alltid til public/index.html for Live Server)
  const basePublic = window.location.origin + '/public';
  const logoutBtn = document.getElementById('pf-logout');
  if (logoutBtn) {
    const newBtn = logoutBtn.cloneNode(true);
    logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = `${basePublic}/index.html`;
    });
  }

  if (loginForm){
    loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = loginForm.querySelector('input[name="email"]').value.trim();
      const password = loginForm.querySelector('input[name="password"]').value;
      const users = loadUsers();
      const foundKey = Object.keys(users).find(k => users[k].email === email);
      if (!foundKey){ loginForm.classList.add('was-validated'); alert('Fant ingen bruker med denne e-posten.'); return; }
      const user = users[foundKey];
      if (user.password !== password){ loginForm.classList.add('was-validated'); alert('Feil passord'); return; }
      setSession(user.username);
      window.location.href = "profile/index.html";
    });
  }

  if (registerForm){
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const username = registerForm.querySelector('input[name="username"]').value.trim();
      const email = registerForm.querySelector('input[name="email"]').value.trim();
      const password = registerForm.querySelector('input[name="password"]').value;
      if (!username || !email || password.length < 8){ registerForm.classList.add('was-validated'); alert('Fyll ut feltene og passord minst 8 tegn'); return; }
      const users = loadUsers();
      if (users[username] || Object.values(users).some(u=>u.email===email)){ alert('Bruker eller epost finnes allerede'); return; }

      // avatar fra registrering
      const avatarInput = registerForm.querySelector('input[name="avatar"]');
      let avatarData = null;
      if (avatarInput && avatarInput.files && avatarInput.files[0]){
        try {
          const file = avatarInput.files[0];
          const maxBytes = 1024 * 1024 * 1.5;
          if (file.size > maxBytes) {
            alert('Profilbildet er for stort. Velg et bilde under ca. 1.5 MB.');
            return;
          }
          avatarData = await fileToDataURL(file);
        } catch(err) {
          console.warn('Feil ved konvertering av bilde', err);
        }
      }

      users[username] = { username, email, password, followers:0, following:0, avatar: avatarData };
      saveUsers(users);
      setSession(username);
      window.location.href = "profile/index.html";
    });
  }

  if (location.pathname.endsWith('/profile/index.html') || location.href.endsWith('/public/profile/index.html') || location.href.endsWith('/profile/index.html')) {
    const username = getSession();
    if (!username){ window.location.href = "index.html"; return; }
    const users = loadUsers();
    const user = users[username];
    if (!user){ clearSession(); window.location.href = "index.html"; return; }

    // fyll profildata
    const avatarEl = document.getElementById('pf-avatar');
    if (avatarEl && user.avatar) avatarEl.src = user.avatar;

    document.getElementById('pf-username').textContent = user.username;
    document.getElementById('pf-handle').textContent = '@' + user.username;
    document.getElementById('pf-followers').textContent = user.followers || 0;
    document.getElementById('pf-following').textContent = user.following || 0;

    // avatar-endring på profilsiden
    const avatarInput = document.getElementById('pf-avatar-input');
    if (avatarInput){
      avatarInput.addEventListener('change', async (ev)=>{
        const file = ev.target.files[0];
        if (!file) return;
        const maxBytes = 1024 * 1024 * 1.5;
        if (file.size > maxBytes) { alert('Bildet er for stort (max ~1.5MB).'); return; }
        const data = await fileToDataURL(file);
        user.avatar = data;
        users[username] = user;
        saveUsers(users);
        const img = document.getElementById('pf-avatar');
        if (img) img.src = data;
      });
    }

    // vis brukerens innlegg
    const posts = loadPosts().filter(p=>p.author===username);
    const postsContainer = document.getElementById('pf-posts');
    if (postsContainer){
      postsContainer.innerHTML = '';
      posts.forEach(p=>{
        const col = document.createElement('article');
        col.className = 'col-6';
        const thumb = p.image ? `<img src="${p.image}" class="img-fluid mb-2" alt="">` : '';
        col.innerHTML = `<div class="card p-2">${thumb}<p class="mb-0">${escapeHtml(p.title || p.text)}</p></div>`;
        postsContainer.appendChild(col);
      });
    }
  }

  if (location.pathname.endsWith('/feed/index.html') || location.href.endsWith('/public/feed/index.html') || location.href.endsWith('/feed/index.html')){
    const sortSelect = document.getElementById('sortSelect');
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    let currentSort = (sortSelect && sortSelect.value) ? sortSelect.value : 'nyeste';
    let currentQuery = '';

    function renderFeed(){
      const listRoot = document.querySelector('.list-group');
      if (!listRoot) return;
      let posts = loadPosts().slice();

      // filtrer etter søketekst (tittel, tekst eller forfatter)
      if (currentQuery) {
        const q = currentQuery.toLowerCase();
        posts = posts.filter(p =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.text  || '').toLowerCase().includes(q) ||
          (p.author|| '').toLowerCase().includes(q)
        );
      }

      // sorterer etter valgt verdi
      if (currentSort === 'nyeste') {
        posts.sort((a,b) => b.created - a.created);
      } else if (currentSort === 'eldste') {
        posts.sort((a,b) => a.created - b.created);
      }

      // render innlegg
      listRoot.innerHTML = '';
      posts.forEach(p=>{
        const el = document.createElement('article');
        el.className = 'list-group-item list-group-item-action d-flex gap-3 py-3';
        const imgSrc = p.image || 'https://via.placeholder.com/72';
        el.innerHTML = `
          <img src="${imgSrc}" alt="" class="rounded post-thumbnail">
          <div class="d-flex w-100 justify-content-between">
            <div>
              <h6 class="mb-0">${escapeHtml(p.author)}</h6>
              <p class="mb-1">${escapeHtml(p.title || p.text)}</p>
              <small class="text-muted">${new Date(p.created).toLocaleString()}</small>
            </div>
          </div>
        `;
        listRoot.appendChild(el);
      });
    }

    // oppdater sorteringsvalg
    if (sortSelect) {
      sortSelect.addEventListener('change', (e)=>{
        currentSort = e.target.value;
        renderFeed();
      });
    }

    // søk i feeden (live-filtrering + submit)
    if (searchInput) {
      searchInput.addEventListener('input', (e)=>{
        currentQuery = e.target.value.trim();
        renderFeed();
      });
    }
    if (searchForm) {
      searchForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        currentQuery = (searchInput?.value || '').trim();
        renderFeed();
      });
    }

    // Håndter innsending av nytt innlegg inkludert thumbnail
    if (newPostForm){
      newPostForm.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const title = newPostForm.querySelector('input[name="title"]')?.value?.trim() || '';
        const text = newPostForm.querySelector('textarea[name="text"]')?.value?.trim() || '';

        const imageInput = newPostForm.querySelector('input[type="file"][name="image"]');
        let imageData = null;
        if (imageInput && imageInput.files && imageInput.files[0]) {
          const file = imageInput.files[0];
          const maxBytes = 1024 * 1024 * 1.5; // 1.5 MB
          if (file.size > maxBytes) {
            alert('Bildet er for stort. Velg et bilde under ca. 1.5 MB.');
            return;
          }
          try {
            imageData = await fileToDataURL(file);
          } catch(err) {
            console.warn('Feil ved lesing av bilde', err);
          }
        }

        if (!title && !text && !imageData){ alert('Skriv tittel, tekst eller legg ved et bilde.'); return; }
        const author = getSession() || 'Anonym';
        const posts = loadPosts();
        posts.push({ id: Date.now(), author, title, text, image: imageData, created: Date.now() });
        savePosts(posts);
        newPostForm.reset();
        renderFeed();
      });
    }

    // initial render
    renderFeed();
  }

}); // DOMContentLoaded

function escapeHtml(str){ if(!str) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
