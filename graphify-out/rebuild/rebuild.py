"""
Reconstruction complete de la carte graphify du projet.

Pourquoi ce script plutot que `graphify update` :

  1. Le perimetre est `next-app/`. Un `graphify update` sans argument repart de
     la racine et avale `_backup_root/`, ce qui double la taille du graphe.
  2. La couche semantique (noeuds `doc_*` / `concept_*` extraits des 7 documents
     du projet) n'est pas reconstructible par l'extraction AST. Elle vit dans
     `build_semantic.py` et doit etre refusionnee a chaque rebuild.
  3. Les libelles de communautes sont curatés a la main dans `label.py`.

Usage, depuis la racine du projet :

    python graphify-out/rebuild/rebuild.py

Pour un simple rafraichissement du code sans toucher aux docs, `graphify update
next-app` suffit — mais il perd la couche semantique et les libelles, donc
preferer ce script.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / 'graphify-out'
SCAN = 'next-app'


def run_step(name: str, script: str) -> None:
    print(f'\n=== {name} ===', flush=True)
    result = subprocess.run([sys.executable, str(HERE / script)], cwd=ROOT)
    if result.returncode != 0:
        raise SystemExit(f'Etape "{name}" en echec (code {result.returncode})')


def detect() -> None:
    print('\n=== 1/7 Detection des fichiers ===', flush=True)
    from graphify.detect import detect as run_detect

    result = run_detect(ROOT / SCAN)
    (OUT / '.graphify_detect.json').write_text(
        json.dumps(result, ensure_ascii=False), encoding='utf-8'
    )
    print(f'{result["total_files"]} fichiers', {k: len(v) for k, v in result['files'].items()})


def extract_ast() -> None:
    print('\n=== 2/7 Extraction AST (code) ===', flush=True)
    from graphify.extract import collect_files, extract

    detected = json.loads((OUT / '.graphify_detect.json').read_text(encoding='utf-8'))
    code_files = []
    for f in detected['files']['code']:
        p = Path(f)
        code_files.extend(collect_files(p) if p.is_dir() else [p])

    res = extract(code_files, cache_root=ROOT / SCAN)
    (OUT / '.graphify_ast.json').write_text(
        json.dumps(res, indent=2, ensure_ascii=False), encoding='utf-8'
    )
    print(f'{len(res["nodes"])} noeuds, {len(res["edges"])} aretes')


def main() -> None:
    # Le garde anti-retrecissement (#479) refuse d'ecrire un graphe plus petit
    # que l'existant. Apres un scan errone (racine au lieu de next-app), le
    # graphe en place est plus gros : on l'ecarte pour laisser passer le bon.
    graph = OUT / 'graph.json'
    if graph.exists():
        graph.unlink()
        print('graph.json precedent ecarte (garde anti-retrecissement)')

    detect()
    extract_ast()
    run_step('3/7 Couche semantique (documents)', 'build_semantic.py')
    run_step('4/7 Fusion AST + semantique', 'merge.py')
    run_step('5/7 Graphe + clustering', 'build_graph.py')
    run_step('6/7 Libelles de communautes', 'label.py')
    run_step('7/7 Manifest + cout', 'manifest.py')

    print('\n=== Export HTML ===', flush=True)
    subprocess.run([sys.executable, '-m', 'graphify', 'export', 'html'], cwd=ROOT, check=False)

    for tmp in (
        '.graphify_detect.json', '.graphify_extract.json', '.graphify_ast.json',
        '.graphify_semantic.json', '.graphify_analysis.json',
    ):
        (OUT / tmp).unlink(missing_ok=True)

    print('\nCarte reconstruite dans graphify-out/')


if __name__ == '__main__':
    main()
