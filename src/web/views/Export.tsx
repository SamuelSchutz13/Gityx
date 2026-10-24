import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const FORMATS = [
  { id: 'html', label: 'HTML', hint: 'arquivo único, abre offline, sem nenhuma requisição de rede' },
  { id: 'md', label: 'Markdown', hint: 'bom para colar em Pull Requests' },
  { id: 'json', label: 'JSON', hint: 'dados completos para scripts' },
];

export function Export() {
  const [format, setFormat] = useState('html');
  const [sensitive, setSensitive] = useState(false);
  const href = `/api/export?format=${format}&includeSensitive=${sensitive ? 1 : 0}`;

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Exportar</h1>
        <p className="text-sm text-muted-foreground">Relatório das mudanças atuais e da última execução de testes. O arquivo é baixado pelo navegador; nada é gravado no repositório.</p>
      </div>
      <RadioGroup value={format} onValueChange={setFormat} className="gap-3">
        {FORMATS.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary">
            <RadioGroupItem value={f.id} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">{f.label}</span>
              <span className="block text-xs text-muted-foreground">{f.hint}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={sensitive} onCheckedChange={(v) => setSensitive(v === true)} className="mt-0.5" />
        <span>
          Incluir conteúdo de arquivos sensíveis
          <span className="block text-xs text-muted-foreground">Por padrão, .env, chaves, credenciais e arquivos com tokens aparecem só com nome e contagem.</span>
        </span>
      </label>
      <Button asChild>
        <a href={href} download>
          <Download className="size-4" /> Baixar
        </a>
      </Button>
    </div>
  );
}
