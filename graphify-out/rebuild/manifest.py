import json
from pathlib import Path
from datetime import datetime, timezone
from graphify.detect import save_manifest
from graphify.cli import _stamped_manifest_files

ROOT = 'next-app'

detect = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
extract = json.loads(Path('graphify-out/.graphify_extract.json').read_text(encoding='utf-8'))

corpus = detect.get('all_files') or detect['files']
manifest_files = _stamped_manifest_files(corpus, extract, Path(ROOT))
sem_types = ('document', 'paper', 'image')
dispatched = {f for t, fl in detect['files'].items() if t in sem_types for f in fl}
stamped = {f for fl in manifest_files.values() for f in fl}
cleared = dispatched - stamped
scan = {f for fl in corpus.values() for f in fl}
save_manifest(manifest_files, root=ROOT, scan_corpus=scan, clear_semantic=cleared or None)

input_tok = extract.get('input_tokens', 0)
output_tok = extract.get('output_tokens', 0)
cost_path = Path('graphify-out/cost.json')
cost = json.loads(cost_path.read_text(encoding='utf-8')) if cost_path.exists() else {
    'runs': [], 'total_input_tokens': 0, 'total_output_tokens': 0}
cost['runs'].append({
    'date': datetime.now(timezone.utc).isoformat(),
    'input_tokens': input_tok,
    'output_tokens': output_tok,
    'files': detect.get('total_files', 0),
})
cost['total_input_tokens'] += input_tok
cost['total_output_tokens'] += output_tok
cost_path.write_text(json.dumps(cost, indent=2, ensure_ascii=False), encoding='utf-8')
print('manifest saved; stamped %d files, cleared %d' % (len(stamped), len(cleared)))
