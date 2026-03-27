// =====================
// CONFIGURATION
// =====================
const MASTER_PASSWORD = 'loloretetedu9898.9393.93';

// ─────────────────────────────────────────────────────────────
// JSONBin.io — stockage cloud GRATUIT, partagé entre tous
// ÉTAPES DE CONFIGURATION :
//  1. Va sur https://jsonbin.io → crée un compte gratuit
//  2. Clique "Create a Bin" → colle ce JSON :
//     {"subjects":{},"quizzes":[],"revisions":[],"passwords":[]}
//  3. Note le BIN ID (ex: 6651f2b3acd3cb34a83e1234)
//  4. Va dans "API Keys" → copie ta Master Key
//  5. Remplis les deux constantes ci-dessous
// ─────────────────────────────────────────────────────────────
const JSONBIN_BIN_ID     = '69c62843aa77b81da924ad32';      // ex: 6651f2b3acd3cb34a83e1234
const JSONBIN_MASTER_KEY = '$2a$10$aIZWob02zNrGqoCP/BVO/.EINOG90E3nzDgFX2XjJMGz/QhDmKjP2';   // ex: $2a$10$AbCdEf...
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// =====================
// ÉTAT
// =====================
let isLoggedIn   = false;
let currentClass   = null;
let currentSubject = null;

let subjects              = {};
let currentQuizzes        = [];
let currentRevisionSheets = [];
let professorPasswords    = [];

let currentQuestionsBeingCreated = [];
let currentPlayingQuiz   = null;
let currentQuestionIndex = 0;
let userAnswers   = [];
let quizToDelete  = null;
let subjectToDelete = null;

// =====================
// UTILITAIRES
// =====================
function getClassName(key) {
    return { '6eme': '6ème', '5eme': '5ème', '4eme': '4ème', '3eme': '3ème' }[key] || key;
}
function escapeHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function openModal(id)  { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function showLoading(msg='Chargement…') {
    document.getElementById('loadingMsg').textContent = msg;
    document.getElementById('loadingOverlay').style.display = 'flex';
}
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// =====================
// NAVIGATION
// =====================
const pages = {
    home:     document.getElementById('homePage'),
    subjects: document.getElementById('subjectsPage'),
    subject:  document.getElementById('subjectPage'),
    quizzes:  document.getElementById('quizzesPage'),
    revision: document.getElementById('revisionPage'),
};
function showPage(name) {
    Object.values(pages).forEach(p => p.style.display = 'none');
    pages[name].style.display = 'block';
    updateProfButtons();
    updateLoginBtns();
}

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    showPage('home');
    await loadData();
});

// =====================
// BIND EVENTS
// =====================
function bindEvents() {
    document.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => {
            currentClass = card.dataset.class;
            document.getElementById('currentClassLabel').textContent = getClassName(currentClass);
            displaySubjects();
            showPage('subjects');
        });
    });

    document.getElementById('backToHomeBtn').addEventListener('click', () => showPage('home'));
    document.getElementById('backToSubjectsBtn').addEventListener('click', () => { displaySubjects(); showPage('subjects'); });
    document.getElementById('backToSubjectBtn').addEventListener('click',  () => showPage('subject'));
    document.getElementById('backToSubjectBtn2').addEventListener('click', () => showPage('subject'));

    document.querySelectorAll('.content-card').forEach(card => {
        card.addEventListener('click', () => {
            if (card.dataset.type === 'quiz') {
                document.getElementById('quizPageSubjectLabel').textContent = currentSubject;
                displayQuizzes(); showPage('quizzes');
            } else {
                document.getElementById('revisionPageSubjectLabel').textContent = currentSubject;
                displayRevisionSheets(); showPage('revision');
            }
        });
    });

    document.querySelectorAll('[id^="loginBtn"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isLoggedIn) { logout(); }
            else { openModal('loginModal'); setTimeout(() => document.getElementById('password').focus(), 100); }
        });
    });
    document.getElementById('closeLoginModal').addEventListener('click', () => closeModal('loginModal'));
    document.getElementById('loginSubmitBtn').addEventListener('click', handleLogin);
    document.getElementById('password').addEventListener('keydown', e => { if (e.key==='Enter') handleLogin(); });

    document.getElementById('managePasswordsBtn').addEventListener('click', () => { displayPasswordsList(); openModal('managePasswordsModal'); });
    document.getElementById('closeManagePasswordsModal').addEventListener('click', () => closeModal('managePasswordsModal'));
    document.getElementById('addPasswordBtn').addEventListener('click', handleAddPassword);

    document.getElementById('createSubjectBtn').addEventListener('click', () => {
        document.getElementById('newSubjectClass').value = '';
        document.getElementById('newSubjectName').value  = '';
        openModal('createSubjectModal');
    });
    document.getElementById('closeCreateSubjectModal').addEventListener('click', () => closeModal('createSubjectModal'));
    document.getElementById('saveSubjectBtn').addEventListener('click', handleCreateSubject);
    document.getElementById('confirmDeleteSubjectBtn').addEventListener('click', handleConfirmDeleteSubject);
    document.getElementById('cancelDeleteSubjectBtn').addEventListener('click',  () => closeModal('deleteSubjectModal'));

    document.getElementById('createQuizBtn').addEventListener('click', () => {
        currentQuestionsBeingCreated = [];
        document.getElementById('quizClass').value = currentClass || '';
        populateSubjectSelect('quizClass', 'quizSubject');
        if (currentSubject) document.getElementById('quizSubject').value = currentSubject;
        addNewQuestion();
        openModal('quizCreationModal');
    });
    document.getElementById('closeQuizCreationModal').addEventListener('click', () => closeModal('quizCreationModal'));
    document.getElementById('cancelQuizBtn').addEventListener('click', () => closeModal('quizCreationModal'));
    document.getElementById('addQuestionBtn').addEventListener('click', () => { saveCurrentQuestions(); addNewQuestion(); });
    document.getElementById('finishQuizBtn').addEventListener('click', handleFinishQuiz);
    document.getElementById('closeQuizNameModal').addEventListener('click', () => closeModal('quizNameModal'));
    document.getElementById('saveQuizNameBtn').addEventListener('click', handleCreateQuiz);
    document.getElementById('quizClass').addEventListener('change', () => populateSubjectSelect('quizClass', 'quizSubject'));

    document.getElementById('createRevisionBtn').addEventListener('click', () => {
        document.getElementById('revisionTitle').value = '';
        document.getElementById('revisionFile').value  = '';
        document.getElementById('revisionClass').value = currentClass || '';
        populateSubjectSelect('revisionClass', 'revisionSubject');
        if (currentSubject) document.getElementById('revisionSubject').value = currentSubject;
        openModal('revisionCreationModal');
    });
    document.getElementById('closeRevisionCreationModal').addEventListener('click', () => closeModal('revisionCreationModal'));
    document.getElementById('saveRevisionBtn').addEventListener('click', handleCreateRevision);
    document.getElementById('revisionClass').addEventListener('change', () => populateSubjectSelect('revisionClass', 'revisionSubject'));

    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);
    document.getElementById('cancelDeleteBtn').addEventListener('click',   () => closeModal('deleteQuizModal'));
    document.getElementById('closePlayQuizModal').addEventListener('click', () => closeModal('playQuizModal'));
    document.getElementById('nextBtn').addEventListener('click', handleNextQuestion);
    document.getElementById('closeResultsModal').addEventListener('click', () => closeModal('resultsModal'));
    document.getElementById('retryBtn').addEventListener('click', () => { closeModal('resultsModal'); showPage('home'); });

    window.addEventListener('click', e => {
        ['loginModal','managePasswordsModal','createSubjectModal','deleteSubjectModal',
         'quizCreationModal','quizNameModal','revisionCreationModal',
         'deleteQuizModal','playQuizModal','resultsModal'].forEach(id => {
            if (e.target === document.getElementById(id)) closeModal(id);
        });
    });
}

// =====================
// CONNEXION
// =====================
function handleLogin() {
    const pwd = document.getElementById('password').value;
    const err = document.getElementById('loginError');
    if (pwd === MASTER_PASSWORD || professorPasswords.includes(pwd)) {
        isLoggedIn = true;
        closeModal('loginModal');
        document.getElementById('password').value = '';
        err.textContent = ''; err.classList.remove('show');
        updateProfButtons(); updateLoginBtns(); refreshCurrentPage();
    } else {
        err.textContent = 'Mot de passe incorrect';
        err.classList.add('show');
    }
}
function logout() { isLoggedIn = false; updateProfButtons(); updateLoginBtns(); refreshCurrentPage(); }
function updateLoginBtns() {
    document.querySelectorAll('[id^="loginBtn"]').forEach(btn => {
        btn.textContent = isLoggedIn ? 'Déconnexion' : 'Se connecter en prof';
    });
}
function updateProfButtons() {
    const show = isLoggedIn ? 'flex' : 'none';
    ['createSubjectBtn','createQuizBtn','createRevisionBtn','managePasswordsBtn'].forEach(id => {
        document.getElementById(id).style.display = show;
    });
}
function refreshCurrentPage() {
    const visible = Object.entries(pages).find(([,el]) => el.style.display !== 'none');
    if (!visible) return;
    const name = visible[0];
    if (name === 'subjects') displaySubjects();
    else if (name === 'quizzes')  displayQuizzes();
    else if (name === 'revision') displayRevisionSheets();
}

// =====================
// MOTS DE PASSE
// =====================
async function handleAddPassword() {
    const val = document.getElementById('newPassword').value.trim();
    if (!val) return alert('Veuillez entrer un mot de passe');
    if (professorPasswords.includes(val)) return alert('Ce mot de passe existe déjà');
    professorPasswords.push(val);
    await saveData();
    document.getElementById('newPassword').value = '';
    displayPasswordsList();
}
function displayPasswordsList() {
    const list = document.getElementById('passwordsList');
    if (!professorPasswords.length) {
        list.innerHTML = '<p style="color:#999;font-size:14px;">Aucun mot de passe supplémentaire</p>'; return;
    }
    list.innerHTML = professorPasswords.map((pwd,i) => `
        <div class="password-item">
            <span class="password-item-text">${escapeHtml(pwd)}</span>
            <button class="password-item-delete" onclick="deletePassword(${i})">Supprimer</button>
        </div>`).join('');
}
window.deletePassword = async function(i) {
    if (confirm('Supprimer ce mot de passe ?')) {
        professorPasswords.splice(i,1); await saveData(); displayPasswordsList();
    }
};

// =====================
// MATIÈRES
// =====================
function getSubjectsForClass(classKey) { return subjects[classKey] || []; }

function displaySubjects() {
    const grid  = document.getElementById('subjectsGrid');
    const noMsg = document.getElementById('noSubjectsMsg');
    const list  = getSubjectsForClass(currentClass);
    if (!list.length) { grid.innerHTML = ''; noMsg.style.display = 'block'; return; }
    noMsg.style.display = 'none';
    grid.innerHTML = list.map(subject => `
        <div class="subject-card" onclick="selectSubject('${escapeHtml(subject)}')">
            ${isLoggedIn ? `<button class="subject-delete-btn" onclick="deleteSubjectPrompt('${escapeHtml(subject)}',event)">🗑️</button>` : ''}
            <h3>${escapeHtml(subject)}</h3>
            <p>Matière de ${getClassName(currentClass)}</p>
        </div>`).join('');
}
window.selectSubject = function(subject) {
    currentSubject = subject;
    document.getElementById('currentSubjectLabel').textContent = subject;
    document.getElementById('currentClassLabel2').textContent  = getClassName(currentClass);
    showPage('subject');
};
async function handleCreateSubject() {
    const cls  = document.getElementById('newSubjectClass').value;
    const name = document.getElementById('newSubjectName').value.trim();
    if (!cls)  return alert('Veuillez choisir une classe');
    if (!name) return alert('Veuillez entrer un nom de matière');
    if (!subjects[cls]) subjects[cls] = [];
    if (subjects[cls].includes(name)) return alert('Cette matière existe déjà pour cette classe');
    subjects[cls].push(name);
    await saveData();
    closeModal('createSubjectModal');
    if (currentClass === cls) displaySubjects();
}
window.deleteSubjectPrompt = function(subject, e) {
    e.stopPropagation();
    subjectToDelete = { classKey: currentClass, subjectName: subject };
    document.getElementById('deleteSubjectMsg').textContent =
        `Supprimer "${subject}" de la classe ${getClassName(currentClass)} ? Tous les quiz et fiches associés seront aussi supprimés.`;
    openModal('deleteSubjectModal');
};
async function handleConfirmDeleteSubject() {
    if (!subjectToDelete) return;
    const { classKey, subjectName } = subjectToDelete;
    subjects[classKey]    = (subjects[classKey]||[]).filter(s => s !== subjectName);
    currentQuizzes        = currentQuizzes.filter(q => !(q.classLevel===classKey && q.subject===subjectName));
    currentRevisionSheets = currentRevisionSheets.filter(r => !(r.classLevel===classKey && r.subject===subjectName));
    await saveData();
    subjectToDelete = null;
    closeModal('deleteSubjectModal');
    displaySubjects();
}
function populateSubjectSelect(classSelectId, subjectSelectId) {
    const cls = document.getElementById(classSelectId).value;
    const sel = document.getElementById(subjectSelectId);
    sel.innerHTML = '<option value="">Choisir une matière</option>';
    if (cls && subjects[cls]) subjects[cls].forEach(s => {
        const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o);
    });
}

// =====================
// QUIZ – AFFICHAGE
// =====================
function displayQuizzes() {
    const container = document.getElementById('quizzesContainer');
    const list = currentQuizzes.filter(q => q.classLevel===currentClass && q.subject===currentSubject);
    if (!list.length) { container.innerHTML = '<p style="color:rgba(255,255,255,0.8);">Aucun quiz pour le moment</p>'; return; }
    container.innerHTML = list.map(quiz => `
        <div class="quiz-card ${isLoggedIn?'prof-mode':''}" onclick="startQuiz(${quiz.id})">
            ${isLoggedIn ? `<button class="quiz-card-delete" onclick="deleteQuizPrompt(${quiz.id},event)">🗑️</button>` : ''}
            <h3>${escapeHtml(quiz.name)}</h3>
            <p>${quiz.questions.length} question${quiz.questions.length>1?'s':''}</p>
        </div>`).join('');
}

// =====================
// QUIZ – CRÉATION
// =====================
function addNewQuestion() {
    currentQuestionsBeingCreated.push({ question:'', answers:['','','',''], correctAnswer:'A' });
    renderQuestions();
}
function renderQuestions() {
    document.getElementById('questionsContainer').innerHTML = currentQuestionsBeingCreated.map((q,i) => `
        <div class="question-box">
            <h4><span class="question-number">Question ${i+1}</span></h4>
            <div class="form-group"><label>Énoncé :</label>
                <input type="text" class="question-text" value="${escapeHtml(q.question)}" maxlength="200" placeholder="Entrez la question"></div>
            <div class="form-group"><label>Réponses :</label>
                <div class="answers-grid">
                    <input type="text" class="answer-input answer-A" value="${escapeHtml(q.answers[0])}" placeholder="Réponse A" maxlength="100">
                    <input type="text" class="answer-input answer-B" value="${escapeHtml(q.answers[1])}" placeholder="Réponse B" maxlength="100">
                    <input type="text" class="answer-input answer-C" value="${escapeHtml(q.answers[2])}" placeholder="Réponse C" maxlength="100">
                    <input type="text" class="answer-input answer-D" value="${escapeHtml(q.answers[3])}" placeholder="Réponse D" maxlength="100">
                </div></div>
            <div class="form-group"><label>Bonne réponse :</label>
                <select class="correct-answer-select">
                    ${['A','B','C','D'].map(l=>`<option value="${l}" ${q.correctAnswer===l?'selected':''}>${l}</option>`).join('')}
                </select></div>
            ${currentQuestionsBeingCreated.length>1 ? `<button type="button" class="btn-remove-question" onclick="removeQuestion(${i})">Supprimer cette question</button>` : ''}
        </div>`).join('');
}
function saveCurrentQuestions() {
    document.querySelectorAll('.question-box').forEach((box,i) => {
        if (!currentQuestionsBeingCreated[i]) return;
        currentQuestionsBeingCreated[i].question      = box.querySelector('.question-text').value;
        currentQuestionsBeingCreated[i].answers[0]    = box.querySelector('.answer-A').value;
        currentQuestionsBeingCreated[i].answers[1]    = box.querySelector('.answer-B').value;
        currentQuestionsBeingCreated[i].answers[2]    = box.querySelector('.answer-C').value;
        currentQuestionsBeingCreated[i].answers[3]    = box.querySelector('.answer-D').value;
        currentQuestionsBeingCreated[i].correctAnswer = box.querySelector('.correct-answer-select').value;
    });
}
window.removeQuestion = function(i) { currentQuestionsBeingCreated.splice(i,1); renderQuestions(); };
function handleFinishQuiz() {
    saveCurrentQuestions();
    if (!currentQuestionsBeingCreated.length) return alert('Ajoutez au moins une question');
    if (!currentQuestionsBeingCreated.every(q => q.question.trim() && q.answers.every(a=>a.trim())))
        return alert('Veuillez remplir tous les champs de toutes les questions');
    const cls = document.getElementById('quizClass').value;
    const sub = document.getElementById('quizSubject').value;
    if (!cls||!sub) return alert('Veuillez choisir une classe et une matière');
    closeModal('quizCreationModal'); openModal('quizNameModal');
    setTimeout(() => document.getElementById('quizName').focus(), 100);
}
async function handleCreateQuiz() {
    const name = document.getElementById('quizName').value.trim();
    const cls  = document.getElementById('quizClass').value;
    const sub  = document.getElementById('quizSubject').value;
    if (!name) return alert('Entrez un nom pour le quiz');
    currentQuizzes.push({ id:Date.now(), name, classLevel:cls, subject:sub, questions:[...currentQuestionsBeingCreated] });
    await saveData();
    closeModal('quizNameModal');
    document.getElementById('quizName').value = '';
    currentQuestionsBeingCreated = [];
    document.getElementById('questionsContainer').innerHTML = '';
    if (currentClass===cls && currentSubject===sub) displayQuizzes();
}

// =====================
// QUIZ – SUPPRESSION
// =====================
window.deleteQuizPrompt = function(id,e) { e.stopPropagation(); quizToDelete=id; openModal('deleteQuizModal'); };
async function handleConfirmDelete() {
    currentQuizzes = currentQuizzes.filter(q => q.id!==quizToDelete);
    await saveData(); displayQuizzes(); closeModal('deleteQuizModal'); quizToDelete=null;
}

// =====================
// QUIZ – JEU
// =====================
window.startQuiz = function(id) {
    const quiz = currentQuizzes.find(q => q.id===id);
    if (!quiz) return;
    currentPlayingQuiz=quiz; currentQuestionIndex=0;
    userAnswers=new Array(quiz.questions.length).fill(null);
    openModal('playQuizModal'); displayQuestion();
};
function displayQuestion() {
    const quiz=currentPlayingQuiz, q=quiz.questions[currentQuestionIndex];
    document.getElementById('quizTitle').textContent = quiz.name;
    document.getElementById('questionCount').textContent = `Question ${currentQuestionIndex+1} sur ${quiz.questions.length}`;
    document.getElementById('progressFill').style.width = ((currentQuestionIndex+1)/quiz.questions.length*100)+'%';
    document.getElementById('questionContainer').innerHTML = `
        <h3>${escapeHtml(q.question)}</h3>
        <div class="answers-options">
            ${['A','B','C','D'].map((l,i) => `
                <div class="answer-option ${userAnswers[currentQuestionIndex]===l?'selected':''}"
                     data-answer="${l}" onclick="selectAnswer('${l}')">
                    <strong>${l} :</strong> ${escapeHtml(q.answers[i])}
                </div>`).join('')}
        </div>`;
    document.getElementById('nextBtn').textContent = currentQuestionIndex===quiz.questions.length-1 ? 'Terminer' : 'Suivant';
}
window.selectAnswer = function(letter) {
    userAnswers[currentQuestionIndex]=letter;
    document.querySelectorAll('.answer-option').forEach(opt => opt.classList.toggle('selected', opt.dataset.answer===letter));
};
function handleNextQuestion() {
    if (!userAnswers[currentQuestionIndex]) return alert('Veuillez sélectionner une réponse');
    if (currentQuestionIndex===currentPlayingQuiz.questions.length-1) showResults();
    else { currentQuestionIndex++; displayQuestion(); }
}
function showResults() {
    const correct = currentPlayingQuiz.questions.filter((q,i) => userAnswers[i]===q.correctAnswer).length;
    const total   = currentPlayingQuiz.questions.length;
    document.getElementById('scoreText').innerHTML = `<strong>${correct}/${total} bonnes réponses</strong><br>Score : ${Math.round(correct/total*100)}%`;
    closeModal('playQuizModal'); openModal('resultsModal');
}

// =====================
// FICHES DE RÉVISION
// =====================
function displayRevisionSheets() {
    const container = document.getElementById('revisionContainer');
    const list = currentRevisionSheets.filter(r => r.classLevel===currentClass && r.subject===currentSubject);
    if (!list.length) { container.innerHTML = '<p style="color:rgba(255,255,255,0.8);">Aucune fiche pour le moment</p>'; return; }
    container.innerHTML = list.map(r => `
        <div class="revision-sheet-card">
            ${isLoggedIn ? `<button class="revision-card-delete" onclick="deleteRevision(${r.id},event)">🗑️</button>` : ''}
            <h3>${escapeHtml(r.title)}</h3>
            <p>${escapeHtml(r.fileName)}</p>
            <button class="download-btn" onclick="downloadRevision(${r.id})">Télécharger</button>
        </div>`).join('');
}
async function handleCreateRevision() {
    const cls=document.getElementById('revisionClass').value, sub=document.getElementById('revisionSubject').value;
    const title=document.getElementById('revisionTitle').value.trim(), file=document.getElementById('revisionFile').files[0];
    if (!cls||!sub) return alert('Veuillez choisir une classe et une matière');
    if (!title) return alert('Entrez un titre');
    if (!file)  return alert('Sélectionnez un fichier');
    const reader=new FileReader();
    reader.onload=async function(e) {
        currentRevisionSheets.push({ id:Date.now(), title, classLevel:cls, subject:sub, fileName:file.name, fileData:e.target.result, fileType:file.type });
        await saveData(); closeModal('revisionCreationModal');
        if (currentClass===cls && currentSubject===sub) displayRevisionSheets();
    };
    reader.readAsDataURL(file);
}
window.downloadRevision=function(id){
    const r=currentRevisionSheets.find(x=>x.id===id); if(!r) return;
    const a=document.createElement('a'); a.href=r.fileData; a.download=r.fileName; a.click();
};
window.deleteRevision=async function(id,e){
    e.stopPropagation();
    if(confirm('Supprimer cette fiche ?')){
        currentRevisionSheets=currentRevisionSheets.filter(r=>r.id!==id);
        await saveData(); displayRevisionSheets();
    }
};

// =============================================
// STOCKAGE — JSONBin.io (partagé entre TOUS)
// =============================================
function isConfigured() {
    return JSONBIN_BIN_ID !== 'TON_BIN_ID_ICI' && JSONBIN_MASTER_KEY !== 'TON_MASTER_KEY_ICI';
}

async function saveData() {
    const payload = { subjects, quizzes:currentQuizzes, revisions:currentRevisionSheets, passwords:professorPasswords };
    // Cache local toujours
    try { localStorage.setItem('qc_cache', JSON.stringify(payload)); } catch(e){}

    if (!isConfigured()) { showSetupBanner(); return; }

    showLoading('Sauvegarde…');
    try {
        const res = await fetch(JSONBIN_URL, {
            method: 'PUT',
            headers: { 'Content-Type':'application/json', 'X-Master-Key':JSONBIN_MASTER_KEY, 'X-Bin-Versioning':'false' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('HTTP '+res.status);
    } catch(err) {
        console.error('Sauvegarde JSONBin échouée :', err);
        alert('⚠️ Erreur de sauvegarde cloud. Données sauvegardées localement uniquement.');
    } finally { hideLoading(); }
}

async function loadData() {
    showLoading('Chargement des données…');
    if (!isConfigured()) {
        const raw = localStorage.getItem('qc_cache');
        if (raw) { try { const d=JSON.parse(raw); subjects=d.subjects||{}; currentQuizzes=d.quizzes||[]; currentRevisionSheets=d.revisions||[]; professorPasswords=d.passwords||[]; } catch(e){} }
        hideLoading(); showSetupBanner(); return;
    }
    try {
        const res = await fetch(JSONBIN_URL+'/latest', { headers:{'X-Master-Key':JSONBIN_MASTER_KEY} });
        if (!res.ok) throw new Error('HTTP '+res.status);
        const json = await res.json();
        const d = json.record || json;
        subjects=d.subjects||{}; currentQuizzes=d.quizzes||[]; currentRevisionSheets=d.revisions||[]; professorPasswords=d.passwords||[];
        try { localStorage.setItem('qc_cache', JSON.stringify(d)); } catch(e){}
    } catch(err) {
        console.error('Chargement JSONBin échoué :', err);
        const raw = localStorage.getItem('qc_cache');
        if (raw) { try { const d=JSON.parse(raw); subjects=d.subjects||{}; currentQuizzes=d.quizzes||[]; currentRevisionSheets=d.revisions||[]; professorPasswords=d.passwords||[]; } catch(e){} }
        alert('⚠️ Impossible de charger les données depuis le cloud. Données locales chargées.');
    } finally { hideLoading(); }
}

function showSetupBanner() {
    if (document.getElementById('setupBanner')) return;
    const b = document.createElement('div'); b.id='setupBanner';
    b.innerHTML=`<div style="position:fixed;bottom:0;left:0;right:0;z-index:5000;background:linear-gradient(135deg,#f7971e,#ffd200);color:#333;padding:13px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Nunito',sans-serif;font-weight:700;font-size:13px;box-shadow:0 -4px 20px rgba(0,0,0,0.3);">
        <span>⚙️ <strong>Configuration requise :</strong> Renseignez JSONBIN_BIN_ID et JSONBIN_MASTER_KEY dans script.js &nbsp;→&nbsp; <a href="https://jsonbin.io" target="_blank" style="color:#333;text-decoration:underline;">jsonbin.io (gratuit)</a></span>
        <button onclick="document.getElementById('setupBanner').remove()" style="background:rgba(0,0,0,0.15);border:none;border-radius:50%;width:26px;height:26px;cursor:pointer;font-size:16px;color:#333;line-height:1;">×</button>
    </div>`;
    document.body.appendChild(b);
}