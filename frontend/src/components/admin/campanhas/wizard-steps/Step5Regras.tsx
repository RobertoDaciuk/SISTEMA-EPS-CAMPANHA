'use client';

import { motion } from 'framer-motion';
import { FileText, Info, Bold, Italic, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';
import type { WizardState } from '../CriarCampanhaWizard';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface Props {
  state: WizardState;
  setState: (state: WizardState) => void;
}

/**
 * Step 5: Regras da Campanha
 *
 * Editor WYSIWYG para o Admin escrever regras detalhadas da campanha.
 * Usa Tiptap (moderno e compatível com React 19) para formatação rica (HTML).
 */
export default function Step5Regras({ state, setState }: Props) {
  // Configuração do editor Tiptap
  const editor = useEditor({
    extensions: [StarterKit],
    content: state.regras || '',
    immediatelyRender: false, // IMPORTANTE: Evita erros de hidratação com SSR do Next.js
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[250px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      setState({ ...state, regras: editor.getHTML() });
    },
  });

  // Sincronizar conteúdo quando state.regras mudar externamente
  useEffect(() => {
    if (editor && state.regras && editor.getHTML() !== state.regras) {
      editor.commands.setContent(state.regras);
    }
  }, [state.regras, editor]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
    label,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: any;
    label: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent text-muted-foreground hover:text-foreground'
      }`}
      title={label}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Regras da Campanha</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Escreva as regras completas que os vendedores devem seguir para participar desta campanha.
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-1">Dica: Seja claro e detalhado</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Defina quais produtos são elegíveis</li>
            <li>Explique como funciona o spillover entre cartelas</li>
            <li>Mencione prazos de validação e pagamento</li>
            <li>Inclua exemplos práticos se necessário</li>
          </ul>
        </div>
      </div>

      {/* Editor de Regras */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          Regras da Campanha
          <span className="text-muted-foreground font-normal ml-2">(Opcional)</span>
        </label>

        {/* Toolbar */}
        <div className="rounded-t-xl border border-border bg-muted/30 p-2 flex items-center gap-1 flex-wrap">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            icon={Heading1}
            label="Título 1"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            icon={Heading2}
            label="Título 2"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            icon={Bold}
            label="Negrito"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            icon={Italic}
            label="Itálico"
          />
          <div className="w-px h-6 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            icon={List}
            label="Lista"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            icon={ListOrdered}
            label="Lista Numerada"
          />
        </div>

        {/* Editor */}
        <div className="rounded-b-xl border border-t-0 border-border overflow-hidden bg-card">
          <EditorContent editor={editor} />
        </div>

        {/* Preview das Regras */}
        {state.regras && state.regras !== '<p></p>' && state.regras.trim().length > 0 && (
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-semibold text-foreground">
              Preview das Regras
            </label>
            <div className="rounded-xl border border-border p-4 bg-muted/30">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: state.regras }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Exemplo de Regras (Sugestão) */}
      {(!state.regras || state.regras === '<p></p>' || state.regras.trim().length === 0) && (
        <div className="rounded-xl bg-accent/50 border border-border p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Exemplo de Regras:</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>1. Produtos Elegíveis:</strong> Apenas lentes da linha BlueProtect e PhotoSens são válidas.</p>
            <p><strong>2. Período de Validade:</strong> Vendas realizadas entre 01/01/2025 e 31/03/2025.</p>
            <p><strong>3. Spillover:</strong> Vendas que ultrapassarem a quantidade da Cartela 1 serão automaticamente contabilizadas na Cartela 2.</p>
            <p><strong>4. Pagamento:</strong> Os pontos e moedinhas serão creditados em até 72h após a validação.</p>
          </div>
        </div>
      )}

      {/* Estilos customizados para o Tiptap Editor */}
      <style jsx global>{`
        .ProseMirror {
          min-height: 250px;
          outline: none;
        }

        .ProseMirror p {
          margin: 0.75em 0;
        }

        .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }

        .ProseMirror h2 {
          font-size: 1.25em;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
        }

        .ProseMirror li {
          margin: 0.25em 0;
        }

        .ProseMirror strong {
          font-weight: bold;
        }

        .ProseMirror em {
          font-style: italic;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: hsl(var(--muted-foreground));
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </motion.div>
  );
}
