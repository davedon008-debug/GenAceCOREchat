import Message from '../models/Message.js';
import Task from '../models/Task.js';

export const processAIQuery = async ({ action, conversationId, spaceId, queryText, personaId }) => {
  // Fetch conversation messages within strict boundary
  const filter = conversationId ? { conversationId } : { spaceId };
  const messages = await Message.find(filter)
    .populate('senderPersonaId', 'username displayName')
    .sort({ createdAt: -1 })
    .limit(30);

  const formattedMessages = messages.reverse().map(m => 
    `${m.senderPersonaId?.displayName || 'User'}: ${m.content}`
  ).join('\n');

  if (!formattedMessages) {
    return {
      summary: 'No messages found in this space yet to analyze.',
      decisions: [],
      suggestedTasks: []
    };
  }

  // Pure deterministic natural language processor for context analysis
  switch (action) {
    case 'CATCH_UP':
    case 'SUMMARIZE': {
      const lineCount = messages.length;
      const recentSenders = [...new Set(messages.map(m => m.senderPersonaId?.displayName).filter(Boolean))];
      const summaryText = `In the last ${lineCount} messages, ${recentSenders.join(', ')} discussed ongoing space activities. Key focus: "${messages[messages.length - 1]?.content.slice(0, 80) || 'Recent updates'}"`;
      
      const keyTopics = messages
        .filter(m => m.content.length > 20)
        .slice(-3)
        .map(m => `• ${m.senderPersonaId?.displayName}: "${m.content.slice(0, 60)}..."`);

      return {
        summary: summaryText,
        topics: keyTopics,
        analyzedMessageCount: lineCount
      };
    }

    case 'EXTRACT_DECISIONS': {
      const decisionKeywords = ['agree', 'decided', 'done', 'yes', 'let\'s', 'approved', 'sure', 'sounds good'];
      const decisions = messages
        .filter(m => decisionKeywords.some(kw => m.content.toLowerCase().includes(kw)))
        .map(m => ({
          author: m.senderPersonaId?.displayName,
          text: m.content,
          timestamp: m.createdAt
        }));

      return {
        summary: `Found ${decisions.length} confirmed decision(s) in conversation history.`,
        decisions: decisions.length > 0 ? decisions : [{ author: 'System', text: 'No explicit decision markers found yet.' }]
      };
    }

    case 'EXTRACT_TASKS': {
      const taskKeywords = ['todo', 'need to', 'will do', 'assign', 'task', 'build', 'create', 'fix'];
      const actionItems = messages
        .filter(m => taskKeywords.some(kw => m.content.toLowerCase().includes(kw)))
        .map(m => ({
          title: m.content,
          suggestedAssignee: m.senderPersonaId?.displayName
        }));

      return {
        summary: `Extracted ${actionItems.length} potential action item(s).`,
        actionItems
      };
    }

    case 'CUSTOM_QUERY':
    default: {
      const queryLower = (queryText || '').toLowerCase();
      let match = messages.find(m => m.content.toLowerCase().includes(queryLower));
      
      if (match) {
        return {
          answer: `Found relevant message from ${match.senderPersonaId?.displayName}: "${match.content}"`,
          foundMessage: match
        };
      }

      return {
        answer: `Processed query "${queryText}". Analyzed ${messages.length} scoped messages. No exact match found.`,
        scopedCount: messages.length
      };
    }
  }
};
