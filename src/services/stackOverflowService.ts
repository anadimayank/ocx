import * as vscode from 'vscode';
import axios from 'axios';
import { StackOverflowQuestion, StackOverflowAnswer, PythonServiceResponse } from '../types';

export class StackOverflowService {
    private readonly BASE_URL = 'https://api.stackexchange.com/2.3';
    private readonly SITE = 'stackoverflow';
    private readonly PAGE_SIZE = 10;
    private readonly REQUEST_DELAY = 1000; // Rate limiting
    private lastRequestTime = 0;

    constructor() {}

    async searchQuestions(query: string, limit: number = 5): Promise<StackOverflowQuestion[]> {
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
            const response = await axios.get(url, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'OpenShift-AI-Assistant/2.0.0'
                }
            });

            if (!response.data || !response.data.items) {
                return [];
            }

            const questions: StackOverflowQuestion[] = response.data.items.map((item: any) => ({
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

        } catch (error) {
            console.error('Error searching Stack Overflow:', error);
            if (axios.isAxiosError(error)) {
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

    async getQuestionById(questionId: number): Promise<StackOverflowQuestion | null> {
        try {
            await this.ensureRateLimit();

            const url = `${this.BASE_URL}/questions/${questionId}`;
            const params = new URLSearchParams({
                site: this.SITE,
                filter: 'withbody'
            });

            const response = await axios.get(`${url}?${params}`, {
                timeout: 10000
            });

            if (!response.data || !response.data.items || response.data.items.length === 0) {
                return null;
            }

            const item = response.data.items[0];
            const question: StackOverflowQuestion = {
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

        } catch (error) {
            console.error(`Error fetching question ${questionId}:`, error);
            return null;
        }
    }

    async getAnswersForQuestion(questionId: number): Promise<StackOverflowAnswer[]> {
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

            const response = await axios.get(`${url}?${params}`, {
                timeout: 10000
            });

            if (!response.data || !response.data.items) {
                return [];
            }

            return response.data.items.map((item: any) => ({
                answer_id: item.answer_id,
                score: item.score,
                is_accepted: item.is_accepted || false,
                creation_date: item.creation_date,
                body: this.cleanHtml(item.body || '')
            }));

        } catch (error) {
            console.error(`Error fetching answers for question ${questionId}:`, error);
            return [];
        }
    }

    async searchWithTags(tags: string[], query?: string, limit: number = 5): Promise<StackOverflowQuestion[]> {
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
            const response = await axios.get(url, {
                timeout: 10000
            });

            if (!response.data || !response.data.items) {
                return [];
            }

            return response.data.items.map((item: any) => ({
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

        } catch (error) {
            console.error('Error searching Stack Overflow with tags:', error);
            throw new Error(`Failed to search with tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async getTopAnswersForTopic(topic: string): Promise<StackOverflowAnswer[]> {
        try {
            const questions = await this.searchQuestions(`${topic} openshift kubernetes`, 3);
            const answers: StackOverflowAnswer[] = [];

            for (const question of questions) {
                const questionAnswers = await this.getAnswersForQuestion(question.question_id);
                answers.push(...questionAnswers.slice(0, 2)); // Top 2 answers per question
            }

            // Sort by score and return top answers
            return answers.sort((a, b) => b.score - a.score).slice(0, 5);

        } catch (error) {
            console.error('Error getting top answers:', error);
            return [];
        }
    }

    private async fetchAnswersForQuestions(questions: StackOverflowQuestion[]): Promise<StackOverflowQuestion[]> {
        const questionsWithAnswers = await Promise.all(
            questions.map(async (question) => {
                try {
                    const answers = await this.getAnswersForQuestion(question.question_id);
                    return { ...question, answers };
                } catch (error) {
                    console.error(`Error fetching answers for question ${question.question_id}:`, error);
                    return question;
                }
            })
        );

        return questionsWithAnswers;
    }

    private cleanHtml(html: string): string {
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

    private async ensureRateLimit(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.REQUEST_DELAY) {
            const delay = this.REQUEST_DELAY - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.lastRequestTime = Date.now();
    }

    async isServiceAvailable(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.BASE_URL}/info?site=${this.SITE}`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    buildOpenShiftQuery(userQuery: string): string {
        const openShiftKeywords = ['openshift', 'kubernetes', 'k8s', 'redhat', 'container'];
        const hasOpenShiftKeyword = openShiftKeywords.some(keyword => 
            userQuery.toLowerCase().includes(keyword)
        );

        if (!hasOpenShiftKeyword) {
            return `${userQuery} openshift kubernetes`;
        }

        return userQuery;
    }

    getRelevantTags(query: string): string[] {
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
