"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StackOverflowService = void 0;
const axios_1 = __importDefault(require("axios"));
class StackOverflowService {
    constructor() {
        this.BASE_URL = 'https://api.stackexchange.com/2.3';
        this.SITE = 'stackoverflow';
        this.PAGE_SIZE = 10;
        this.REQUEST_DELAY = 1000; // Rate limiting
        this.lastRequestTime = 0;
    }
    async searchQuestions(query, limit = 5) {
        try {
            // Rate limiting
            await this.ensureRateLimit();
            const searchParams = new URLSearchParams({
                order: 'desc',
                sort: 'relevance',
                q: query,
                site: this.SITE,
                pagesize: Math.min(limit, this.PAGE_SIZE).toString(),
                filter: 'withbody'
            });
            const url = `${this.BASE_URL}/search/advanced?${searchParams}`;
            const response = await axios_1.default.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'OpenShift-AI-Assistant/2.0.0'
                }
            });
            if (!response.data || !response.data.items) {
                return [];
            }
            const questions = response.data.items.map((item) => ({
                question_id: item.question_id,
                title: item.title,
                score: item.score,
                answer_count: item.answer_count,
                tags: item.tags || [],
                creation_date: item.creation_date,
                last_activity_date: item.last_activity_date,
                is_answered: item.is_answered,
                accepted_answer_id: item.accepted_answer_id,
                link: item.link,
                body: this.cleanHtml(item.body || '')
            }));
            // Fetch answers for top questions
            const questionsWithAnswers = await this.fetchAnswersForQuestions(questions.slice(0, 3));
            return questionsWithAnswers;
        }
        catch (error) {
            console.error('Error searching Stack Overflow:', error);
            if (axios_1.default.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please try again later.');
                }
                if (error.response?.status === 400) {
                    throw new Error('Invalid search query. Please refine your search terms.');
                }
            }
            throw new Error(`Failed to search Stack Overflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getQuestionById(questionId) {
        try {
            await this.ensureRateLimit();
            const url = `${this.BASE_URL}/questions/${questionId}`;
            const params = new URLSearchParams({
                site: this.SITE,
                filter: 'withbody'
            });
            const response = await axios_1.default.get(`${url}?${params}`, {
                timeout: 10000
            });
            if (!response.data || !response.data.items || response.data.items.length === 0) {
                return null;
            }
            const item = response.data.items[0];
            const question = {
                question_id: item.question_id,
                title: item.title,
                score: item.score,
                answer_count: item.answer_count,
                tags: item.tags || [],
                creation_date: item.creation_date,
                last_activity_date: item.last_activity_date,
                is_answered: item.is_answered,
                accepted_answer_id: item.accepted_answer_id,
                link: item.link,
                body: this.cleanHtml(item.body || '')
            };
            // Fetch answers for this question
            const answers = await this.getAnswersForQuestion(questionId);
            question.answers = answers;
            return question;
        }
        catch (error) {
            console.error(`Error fetching question ${questionId}:`, error);
            return null;
        }
    }
    async getAnswersForQuestion(questionId) {
        try {
            await this.ensureRateLimit();
            const url = `${this.BASE_URL}/questions/${questionId}/answers`;
            const params = new URLSearchParams({
                site: this.SITE,
                order: 'desc',
                sort: 'votes',
                filter: 'withbody',
                pagesize: '5'
            });
            const response = await axios_1.default.get(`${url}?${params}`, {
                timeout: 10000
            });
            if (!response.data || !response.data.items) {
                return [];
            }
            return response.data.items.map((item) => ({
                answer_id: item.answer_id,
                score: item.score,
                is_accepted: item.is_accepted || false,
                creation_date: item.creation_date,
                body: this.cleanHtml(item.body || '')
            }));
        }
        catch (error) {
            console.error(`Error fetching answers for question ${questionId}:`, error);
            return [];
        }
    }
    async searchWithTags(tags, query, limit = 5) {
        try {
            await this.ensureRateLimit();
            const tagString = tags.join(';');
            const params = new URLSearchParams({
                order: 'desc',
                sort: 'votes',
                tagged: tagString,
                site: this.SITE,
                pagesize: Math.min(limit, this.PAGE_SIZE).toString(),
                filter: 'withbody'
            });
            if (query) {
                params.set('q', query);
            }
            const url = `${this.BASE_URL}/questions?${params}`;
            const response = await axios_1.default.get(url, {
                timeout: 10000
            });
            if (!response.data || !response.data.items) {
                return [];
            }
            return response.data.items.map((item) => ({
                question_id: item.question_id,
                title: item.title,
                score: item.score,
                answer_count: item.answer_count,
                tags: item.tags || [],
                creation_date: item.creation_date,
                last_activity_date: item.last_activity_date,
                is_answered: item.is_answered,
                accepted_answer_id: item.accepted_answer_id,
                link: item.link,
                body: this.cleanHtml(item.body || '')
            }));
        }
        catch (error) {
            console.error('Error searching Stack Overflow with tags:', error);
            throw new Error(`Failed to search with tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async getTopAnswersForTopic(topic) {
        try {
            const questions = await this.searchQuestions(`${topic} openshift kubernetes`, 3);
            const answers = [];
            for (const question of questions) {
                const questionAnswers = await this.getAnswersForQuestion(question.question_id);
                answers.push(...questionAnswers.slice(0, 2)); // Top 2 answers per question
            }
            // Sort by score and return top answers
            return answers.sort((a, b) => b.score - a.score).slice(0, 5);
        }
        catch (error) {
            console.error('Error getting top answers:', error);
            return [];
        }
    }
    async fetchAnswersForQuestions(questions) {
        const questionsWithAnswers = await Promise.all(questions.map(async (question) => {
            try {
                const answers = await this.getAnswersForQuestion(question.question_id);
                return { ...question, answers };
            }
            catch (error) {
                console.error(`Error fetching answers for question ${question.question_id}:`, error);
                return question;
            }
        }));
        return questionsWithAnswers;
    }
    cleanHtml(html) {
        // Remove HTML tags and decode entities
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
    }
    async ensureRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.REQUEST_DELAY) {
            const delay = this.REQUEST_DELAY - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        this.lastRequestTime = Date.now();
    }
    async isServiceAvailable() {
        try {
            const response = await axios_1.default.get(`${this.BASE_URL}/info?site=${this.SITE}`, {
                timeout: 5000
            });
            return response.status === 200;
        }
        catch {
            return false;
        }
    }
    buildOpenShiftQuery(userQuery) {
        const openShiftKeywords = ['openshift', 'kubernetes', 'k8s', 'redhat', 'container'];
        const hasOpenShiftKeyword = openShiftKeywords.some(keyword => userQuery.toLowerCase().includes(keyword));
        if (!hasOpenShiftKeyword) {
            return `${userQuery} openshift kubernetes`;
        }
        return userQuery;
    }
    getRelevantTags(query) {
        const commonTags = ['openshift', 'kubernetes', 'docker', 'containers'];
        const queryLower = query.toLowerCase();
        const tags = [];
        if (queryLower.includes('route') || queryLower.includes('ingress')) {
            tags.push('routing', 'networking');
        }
        if (queryLower.includes('pod') || queryLower.includes('deployment')) {
            tags.push('pod', 'deployment');
        }
        if (queryLower.includes('service')) {
            tags.push('service', 'networking');
        }
        if (queryLower.includes('storage') || queryLower.includes('volume')) {
            tags.push('storage', 'persistent-volumes');
        }
        if (queryLower.includes('security') || queryLower.includes('rbac')) {
            tags.push('security', 'authentication');
        }
        return [...new Set([...commonTags, ...tags])];
    }
}
exports.StackOverflowService = StackOverflowService;
//# sourceMappingURL=stackOverflowService.js.map