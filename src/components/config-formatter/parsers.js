/**
 * ConfigFormatter Parsers
 * Functions to parse and stringify different config formats
 */

// Simple YAML parser (basic support)
export function parseYaml(yaml) {
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
export function stringifyYaml(obj, indent = 0) {
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
export function stringifyToml(obj, prefix = '') {
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
