/**
 * ImportWizard Parsers
 * Functions to parse different export formats
 */

// Parse ChatGPT export format
export const parseChatGPT = (data) => {
  const conversations = [];

  // ChatGPT exports as array or object with conversations
  const items = Array.isArray(data) ? data : data.conversations || [data];

  for (const item of items) {
    const conv = {
      id: item.id || crypto.randomUUID(),
      title: item.title || 'Imported Conversation',
      createdAt: item.create_time ? new Date(item.create_time * 1000).toISOString() : new Date().toISOString(),
      messages: [],
    };

    // Parse message tree
    const mapping = item.mapping || {};
    for (const nodeId of Object.keys(mapping)) {
      const node = mapping[nodeId];
      if (node.message && node.message.content && node.message.content.parts) {
        const content = node.message.content.parts.join('\n');
        if (content.trim()) {
          conv.messages.push({
            role: node.message.author?.role || 'unknown',
            content: content,
            timestamp: node.message.create_time
              ? new Date(node.message.create_time * 1000).toISOString()
              : null,
          });
        }
      }
    }

    if (conv.messages.length > 0) {
      conversations.push(conv);
    }
  }

  return conversations;
};

// Parse Claude export format
export const parseClaude = (data) => {
  const conversations = [];

  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const conv = {
      id: item.uuid || item.id || crypto.randomUUID(),
      title: item.name || item.title || 'Imported Conversation',
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      messages: [],
    };

    const messages = item.chat_messages || item.messages || [];
    for (const msg of messages) {
      conv.messages.push({
        role: msg.sender || msg.role || 'unknown',
        content: msg.text || msg.content || '',
        timestamp: msg.created_at || msg.timestamp || null,
      });
    }

    if (conv.messages.length > 0) {
      conversations.push(conv);
    }
  }

  return conversations;
};

// Parse generic JSON format
export const parseGeneric = (data) => {
  const conversations = [];

  // Try to detect format
  const items = Array.isArray(data) ? data : [data];

  for (const item of items) {
    const conv = {
      id: item.id || crypto.randomUUID(),
      title: item.title || item.name || 'Imported Conversation',
      createdAt: item.createdAt || item.created_at || item.timestamp || new Date().toISOString(),
      messages: [],
    };

    // Look for messages in common locations
    const messages = item.messages || item.chat || item.history || item.conversation || [];

    for (const msg of messages) {
      conv.messages.push({
        role: msg.role || msg.sender || msg.author || 'unknown',
        content: msg.content || msg.text || msg.message || String(msg),
        timestamp: msg.timestamp || msg.created_at || msg.time || null,
      });
    }

    // If no messages found but item has content, treat as single message
    if (conv.messages.length === 0 && (item.content || item.text)) {
      conv.messages.push({
        role: 'user',
        content: item.content || item.text,
        timestamp: null,
      });
    }

    if (conv.messages.length > 0) {
      conversations.push(conv);
    }
  }

  return conversations;
};

// Parse plain text file
export const parseText = (text, filename) => {
  const lines = text.split('\n');
  const messages = [];

  let currentRole = 'user';
  let currentContent = [];

  for (const line of lines) {
    // Detect role changes
    const lowerLine = line.toLowerCase().trim();
    if (lowerLine.startsWith('user:') || lowerLine.startsWith('human:') || lowerLine.startsWith('me:')) {
      if (currentContent.length > 0) {
        messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
      }
      currentRole = 'user';
      currentContent = [line.substring(line.indexOf(':') + 1).trim()];
    } else if (lowerLine.startsWith('assistant:') || lowerLine.startsWith('ai:') || lowerLine.startsWith('claude:') || lowerLine.startsWith('chatgpt:')) {
      if (currentContent.length > 0) {
        messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
      }
      currentRole = 'assistant';
      currentContent = [line.substring(line.indexOf(':') + 1).trim()];
    } else {
      currentContent.push(line);
    }
  }

  // Add last message
  if (currentContent.length > 0) {
    messages.push({ role: currentRole, content: currentContent.join('\n').trim() });
  }

  // Filter empty messages
  const filteredMessages = messages.filter(m => m.content.trim());

  return [{
    id: crypto.randomUUID(),
    title: filename || 'Imported Text',
    createdAt: new Date().toISOString(),
    messages: filteredMessages,
  }];
};

// Parse terminal log
export const parseTerminal = (text, filename) => {
  const lines = text.split('\n');
  const commands = [];

  let currentCommand = null;
  let currentOutput = [];

  for (const line of lines) {
    // Detect command prompts
    if (line.match(/^[$#>]\s/) || line.match(/^\w+[@:]/)) {
      if (currentCommand) {
        commands.push({
          role: 'user',
          content: currentCommand,
          output: currentOutput.join('\n').trim(),
        });
      }
      currentCommand = line.replace(/^[$#>]\s*/, '').trim();
      currentOutput = [];
    } else if (currentCommand) {
      currentOutput.push(line);
    }
  }

  // Add last command
  if (currentCommand) {
    commands.push({
      role: 'user',
      content: currentCommand,
      output: currentOutput.join('\n').trim(),
    });
  }

  // Convert to messages format
  const messages = [];
  for (const cmd of commands) {
    messages.push({ role: 'user', content: '$ ' + cmd.content });
    if (cmd.output) {
      messages.push({ role: 'assistant', content: cmd.output });
    }
  }

  return [{
    id: crypto.randomUUID(),
    title: filename || 'Terminal Session',
    createdAt: new Date().toISOString(),
    messages: messages,
  }];
};
