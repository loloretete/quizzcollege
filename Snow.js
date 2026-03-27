// Flocons de neige CSS — compatible Cloudflare Pages
// Utilise des classes d'animation prédéfinies (sf0–sf9) sans custom properties
(function () {
    const layer = document.getElementById('snowLayer');
    if (!layer) return;

    const COUNT = 80;

    for (let i = 0; i < COUNT; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake sf' + (i % 10);

        const size    = Math.random() * 5 + 2;       // 2–7px
        const left    = Math.random() * 100;          // % horizontal
        const delay   = Math.random() * 18;           // s
        const dur     = Math.random() * 10 + 8;      // 8–18s
        const opacity = Math.random() * 0.55 + 0.25; // 0.25–0.8

        flake.style.cssText = [
            'width:'  + size + 'px',
            'height:' + size + 'px',
            'left:'   + left + '%',
            'opacity:' + opacity,
            'animation-duration:' + dur + 's',
            'animation-delay:-'   + delay + 's',
        ].join(';');

        layer.appendChild(flake);
    }
})();