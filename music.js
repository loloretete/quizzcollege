// =====================
// MUSIQUE AMBIANTE D'HIVER
// Générée en temps réel via Web Audio API
// Pas besoin de fichier MP3 externe !
// =====================
(function () {
    let audioCtx = null;
    let masterGain = null;
    let isPlaying = false;
    let nodes = [];

    const btn = document.getElementById('musicToggle');

    btn.addEventListener('click', () => {
        if (isPlaying) {
            stopMusic();
        } else {
            startMusic();
        }
    });

    function createAudioContext() {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 3);
        masterGain.connect(audioCtx.destination);
    }

    function startMusic() {
        if (!audioCtx) createAudioContext();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        isPlaying = true;
        btn.textContent = '🎵';
        btn.classList.add('playing');

        // Pad ambiant avec plusieurs oscillateurs accordés
        playAmbientPad();
        // Mélodie douce de carillon
        playChimeMelody();
        // Bruit de vent doux
        playWindNoise();
    }

    function stopMusic() {
        isPlaying = false;
        btn.textContent = '🔇';
        btn.classList.remove('playing');

        if (masterGain) {
            masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
        }
        setTimeout(() => {
            nodes.forEach(n => { try { n.stop(); } catch(e) {} });
            nodes = [];
        }, 1600);
    }

    // ---- PAD AMBIANT ----
    // Accord Ré mineur (D minor) : D3, F3, A3, C4
    const padNotes = [146.83, 174.61, 220.00, 261.63, 293.66, 349.23];

    function playAmbientPad() {
        if (!isPlaying) return;
        padNotes.forEach((freq, i) => {
            const osc  = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = freq;
            // Légère variation de fréquence pour un effet "pad"
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(freq * 1.002, audioCtx.currentTime + 4);
            osc.frequency.linearRampToValueAtTime(freq, audioCtx.currentTime + 8);

            filter.type = 'lowpass';
            filter.frequency.value = 800;
            filter.Q.value = 0.5;

            gain.gain.value = 0.06 / padNotes.length;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(masterGain);

            osc.start(audioCtx.currentTime + i * 0.15);
            nodes.push(osc);
        });

        // Renouvelle le pad toutes les 12 secondes
        if (isPlaying) {
            setTimeout(() => {
                if (isPlaying) playAmbientPad();
            }, 12000);
        }
    }

    // ---- MÉLODIE CARILLON ----
    // Gamme pentatonique de ré mineur : D4, F4, G4, A4, C5, D5
    const chimeScale = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 659.25, 698.46];
    
    // Motif mélodique hivernal
    const melodyPattern = [0, 2, 4, 3, 5, 4, 2, 0, 1, 3, 5, 4, 6, 5, 3, 1,
                           0, 4, 2, 5, 3, 1, 4, 0, 2, 5, 3, 6, 4, 2, 1, 0];
    let melodyIndex = 0;

    function playChimeNote() {
        if (!isPlaying) return;
        const idx  = melodyPattern[melodyIndex % melodyPattern.length];
        const freq = chimeScale[idx];
        melodyIndex++;

        const osc    = audioCtx.createOscillator();
        const gain   = audioCtx.createGain();
        const reverb = createReverb();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Enveloppe ADSR façon carillon
        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.04, audioCtx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0);

        osc.connect(gain);
        gain.connect(reverb);
        reverb.connect(masterGain);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 2.5);
        nodes.push(osc);

        // Harmonique haute (son de cloche)
        const osc2   = audioCtx.createOscillator();
        const gain2  = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2.756; // harmonique de cloche
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.04, audioCtx.currentTime + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 1.5);
        nodes.push(osc2);

        // Timing variable pour rythme naturel
        const delay = 800 + Math.random() * 1200;
        if (isPlaying) {
            setTimeout(playChimeNote, delay);
        }
    }

    function playChimeMelody() {
        if (!isPlaying) return;
        setTimeout(playChimeNote, 1500);
    }

    // ---- BRUIT DE VENT ----
    function playWindNoise() {
        if (!isPlaying) return;
        const bufferSize = audioCtx.sampleRate * 3;
        const buffer     = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data       = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop   = true;

        const filter = audioCtx.createBiquadFilter();
        filter.type  = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 0.3;

        // LFO pour faire "souffler" le vent
        const lfo     = audioCtx.createOscillator();
        const lfoGain = audioCtx.createGain();
        lfo.frequency.value   = 0.07;
        lfoGain.gain.value    = 200;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        const windGain = audioCtx.createGain();
        windGain.gain.value = 0.018;

        source.connect(filter);
        filter.connect(windGain);
        windGain.connect(masterGain);
        lfo.start();

        source.start();
        nodes.push(source);
        nodes.push(lfo);
    }

    // ---- REVERB SIMPLE ----
    function createReverb() {
        const convolver = audioCtx.createConvolver();
        const rate      = audioCtx.sampleRate;
        const length    = rate * 2.5;
        const impulse   = audioCtx.createBuffer(2, length, rate);
        for (let channel = 0; channel < 2; channel++) {
            const d = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
            }
        }
        convolver.buffer = impulse;
        return convolver;
    }

})();