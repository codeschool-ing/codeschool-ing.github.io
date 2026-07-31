const fs = require('fs');
const src = fs.readFileSync('assets/dados.js', 'utf8');
const { CURSOS, TRILHAS } = (new Function(src + '; return {CURSOS, TRILHAS};'))();
const ids = new Set(CURSOS.map(c => c.id));
let erros = 0;
CURSOS.forEach(c => {
  if (!Array.isArray(c.depende)) { console.log('sem depende:', c.id); erros++; return; }
  c.depende.forEach(d => { if (!ids.has(d)) { console.log('dep inexistente:', c.id, '->', d); erros++; } });
});
// ciclos
const vis = {};
function dfs(id, pilha) {
  if (pilha.includes(id)) { console.log('CICLO:', pilha.join(' -> '), '->', id); erros++; return; }
  if (vis[id]) return; vis[id] = 1;
  (CURSOS.find(c => c.id === id)?.depende || []).forEach(d => dfs(d, pilha.concat(id)));
}
CURSOS.forEach(c => dfs(c.id, []));
console.log(erros === 0 ? 'OK — sem dependências quebradas nem ciclos' : erros + ' problemas');
// quantos cursos têm 2+ dependências (é o que justifica o grafo)
console.log('cursos com 2+ pré-requisitos:', CURSOS.filter(c => c.depende.length > 1).map(c => c.id).join(' '));

/* Dependência declarada DEPOIS do curso que a exige gera ciclo no grafo da
   trilha — e antes da correção fazia a trilha inteira não renderizar. */
const eh = (i) => typeof i === 'object' && Array.isArray(i.opcoes);
let fora = 0;
TRILHAS.forEach(t => {
  const pos = {};
  t.cursos.forEach((it, i) => (eh(it) ? it.opcoes.flatMap(o => o.cursos) : [it])
    .forEach(c => { if (pos[c] === undefined) pos[c] = i; }));
  Object.keys(pos).forEach(c => (CURSOS.find(x => x.id === c) || {}).depende
    ?.forEach(d => {
      if (pos[d] !== undefined && pos[d] > pos[c]) {
        console.log('ORDEM:', t.nome, '—', c, 'depende de', d, 'que vem depois na trilha');
        fora++;
      }
    }));
});
console.log(fora ? fora + ' dependências fora de ordem' : 'OK — nenhuma dependência fora de ordem nas trilhas');
