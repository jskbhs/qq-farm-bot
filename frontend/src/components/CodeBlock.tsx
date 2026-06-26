import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  code: string;
}

export function CodeBlock({ code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('复制失败');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1A1F2E]">
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-3 rounded-lg bg-white/10 p-1.5 text-white/80 transition-colors hover:bg-white/20"
        aria-label="复制"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-gray-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}
