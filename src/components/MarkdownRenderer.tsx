import React, { useMemo } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const parsedContent = useMemo(() => parseMarkdown(content || ''), [content]);

  return (
    <div 
      className={`prose prose-slate dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: parsedContent }}
    />
  );
};

const parseMarkdown = (markdown: string): string => {
  if (!markdown) return '';

  let html = markdown;

  html = processCodeBlocks(html);
  
  html = html.replace(/`([^`]+)`/g,
    '<code class="bg-[#191919] px-1.5 py-0.5 rounded font-mono text-sm text-white">$1</code>');

  html = html.replace(/^###### (.*$)/gm, '<h6 class="text-sm font-semibold mt-6 mb-2">$1</h6>');
  html = html.replace(/^##### (.*$)/gm, '<h5 class="text-base font-semibold mt-6 mb-2">$1</h5>');
  html = html.replace(/^#### (.*$)/gm, '<h4 class="text-lg font-semibold mt-6 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mt-10 mb-6">$1</h1>');

  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  html = html.replace(/^> (.*$)/gm,
    '<blockquote class="border-l-4 border-[#3D3D3D] pl-4 py-2.5 italic bg-[#191919] my-4">$1</blockquote>');
  html = html.replace(/^\-\-\-$/gm, '<hr class="border-t my-8 border-[#212121]">');
  html = processLists(html);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline">$1</a>');
  html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4">');
  html = processTables(html);
  html = html.replace(/^(?!<[a-z\/].*>)(.+)$/gm, '<p class="my-4">$1</p>');
  html = html.replace(/<p class="my-4"><\/p>/g, '');
  html = html.replace(/<\/p>\s*<p/g, '</p>\n<p');

  return html;
};

const processCodeBlocks = (html: string): string => {
  return html.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (_, language, code) => {
    const languageClass = language ? ` language-${language}` : '';
    const formattedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    return `<pre class="bg-[#191919] p-4 rounded-lg my-6 overflow-x-auto"><code class="block whitespace-pre text-white${languageClass}">${formattedCode}</code></pre>`;
  });
};

const processLists = (html: string): string => {
  html = html.replace(/^(\s*)([\-\*]) (.*$)/gm, (match, space, bullet, content) => {
    const indent = space.length;
    return `<li data-indent="${indent}" class="ml-${indent > 0 ? 4 : 0} mb-1">` + content + '</li>';
  });
  
  html = html.replace(/^(\s*)(\d+\.) (.*$)/gm, (match, space, number, content) => {
    const indent = space.length;
    return `<li data-indent="${indent}" data-ordered="true" class="ml-${indent > 0 ? 4 : 0} mb-1">` + content + '</li>';
  });

  const lines = html.split('\n');
  const result: string[] = [];
  const listStack: string[] = [];

  for (const line of lines) {
    if (line.includes('<li data-indent=')) {
      const indent = parseInt(line.match(/data-indent="(\d+)"/)?.[1] || '0');
      const isOrdered = line.includes('data-ordered="true"');
      const listType = isOrdered ? 'ol' : 'ul';
      
      while (listStack.length > indent) {
        result.push(`</${listStack.pop()!}>`);
      }
      
      if (listStack.length <= indent) {
        const listClass = isOrdered 
          ? 'list-decimal pl-5 my-4' 
          : 'list-disc pl-5 my-4';
          
        result.push(`<${listType} class="${listClass}">`);
        listStack.push(listType);
      }
      
      const cleanedLine = line
        .replace(/ data-indent="\d+"/, '')
        .replace(/ data-ordered="true"/, '');
        
      result.push(cleanedLine);
    } else {
      while (listStack.length > 0) {
        result.push(`</${listStack.pop()!}>`);
      }
      
      result.push(line);
    }
  }
  
  while (listStack.length > 0) {
    result.push(`</${listStack.pop()!}>`);
  }
  
  return result.join('\n');
};

const processTables = (html: string): string => {
  let inTable = false;
  const lines = html.split('\n');
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|');
    
    if (isTableRow) {
      if (!inTable) {
        result.push('<div class="overflow-x-auto my-5 bg-[#191919]"><table class="w-full border-collapse">');
        
        const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
        const isHeaderRow = nextLine.includes('|-') || nextLine.includes('| -');
        
        if (isHeaderRow) {
          result.push('<thead class="bg-[#191919] text-white">');
          inTable = true;
        } else {
          result.push('<tbody class="bg-transparent">');
          inTable = true;
        }
      }
      
      if (line.replace(/[|:\-\s]/g, '').length === 0) {
        continue;
      }
      
      const isHeaderRow = i > 0 && 
        lines[i - 1].includes('<thead') && 
        !lines[i - 1].includes('</thead');
      
      const cells = line.split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());
      
      const cellTag = isHeaderRow ? 'th' : 'td';
      const cellClass = 'border border-gray-700 px-6 py-2';
      
      result.push('<tr>');
      cells.forEach(cell => {
        result.push(`<${cellTag} class="${cellClass}">${cell}</${cellTag}>`);
      });
      result.push('</tr>');
      
      if (isHeaderRow && i + 1 < lines.length && !lines[i + 1].includes('|-')) {
        result.push('</thead><tbody>');
      }
    } else if (inTable) {
      result.push('</tbody></table></div>');
      inTable = false;
      result.push(line);
    } else {
      result.push(line);
    }
  }
  
  if (inTable) {
    result.push('</tbody></table></div>');
  }
  
  return result.join('\n');
};

export default MarkdownRenderer;