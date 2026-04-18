/**
 * API Error Handler Utility
 * Handles Pydantic validation errors and other API error formats
 */

/**
 * Converts API error response to a user-friendly error message
 * @param {Object} errorData - The error data from the API response
 * @param {number} statusCode - HTTP status code
 * @returns {string} User-friendly error message
 */
export function formatApiError(errorData, statusCode) {
  // Handle Pydantic validation errors (422 responses)
  // Structure: { detail: [{ type, loc, msg, input, url }, ...] }
  if (Array.isArray(errorData.detail)) {
    const errorMessages = errorData.detail
      .map(err => {
        // Extract the message from the error object
        if (typeof err === 'string') {
          return err;
        }
        if (err.msg) {
          return err.msg;
        }
        // Fallback: stringify the error object
        return JSON.stringify(err);
      })
      .join(', ');
    return errorMessages;
  }
  
  // Handle string detail
  if (typeof errorData.detail === 'string') {
    return errorData.detail;
  }
  
  // Handle object detail (shouldn't happen, but be safe)
  if (typeof errorData.detail === 'object' && errorData.detail !== null) {
    if (errorData.detail.msg) {
      return errorData.detail.msg;
    }
    return JSON.stringify(errorData.detail);
  }
  
  // Fallback to status code
  return `HTTP error! status: ${statusCode}`;
}

/**
 * Handles API response and throws formatted errors
 * @param {Response} response - Fetch API response object
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} Formatted error message
 */
export async function handleApiResponse(response) {
  // Check content type first
  const contentType = response.headers.get('content-type');
  const isJSON = contentType && contentType.includes('application/json');

  if (!response.ok) {
    try {
      // Only try to parse as JSON if content-type indicates JSON
      if (isJSON) {
        const errorData = await response.json();
        const errorMessage = formatApiError(errorData, response.status);
        throw new Error(errorMessage);
      } else {
        // If not JSON, read as text for better debugging
        const errorText = await response.text();
        console.error(`Non-JSON error response (${response.status}):`, errorText.substring(0, 200));
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (jsonError) {
      // If response is not JSON, throw status error
      if (jsonError instanceof SyntaxError) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Re-throw the formatted error
      throw jsonError;
    }
  }

  // For successful responses, also check content type
  if (!isJSON) {
    const text = await response.text();
    console.error('Expected JSON but received:', text.substring(0, 200));
    throw new Error('Server returned non-JSON response. Expected JSON.');
  }

  return response.json();
}
