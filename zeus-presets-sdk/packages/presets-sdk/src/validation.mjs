export function validateSelectedItems(selectedItems) {
  const errors = [];
  if (!Array.isArray(selectedItems)) {
    errors.push('selectedItems must be an array');
    return { valid: false, errors };
  }
  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    if (!item.serverName) errors.push(`Item ${i}: serverName is required`);
    if (!item.type || !['tool', 'resource', 'resourceTemplate', 'prompt'].includes(item.type)) {
      errors.push(`Item ${i}: type must be tool, resource, resourceTemplate, or prompt`);
    }
    if (!item.name) errors.push(`Item ${i}: name is required`);
  }
  return { valid: errors.length === 0, errors };
}

export function countPresetItems(selectedItems) {
  const counts = {
    tools: 0,
    resources: 0,
    resourceTemplates: 0,
    prompts: 0,
    total: Array.isArray(selectedItems) ? selectedItems.length : 0
  };
  if (!Array.isArray(selectedItems)) return counts;
  for (const item of selectedItems) {
    if (item.type === 'tool') counts.tools++;
    else if (item.type === 'resource') counts.resources++;
    else if (item.type === 'resourceTemplate') counts.resourceTemplates++;
    else if (item.type === 'prompt') counts.prompts++;
  }
  return counts;
}

export function formatTools(tools) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description || 'No description available',
    parameters: tool.inputSchema || {},
    type: 'tool'
  }));
}

export function formatResources(resources) {
  return resources.map((resource) => ({
    name: resource.name,
    description: resource.description || 'No description available',
    uri: resource.uri,
    mimeType: resource.mimeType,
    type: 'resource'
  }));
}

export function formatResourceTemplates(templates) {
  return templates.map((template) => ({
    name: template.name,
    description: template.description || 'No description available',
    uriTemplate: template.uriTemplate,
    mimeType: template.mimeType,
    type: 'resourceTemplate'
  }));
}

export function formatPrompts(prompts) {
  return prompts.map((prompt) => ({
    name: prompt.name,
    description: prompt.description || 'No description available',
    arguments: prompt.arguments || [],
    type: 'prompt'
  }));
}
