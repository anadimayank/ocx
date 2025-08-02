import axios from 'axios';
import { StackOverflowQuestion } from '../types';

/**
 * A service for interacting with the Stack Exchange API to search for
 * Stack Overflow questions. It does not require an API key for basic searches.
 */
export class StackOverflowService {
    private readonly baseUrl = 'https://api.stackexchange.com/2.3';

    /**
     * Searches Stack Overflow for questions related to OpenShift.
     * @param query The user's search query.
     * @param limit The maximum number of results to return.
     * @returns A promise that resolves to an array of StackOverflowQuestion objects.
     */
    async searchOpenShiftQuestions(query: string, limit: number = 5): Promise<StackOverflowQuestion[]> {
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
            const response = await axios.get(url, { timeout: 10000 });

            if (!response.data || !Array.isArray(response.data.items)) {
                return [];
            }

            // Map the API response to our custom type.
            return response.data.items.map((item: any): StackOverflowQuestion => ({
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

        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(`[StackOverflowService] API Error: ${error.message}`, error.response?.data);
            } else {
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
    private decodeHtmlEntities(text: string): string {
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
    async testConnection(): Promise<boolean> {
        const url = `${this.baseUrl}/info?site=stackoverflow`;
        console.log('[StackOverflowService] Testing connection...');
        try {
            const response = await axios.get(url, { timeout: 5000 });
            if (response.status === 200 && response.data.items) {
                console.log('[StackOverflowService] Connection successful.');
                return true;
            }
            return false;
        } catch (error) {
            console.error('[StackOverflowService] Connection test failed:', error);
            return false;
        }
    }
}
