"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackOverflowService = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * A service for interacting with the Stack Exchange API to search for
 * Stack Overflow questions. It does not require an API key for basic searches.
 */
class StackOverflowService {
    constructor() {
        this.baseUrl = 'https://api.stackexchange.com/2.3';
    }
    /**
     * Searches Stack Overflow for questions related to OpenShift.
     * @param query The user's search query.
     * @param limit The maximum number of results to return.
     * @returns A promise that resolves to an array of StackOverflowQuestion objects.
     */
    async searchOpenShiftQuestions(query, limit = 5) {
        const params = new URLSearchParams({
            order: 'desc',
            sort: 'relevance',
            // Use the 'tagged' parameter for more accurate tag-based searching.
            tagged: 'openshift',
            // Use the 'intitle' parameter to search for the query within the question title,
            // which provides more relevant results than a full-text search ('q').
            intitle: query,
            site: 'stackoverflow',
            pagesize: limit.toString(),
        });
        const url = `${this.baseUrl}/search/advanced?${params}`;
        console.log(`[StackOverflowService] Searching with URL: ${url}`);
        try {
            const response = await axios_1.default.get(url, { timeout: 10000 });
            if (!response.data || !Array.isArray(response.data.items)) {
                return [];
            }
            // Map the API response to our custom type.
            return response.data.items.map((item) => ({
                question_id: item.question_id,
                title: this.decodeHtmlEntities(item.title),
                score: item.score,
                answer_count: item.answer_count,
                tags: item.tags || [],
                link: item.link,
                is_answered: item.is_answered,
                creation_date: item.creation_date,
                last_activity_date: item.last_activity_date
            }));
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error(`[StackOverflowService] API Error: ${error.message}`, error.response?.data);
            }
            else {
                console.error(`[StackOverflowService] Generic Error:`, error);
            }
            // Re-throw to be handled by the chat provider.
            throw new Error('Failed to retrieve search results from Stack Overflow.');
        }
    }
    /**
     * A simple utility to decode common HTML entities found in titles.
     * @param text The text to decode.
     * @returns The decoded text.
     */
    decodeHtmlEntities(text) {
        return text
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'");
    }
    /**
     * Tests the connection to the Stack Exchange API.
     * @returns A promise that resolves to true if the connection is successful, otherwise false.
     */
    async testConnection() {
        const url = `${this.baseUrl}/info?site=stackoverflow`;
        console.log('[StackOverflowService] Testing connection...');
        try {
            const response = await axios_1.default.get(url, { timeout: 5000 });
            if (response.status === 200 && response.data.items) {
                console.log('[StackOverflowService] Connection successful.');
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('[StackOverflowService] Connection test failed:', error);
            return false;
        }
    }
}
exports.StackOverflowService = StackOverflowService;
//# sourceMappingURL=stackOverflowService.js.map