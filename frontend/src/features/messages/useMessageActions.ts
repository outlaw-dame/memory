/**
 * useMessageActions - Composable for handling message actions
 * 
 * Provides functionality for message operations like copy, reply, delete, etc.
 * Manages action state and provides helper methods for common actions.
 * 
 * Security considerations:
 * - No sensitive data in action definitions
 * - Confirmation required for destructive actions
 * - No automatic execution without user intent
 * - Action IDs are opaque
 */

import { computed, ref } from 'vue'
import type { MessageAction, MessageActionType, MessageItem } from './types'

export interface UseMessageActionsOptions {
  /** Custom action definitions */
  customActions?: MessageAction[]
  /** Whether to include default actions */
  includeDefaults?: boolean
  /** Confirmation required for destructive actions */
  requireConfirmation?: boolean
}

export interface UseMessageActionsReturn {
  /** All available actions */
  actions: MessageAction[]
  /** Primary actions (non-destructive) */
  primaryActions: MessageAction[]
  /** Destructive actions */
  destructiveActions: MessageAction[]
  /** Whether an action is pending confirmation */
  pendingConfirmation: string | null
  
  /** Get actions for a specific message */
  getMessageActions: (message: MessageItem) => MessageAction[]
  /** Execute an action */
  execute: (actionId: string, messageId: string, message?: MessageItem) => Promise<boolean>
  /** Cancel pending confirmation */
  cancelConfirmation: () => void
  /** Confirm pending action */
  confirmAction: (actionId: string, messageId: string) => Promise<boolean>
  /** Create action definition */
  createAction: (options: Omit<MessageAction, 'id' | 'action'> & { onAction?: () => void | Promise<void> }) => MessageAction
}

/**
 * Default action definitions
 */
const DEFAULT_ACTIONS: Record<MessageActionType, Omit<MessageAction, 'id'>> = {
  copy: {
    label: 'Copy',
    type: 'copy',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation - can be overridden
      return
    },
  },
  reply: {
    label: 'Reply',
    type: 'reply',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation
      return
    },
  },
  forward: {
    label: 'Forward',
    type: 'forward',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation
      return
    },
  },
  delete: {
    label: 'Delete',
    type: 'delete',
    destructive: true,
    disabled: false,
    requiresConfirmation: true,
    action: () => {
      // Default implementation
      return
    },
  },
  report: {
    label: 'Report',
    type: 'report',
    destructive: true,
    disabled: false,
    requiresConfirmation: true,
    action: () => {
      // Default implementation
      return
    },
  },
  mute: {
    label: 'Mute',
    type: 'mute',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation
      return
    },
  },
  block: {
    label: 'Block',
    type: 'block',
    destructive: true,
    disabled: false,
    requiresConfirmation: true,
    action: () => {
      // Default implementation
      return
    },
  },
  retry: {
    label: 'Retry',
    type: 'retry',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation
      return
    },
  },
  viewAttachment: {
    label: 'View',
    type: 'viewAttachment',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation
      return
    },
  },
  saveAttachment: {
    label: 'Save',
    type: 'saveAttachment',
    destructive: false,
    disabled: false,
    requiresConfirmation: false,
    action: () => {
      // Default implementation
      return
    },
  },
}

/**
 * Generate unique action ID
 */
function generateActionId(type: MessageActionType): string {
  return `action-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
}

/**
 * Get actions for a specific message based on its state
 */
function getActionsForMessage(
  message: MessageItem,
  allActions: MessageAction[]
): MessageAction[] {
  return allActions.filter(action => {
    // Always allow if not disabled
    if (action.disabled) return false
    
    // Special handling for certain action types
    switch (action.type) {
      case 'retry':
        // Only show retry for failed messages
        return message.deliveryState === 'failed'
      case 'delete':
        // Only show delete for outgoing messages
        return message.direction === 'outgoing'
      case 'viewAttachment':
      case 'saveAttachment':
        // Only show attachment actions if message has attachments
        return !!(message.attachments && message.attachments.length > 0)
      default:
        return true
    }
  })
}

/**
 * Main composable function
 */
export function useMessageActions(options: UseMessageActionsOptions = {}): UseMessageActionsReturn {
  const { 
    customActions = [], 
    includeDefaults = true, 
    requireConfirmation = true 
  } = options
  
  const pendingConfirmation = ref<string | null>(null)
  
  // Build full list of actions
  const allActions = computed<MessageAction[]>(() => {
    const actions: MessageAction[] = []
    
    // Add default actions
    if (includeDefaults) {
      Object.entries(DEFAULT_ACTIONS).forEach(([type, action]) => {
        actions.push({
          ...action,
          id: generateActionId(type as MessageActionType),
        })
      })
    }
    
    // Add custom actions
    customActions.forEach(action => {
      actions.push({
        ...action,
        id: action.id || generateActionId(action.type),
      })
    })
    
    return actions
  })
  
  const actions = allActions
  
  const primaryActions = computed(() => {
    return actions.value.filter(a => !a.destructive)
  })
  
  const destructiveActions = computed(() => {
    return actions.value.filter(a => a.destructive)
  })
  
  /**
   * Get actions for a specific message
   */
  function getMessageActions(message: MessageItem): MessageAction[] {
    return getActionsForMessage(message, actions.value)
  }
  
  /**
   * Execute an action
   */
  async function execute(actionId: string, messageId: string, message?: MessageItem): Promise<boolean> {
    const action = actions.value.find(a => a.id === actionId)
    if (!action) return false
    
    // Check if confirmation is required
    if (action.requiresConfirmation && requireConfirmation) {
      pendingConfirmation.value = actionId
      return false
    }
    
    // Execute the action
    try {
      await action.action()
      return true
    } catch {
      return false
    }
  }
  
  /**
   * Confirm pending action
   */
  async function confirmAction(actionId: string, messageId: string): Promise<boolean> {
    if (pendingConfirmation.value !== actionId) return false
    
    const action = actions.value.find(a => a.id === actionId)
    if (!action) return false
    
    try {
      await action.action()
      pendingConfirmation.value = null
      return true
    } catch {
      pendingConfirmation.value = null
      return false
    }
  }
  
  /**
   * Cancel pending confirmation
   */
  function cancelConfirmation(): void {
    pendingConfirmation.value = null
  }
  
  /**
   * Create an action definition
   */
  function createAction(options: Omit<MessageAction, 'id' | 'action'> & { onAction?: () => void | Promise<void> }): MessageAction {
    return {
      id: generateActionId(options.type),
      label: options.label,
      type: options.type,
      destructive: options.destructive ?? false,
      disabled: options.disabled ?? false,
      requiresConfirmation: options.requiresConfirmation ?? false,
      action: options.onAction ?? (() => {}),
    }
  }
  
  return {
    actions,
    primaryActions,
    destructiveActions,
    pendingConfirmation,
    getMessageActions,
    execute,
    confirmAction,
    cancelConfirmation,
    createAction,
  }
}

export default useMessageActions
