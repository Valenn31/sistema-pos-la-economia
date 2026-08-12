// Regenerar diagramas: desde la raíz del repo, `npm install --no-save @resvg/resvg-js`
// y despues `node docs/diagrams/build-diagrams.cjs`.
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const diagrams = ['d1-arquitectura', 'd2-estructura', 'd3-modelo-datos', 'd4-auth-flow', 'd5-flujo-venta', 'd6-flujo-compras'];
const manifest = {};

for (const name of diagrams) {
  const svg = require(path.join(__dirname, name + '.cjs'));
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 2200 } });
  const png = resvg.render().asPng();
  const outPath = path.join(__dirname, name + '.png');
  fs.writeFileSync(outPath, png);
  const r = resvg.render();
  manifest[name] = { file: name + '.png', width: r.width, height: r.height };
  console.log(name, r.width, 'x', r.height);
}

fs.writeFileSync(path.join(__dirname, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('OK');
