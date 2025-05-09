import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const parseMarkdown = (markdown: string) => {
    if (!markdown) return '';

    let html = markdown;

    // Headers
    html = html.replace(/^###### (.*$)/gm, '<h6 class="text-sm font-bold">$1</h6>');
    html = html.replace(/^##### (.*$)/gm, '<h5 class="text-base font-bold">$1</h5>');
    html = html.replace(/^#### (.*$)/gm, '<h4 class="text-lg font-bold">$1</h4>');
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold">$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold">$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold">$1</h1>');

    // Bold & Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Code blocks
    html = html.replace(/```(.*?)\n([\s\S]*?)```/g,
      '<pre class="bg-gray-500 rounded overflow-x-auto"><code>$2</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g,
      '<code class="bg-gray-700 text-white rounded font-mono text-sm">$1</code>');

    // Blockquotes
    html = html.replace(/^> (.*$)/gm,
      '<blockquote class="border-l-4 border-gray-300 italic">$1</blockquote>');

    // Horizontal rule
    html = html.replace(/^\-\-\-$/gm, '<hr class="border-t border-dashed border-gray-700">');

    // Unordered and ordered list items
    html = html.replace(/^\s*[\-\*] (.*$)/gm, '<li class="list-disc">$1</li>');
    html = html.replace(/^\s*\d+\. (.*$)/gm, '<li class="list-decimal">$1</li>');

    // Wrap lists
    const wrapLists = (str: string) => {
      let inList = false;
      let listType = '';
      const lines = str.split('\n');
      const result: string[] = [];

      for (const line of lines) {
        if (line.includes('list-disc')) {
          if (!inList || listType !== 'ul') {
            if (inList) result.push(`</${listType}>`);
            result.push('<ul class="list-disc">');
            inList = true;
            listType = 'ul';
          }
          result.push(line);
        } else if (line.includes('list-decimal')) {
          if (!inList || listType !== 'ol') {
            if (inList) result.push(`</${listType}>`);
            result.push('<ol class="list-decimal">');
            inList = true;
            listType = 'ol';
          }
          result.push(line);
        } else {
          if (inList) {
            result.push(`</${listType}>`);
            inList = false;
          }
          result.push(line);
        }
      }

      if (inList) {
        result.push(`</${listType}>`);
      }

      return result.join('\n');
    };

    html = wrapLists(html);

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-blue-600 hover:underline">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="max-w-full h-auto">');

    // Tables (very basic)
    html = html.replace(/\|(.+)\|/g, '<tr><td>$1</td></tr>');
    html = html.replace(/<td>(.+?)<\/td>/g, (_match, content) => {
      return '<td class="border border-gray-300 px-4 py-2">' +
        content.replace(/\|/g, '</td><td class="border border-gray-300 px-4 py-2">') +
        '</td>';
    });

    // Paragraphs (last step)
    html = html.replace(/^(?!<.+?>)(.+)$/gm, '<p class="">$1</p>');
    html = html.replace(/<p class=""><\/p>/g, '');

    return html;
  };

  const parsedContent = parseMarkdown(content);

  return (
    <div
      className="prose prose-slate max-w-none"
      dangerouslySetInnerHTML={{ __html: parsedContent }}
    />
  );
};

export default MarkdownRenderer;