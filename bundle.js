const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'styles.css');
const jsPath = path.join(__dirname, 'app.js');

try {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    const js = fs.readFileSync(jsPath, 'utf8');

    // Reemplaza el link al CSS externo por la etiqueta style interna
    html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>${css}</style>`);
    // Reemplaza el script JS externo por la etiqueta script interna
    html = html.replace('<script src="app.js"></script>', `<script>${js}</script>`);

    const distDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(distDir)){
        fs.mkdirSync(distDir);
    }

    fs.writeFileSync(path.join(distDir, 'nerja.html'), html, 'utf8');
    console.log('¡Archivo empaquetado nerja.html generado en la carpeta dist/!');
} catch (err) {
    console.error('Error al empaquetar la app:', err);
}
