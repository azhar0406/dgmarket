// lib/utils/error-handling.ts
// Utility functions for better error handling

/**
 * Safely extract error message from unknown error type
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as any).message);
    }
    
    return 'Unknown error occurred';
  }
  
  /**
   * Create error with context for better debugging
   */
  export function createContextualError(
    context: string, 
    originalError: unknown, 
    additionalInfo?: any
  ): Error {
    const message = getErrorMessage(originalError);
    const contextualMessage = `${context}: ${message}`;
    
    if (process.env.NODE_ENV === 'development' && additionalInfo) {
      console.error(`🐛 ${context}:`, {
        originalError,
        additionalInfo,
        timestamp: new Date().toISOString()
      });
    }
    
    return new Error(contextualMessage);
  }
  
  /**
   * Handle API errors with better messages
   */
  export function handleAPIError(error: unknown, apiName: string): never {
    const message = getErrorMessage(error);
    
    // Check for common API error patterns
    if (message.includes('401') || message.includes('Unauthorized')) {
      throw new Error(`${apiName} API authentication failed. Check your API credentials.`);
    }
    
    if (message.includes('403') || message.includes('Forbidden')) {
      throw new Error(`${apiName} API access denied. Check your API permissions.`);
    }
    
    if (message.includes('429') || message.includes('rate limit')) {
      throw new Error(`${apiName} API rate limit exceeded. Please try again later.`);
    }
    
    if (message.includes('Network Error') || message.includes('ECONNREFUSED')) {
      throw new Error(`${apiName} API connection failed. Check your internet connection.`);
    }
    
    throw new Error(`${apiName} API error: ${message}`);
  }
  
  /**
   * Format error for user display (removes technical details)
   */
  export function formatUserError(error: unknown): string {
    const message = getErrorMessage(error);
    
    // User-friendly error messages
    const userFriendlyErrors: Record<string, string> = {
      'insufficient funds': 'You don\'t have enough funds for this transaction',
      'user rejected': 'Transaction was cancelled',
      'gas too low': 'Transaction failed due to insufficient gas',
      'nonce too low': 'Transaction failed. Please try again',
      'replacement transaction underpriced': 'Transaction failed. Please try again with higher gas',
      'already known': 'Transaction is already pending',
      'network error': 'Network connection error. Please check your internet',
      'timeout': 'Transaction timed out. Please try again'
    };
    
    // Check for user-friendly matches
    for (const [pattern, friendlyMsg] of Object.entries(userFriendlyErrors)) {
      if (message.toLowerCase().includes(pattern)) {
        return friendlyMsg;
      }
    }
    
    // Return simplified technical message
    return message.split(':')[0] || 'Transaction failed';
  }