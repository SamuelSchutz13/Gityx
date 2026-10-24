import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Hint, Section } from '@/components/kit';
import { useT } from '../lib/i18n';

const FORMATS = [
  { id: 'html', label: 'HTML', hint: 'arquivo único, abre offline, sem nenhuma requisição de rede' },
  { id: 'md', label: 'Markdown', hint: 'bom para colar em Pull Requests' },
  { id: 'json', label: 'JSON', hint: 'dados completos para scripts' },
];

export function Export() {
  const t = useT();
  const [format, setFormat] = useState('html');
  const [sensitive, setSensitive] = useState(false);
  const href = `/api/export?format=${format}&includeSensitive=${sensitive ? 1 : 0}`;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Hint>{t('Relatório das mudanças atuais e da última execução de testes. O arquivo é baixado pelo navegador; nada é gravado no repositório.')}</Hint>
      <div className="rounded-md border bg-surface">
        <Section title={t('Formato')}>
          <RadioGroup value={format} onValueChange={setFormat} className="gap-2">
            {FORMATS.map((f) => (
              <label key={f.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-l-[3px] border-node-border bg-node p-3 has-[:checked]:border-l-info">
                <RadioGroupItem value={f.id} className="mt-0.5" />
                <span>
                  <span className="block text-[13px] font-medium">{f.label}</span>
                  <span className="block text-xs text-muted-foreground">{t(f.hint)}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
        </Section>
        <Section title={t('Arquivos sensíveis')}>
          <label className="flex items-start gap-3 text-[13px]">
            <Checkbox checked={sensitive} onCheckedChange={(v) => setSensitive(v === true)} className="mt-0.5" />
            <span>
              {t('Incluir conteúdo de arquivos sensíveis')}
              <span className="block text-xs text-muted-foreground">{t('Por padrão, .env, chaves, credenciais e arquivos com tokens aparecem só com nome e contagem.')}</span>
            </span>
          </label>
        </Section>
        <div className="px-3 py-3">
          <Button asChild>
            <a href={href} download>
              <Download className="size-4" /> {t('Baixar')}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
