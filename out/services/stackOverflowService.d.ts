import { StackOverflowQuestion } from '../types';
/**
 * A service for interacting with the Stack Exchange API to search for
 * Stack Overflow questions. It does not require an API key for basic searches.
 */
export declare class StackOverflowService {
    private readonly baseUrl;
    /**
     * Searches Stack Overflow for questions related to OpenShift.
     * @param query The user's search query.
     * @param limit The maximum number of results to return.
     * @returns A promise that resolves to an array of StackOverflowQuestion objects.
     */
    searchOpenShiftQuestions(query: string, limit?: number): Promise<StackOverflowQuestion[]>;
    /**
     * A simple utility to decode common HTML entities found in titles.
     * @param text The text to decode.
     * @returns The decoded text.
     */
    private decodeHtmlEntities;
    /**
     * Tests the connection to the Stack Exchange API.
     * @returns A promise that resolves to true if the connection is successful, otherwise false.
     */
    testConnection(): Promise<boolean>;
}
//# sourceMappingURL=stackOverflowService.d.ts.map