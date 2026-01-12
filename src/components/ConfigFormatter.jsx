/**
 * Config Formatter Component
 * JSON/YAML formatting, validation, and conversion tools
 */

import { useState, useCallback } from 'react';

const FORMAT_OPTIONS = [
  { id: 'json', label: 'JSON', ext: '.json' },
  { id: 'yaml', label: 'YAML', ext: '.yaml' },
  { id: 'toml', label: 'TOML', ext: '.toml' },
];

const INDENT_OPTIONS = [
  { value: 2, label: '2 spaces' },
  { value: 4, label: '4 spaces' },
  { value: '\t', label: 'Tab' },
];

// Simple YAML parser (basic support)
function parseYaml(yaml) {
  const lines = yaml.split('\n');
  const result = {};
  const stack = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - trimmed.length;
    const match = trimmed.match(/^([^:]+):\s*(.*)$/);

    if (!match) continue;

    const key = match[1].trim();
    let value = match[2].trim();

    // Pop stack to find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === '') {
      // Nested object
      parent[key] = {};
      stack.push({ obj: parent[key], indent });
    } else if (value.startsWith('[') && value.endsWith(']')) {
      // Inline array
      parent[key] = JSON.parse(value.replace(/'/g, '"'));
    } else if (value === 'true') {
      parent[key] = true;
    } else if (value === 'false') {
      parent[key] = false;
    } else if (value === 'null') {
      parent[key] = null;
    } else if (!isNaN(Number(value))) {
      parent[key] = Number(value);
    } else {
      parent[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }

  return result;
}

// Simple YAML stringifier
function stringifyYaml(obj, indent = 0) {
  let result = '';
  const spaces = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      result += `${spaces}${key}: null\n`;
    } else if (typeof value === 'boolean') {
      result += `${spaces}${key}: ${value}\n`;
    } else if (typeof value === 'number') {
      result += `${spaces}${key}: ${value}\n`;
    } else if (Array.isArray(value)) {
      if (value.every(v => typeof v !== 'object')) {
        result += `${spaces}${key}: [${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]\n`;
      } else {
        result += `${spaces}${key}:\n`;
        value.forEach(item => {
          result += `${spaces}  - ${typeof item === 'object' ? stringifyYaml(item, indent + 2).trim() : item}\n`;
        });
      }
    } else if (typeof value === 'object') {
      result += `${spaces}${key}:\n${stringifyYaml(value, indent + 1)}`;
    } else {
      const strVal = String(value);
      if (strVal.includes(':') || strVal.includes('#')) {
        result += `${spaces}${key}: "${strVal}"\n`;
      } else {
        result += `${spaces}${key}: ${strVal}\n`;
      }
    }
  }

  return result;
}

// Simple TOML stringifier
function stringifyToml(obj, prefix = '') {
  let result = '';
  const tables = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null) {
      result += `${key} = "null"\n`;
    } else if (typeof value === 'boolean') {
      result += `${key} = ${value}\n`;
    } else if (typeof value === 'number') {
      result += `${key} = ${value}\n`;
    } else if (typeof value === 'string') {
      result += `${key} = "${value}"\n`;
    } else if (Array.isArray(value)) {
      result += `${key} = [${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]\n`;
    } else if (typeof value === 'object') {
      const tableKey = prefix ? `${prefix}.${key}` : key;
      tables.push({ key: tableKey, value });
    }
  }

  for (const table of tables) {
    result += `\n[${table.key}]\n${stringifyToml(table.value, table.key)}`;
  }

  return result;
}

function ValidationResult({ errors }) {
  if (!errors || errors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Valid
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {errors.map((error, i) => (
        <div key={i} className="flex items-start gap-2 text-red-400 text-sm">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>{error}</span>
        </div>
      ))}
    </div>
  );
}

function ToolButton({ icon, label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded transition-colors ${
        active ? 'bg-accent/20 text-accent' : 'bg-white/5 text-muted hover:text-primary hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default function ConfigFormatter({ isOpen, onClose }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [inputFormat, setInputFormat] = useState('json');
  const [outputFormat, setOutputFormat] = useState('json');
  const [indent, setIndent] = useState(2);
  const [errors, setErrors] = useState([]);
  const [showDiff, setShowDiff] = useState(false);

  const parseInput = useCallback(() => {
    try {
      if (inputFormat === 'json') {
        return JSON.parse(input);
      } else if (inputFormat === 'yaml') {
        return parseYaml(input);
      }
      return null;
    } catch (e) {
      return null;
    }
  }, [input, inputFormat]);

  const handleFormat = useCallback(() => {
    setErrors([]);
    try {
      let data;
      if (inputFormat === 'json') {
        data = JSON.parse(input);
      } else if (inputFormat === 'yaml') {
        data = parseYaml(input);
      } else {
        setErrors(['TOML parsing not fully supported']);
        return;
      }

      let formatted;
      if (outputFormat === 'json') {
        const indentValue = indent === '\t' ? '\t' : Number(indent);
        formatted = JSON.stringify(data, null, indentValue);
      } else if (outputFormat === 'yaml') {
        formatted = stringifyYaml(data);
      } else if (outputFormat === 'toml') {
        formatted = stringifyToml(data);
      }

      setOutput(formatted);
    } catch (e) {
      setErrors([e.message]);
    }
  }, [input, inputFormat, outputFormat, indent]);

  const handleMinify = useCallback(() => {
    setErrors([]);
    try {
      const data = inputFormat === 'json' ? JSON.parse(input) : parseYaml(input);
      setOutput(JSON.stringify(data));
    } catch (e) {
      setErrors([e.message]);
    }
  }, [input, inputFormat]);

  const handleValidate = useCallback(() => {
    const newErrors = [];
    try {
      if (inputFormat === 'json') {
        JSON.parse(input);
      } else if (inputFormat === 'yaml') {
        parseYaml(input);
      }
    } catch (e) {
      newErrors.push(e.message);
    }
    setErrors(newErrors);
  }, [input, inputFormat]);

  const handleSort = useCallback(() => {
    setErrors([]);
    try {
      const data = inputFormat === 'json' ? JSON.parse(input) : parseYaml(input);

      const sortObject = (obj) => {
        if (Array.isArray(obj)) {
          return obj.map(sortObject);
        } else if (obj && typeof obj === 'object') {
          const sorted = {};
          Object.keys(obj).sort().forEach(key => {
            sorted[key] = sortObject(obj[key]);
          });
          return sorted;
        }
        return obj;
      };

      const sorted = sortObject(data);
      const indentValue = indent === '\t' ? '\t' : Number(indent);
      setOutput(JSON.stringify(sorted, null, indentValue));
    } catch (e) {
      setErrors([e.message]);
    }
  }, [input, inputFormat, indent]);

  const handleFlatten = useCallback(() => {
    setErrors([]);
    try {
      const data = inputFormat === 'json' ? JSON.parse(input) : parseYaml(input);

      const flatten = (obj, prefix = '') => {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flatten(value, newKey));
          } else {
            result[newKey] = value;
          }
        }
        return result;
      };

      const flattened = flatten(data);
      const indentValue = indent === '\t' ? '\t' : Number(indent);
      setOutput(JSON.stringify(flattened, null, indentValue));
    } catch (e) {
      setErrors([e.message]);
    }
  }, [input, inputFormat, indent]);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(output);
  }, [output]);

  const handleSwap = useCallback(() => {
    setInput(output);
    setOutput('');
    const temp = inputFormat;
    setInputFormat(outputFormat);
    setOutputFormat(temp);
  }, [input, output, inputFormat, outputFormat]);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setErrors([]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <h2 className="text-lg font-semibold text-primary">Config Formatter</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-wrap"
          style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Input:</span>
            <select
              value={inputFormat}
              onChange={(e) => setInputFormat(e.target.value)}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {FORMAT_OPTIONS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Output:</span>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {FORMAT_OPTIONS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Indent:</span>
            <select
              value={indent}
              onChange={(e) => setIndent(e.target.value === '\t' ? '\t' : Number(e.target.value))}
              className="px-2 py-1 text-xs rounded"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
            >
              {INDENT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <ToolButton
              label="Format"
              onClick={handleFormat}
              icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>}
            />
            <ToolButton
              label="Minify"
              onClick={handleMinify}
              icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>}
            />
            <ToolButton
              label="Validate"
              onClick={handleValidate}
              icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>}
            />
            <ToolButton
              label="Sort Keys"
              onClick={handleSort}
              icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>}
            />
            <ToolButton
              label="Flatten"
              onClick={handleFlatten}
              icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>}
            />
          </div>
        </div>

        {/* Validation */}
        {(errors.length > 0 || input) && (
          <div className="px-4 py-2" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-subtle)' }}>
            <ValidationResult errors={errors} />
          </div>
        )}

        {/* Editor Panels */}
        <div className="flex-1 overflow-hidden flex">
          {/* Input */}
          <div className="flex-1 flex flex-col" style={{ borderRight: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs font-medium text-muted">Input</span>
              <button
                onClick={handleClear}
                className="text-xs text-muted hover:text-primary"
              >
                Clear
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste your ${inputFormat.toUpperCase()} here...`}
              className="flex-1 p-4 text-sm font-mono resize-none focus:outline-none"
              style={{ background: 'var(--bg-primary)' }}
              spellCheck={false}
            />
          </div>

          {/* Swap Button */}
          <div className="flex items-center">
            <button
              onClick={handleSwap}
              className="p-2 hover:bg-white/10 rounded"
              title="Swap input and output"
            >
              <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </button>
          </div>

          {/* Output */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--bg-tertiary)' }}>
              <span className="text-xs font-medium text-muted">Output</span>
              <button
                onClick={handleCopy}
                className="text-xs text-accent hover:underline"
              >
                Copy
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Formatted output will appear here..."
              className="flex-1 p-4 text-sm font-mono resize-none focus:outline-none"
              style={{ background: 'var(--bg-primary)' }}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-xs text-muted"
          style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)' }}
        >
          <span>
            Input: {input.length} chars • {input.split('\n').length} lines
          </span>
          <span>
            Output: {output.length} chars • {output.split('\n').length} lines
          </span>
        </div>
      </div>
    </div>
  );
}

export function QuickFormat({ value, onFormat }) {
  const [formatted, setFormatted] = useState('');

  const handleFormat = () => {
    try {
      const data = JSON.parse(value);
      const result = JSON.stringify(data, null, 2);
      setFormatted(result);
      onFormat?.(result);
    } catch {
      setFormatted('Invalid JSON');
    }
  };

  return (
    <button
      onClick={handleFormat}
      className="text-xs text-accent hover:underline"
    >
      Format
    </button>
  );
}
