import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css'; // You can choose other themes too

marked.setOptions({
  highlight: function (code, lang) {
    return hljs.highlightAuto(code, [lang]).value;
  },
  gfm: true,        // Enables GitHub Flavored Markdown (tables, etc.)
  breaks: true,     // Line breaks
});

export function parseMarkdown(content) {
  return marked(content);
}