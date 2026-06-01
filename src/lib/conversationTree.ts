import type { ChatMessage } from '@/components/ChatBubbles'

export type ConversationTree = {
  messages: Record<string, ChatMessage>
  activeNodeId: string | null
}

const STORAGE_KEY = 'gpt-chat-conversation'

type StoredConversation = {
  messages: ChatMessage[]
  activeNodeId: string | null
}

export function createEmptyConversation(): ConversationTree {
  return { messages: {}, activeNodeId: null }
}

export function loadConversationFromStorage(): ConversationTree {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createEmptyConversation()
    }

    const stored = JSON.parse(raw) as StoredConversation
    if (!Array.isArray(stored.messages)) {
      return createEmptyConversation()
    }

    const messages: Record<string, ChatMessage> = {}
    for (const message of stored.messages) {
      if (
        typeof message.id === 'string' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        (message.parentId === null || typeof message.parentId === 'string')
      ) {
        messages[message.id] = message
      }
    }

    const activeNodeId =
      typeof stored.activeNodeId === 'string' && messages[stored.activeNodeId]?.role === 'assistant'
        ? stored.activeNodeId
        : null

    return { messages, activeNodeId }
  } catch {
    return createEmptyConversation()
  }
}

export function saveConversationToStorage(tree: ConversationTree): void {
  const payload: StoredConversation = {
    messages: Object.values(tree.messages),
    activeNodeId: tree.activeNodeId,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function getChildren(tree: ConversationTree, parentId: string): ChatMessage[] {
  return Object.values(tree.messages).filter((message) => message.parentId === parentId)
}

export function getPathToRoot(tree: ConversationTree, messageId: string): ChatMessage[] {
  const path: ChatMessage[] = []
  let current: ChatMessage | undefined = tree.messages[messageId]

  while (current) {
    path.push(current)
    current = current.parentId ? tree.messages[current.parentId] : undefined
  }

  return path.reverse()
}

export function getModelContext(
  tree: ConversationTree,
  newUserMessage: ChatMessage,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (tree.activeNodeId) {
    const path = getPathToRoot(tree, tree.activeNodeId)
    return [
      ...path.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: newUserMessage.content },
    ]
  }

  return [{ role: 'user', content: newUserMessage.content }]
}

export function forkConversation(tree: ConversationTree, assistantMessageId: string): ConversationTree {
  const message = tree.messages[assistantMessageId]
  if (!message || message.role !== 'assistant') {
    return tree
  }

  return { ...tree, activeNodeId: assistantMessageId }
}

export function setActiveFromMessageClick(
  tree: ConversationTree,
  messageId: string,
): ConversationTree {
  const message = tree.messages[messageId]
  if (!message) {
    return tree
  }

  if (message.role === 'assistant') {
    return { ...tree, activeNodeId: messageId }
  }

  if (message.parentId) {
    const parent = tree.messages[message.parentId]
    if (parent?.role === 'assistant') {
      return { ...tree, activeNodeId: parent.id }
    }
  }

  return tree
}

export function addUserMessage(
  tree: ConversationTree,
  content: string,
): { tree: ConversationTree; userMessage: ChatMessage } {
  const userMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    parentId: tree.activeNodeId,
  }

  return {
    tree: {
      ...tree,
      messages: { ...tree.messages, [userMessage.id]: userMessage },
    },
    userMessage,
  }
}

export function addAssistantMessage(
  tree: ConversationTree,
  parentUserId: string,
  content: string,
): ConversationTree {
  const assistantMessage: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    parentId: parentUserId,
  }

  return {
    messages: { ...tree.messages, [assistantMessage.id]: assistantMessage },
    activeNodeId: assistantMessage.id,
  }
}

export function clearConversation(): ConversationTree {
  localStorage.removeItem(STORAGE_KEY)
  return createEmptyConversation()
}

export function getRootMessages(tree: ConversationTree): ChatMessage[] {
  return Object.values(tree.messages).filter((message) => message.parentId === null)
}
