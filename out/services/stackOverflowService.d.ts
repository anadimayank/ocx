import { StackOverflowQuestion, StackOverflowAnswer } from '../types';
export declare class StackOverflowService {
    private readonly BASE_URL;
    private readonly SITE;
    private readonly PAGE_SIZE;
    private readonly REQUEST_DELAY;
    private lastRequestTime;
    constructor();
    searchQuestions(query: string, limit?: number): Promise<StackOverflowQuestion[]>;
    getQuestionById(questionId: number): Promise<StackOverflowQuestion | null>;
    getAnswersForQuestion(questionId: number): Promise<StackOverflowAnswer[]>;
    searchWithTags(tags: string[], query?: string, limit?: number): Promise<StackOverflowQuestion[]>;
    getTopAnswersForTopic(topic: string): Promise<StackOverflowAnswer[]>;
    private fetchAnswersForQuestions;
    private cleanHtml;
    private ensureRateLimit;
    isServiceAvailable(): Promise<boolean>;
    buildOpenShiftQuery(userQuery: string): string;
    getRelevantTags(query: string): string[];
}
//# sourceMappingURL=stackOverflowService.d.ts.map