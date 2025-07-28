#!/usr/bin/env python3
"""
Stack Overflow service for OpenShift AI Assistant
Provides advanced Stack Overflow API integration using StackAPI library
"""

import time
import re
from typing import Dict, List, Any, Optional
from stackapi import StackAPI
import requests
from html import unescape


class StackOverflowService:
    """Advanced Stack Overflow integration service"""

    def __init__(self):
        self.site = StackAPI('stackoverflow')
        self.site.page_size = 10
        self.site.max_pages = 1
        self.last_request_time = 0
        self.rate_limit_delay = 1.0  # seconds

        # Configure StackAPI
        self.site.impose_throttling = True

    def handle_request(self, params: Dict[str, Any]) -> Any:
        """Handle incoming requests"""
        action = params.get('action')

        if action == 'search':
            return self.search_questions(
                params.get('query', ''),
                params.get('limit', 5)
            )
        elif action == 'get_answers':
            return self.get_answers_for_question(params.get('question_id'))
        elif action == 'search_with_tags':
            return self.search_with_tags(
                params.get('tags', []),
                params.get('query')
            )
        else:
            raise ValueError(f"Unknown action: {action}")

    def search_questions(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search Stack Overflow questions"""
        try:
            self._ensure_rate_limit()

            # Enhance query for OpenShift context
            enhanced_query = self._enhance_openshift_query(query)

            # Search questions
            questions = self.site.fetch('search/advanced', 
                                     q=enhanced_query,
                                     order='desc',
                                     sort='relevance',
                                     pagesize=min(limit, 10),
                                     filter='withbody')

            if not questions.get('items'):
                return []

            results = []
            for item in questions['items'][:limit]:
                question_data = {
                    'question_id': item.get('question_id'),
                    'title': item.get('title', ''),
                    'score': item.get('score', 0),
                    'answer_count': item.get('answer_count', 0),
                    'tags': item.get('tags', []),
                    'creation_date': item.get('creation_date'),
                    'last_activity_date': item.get('last_activity_date'),
                    'is_answered': item.get('is_answered', False),
                    'accepted_answer_id': item.get('accepted_answer_id'),
                    'link': item.get('link', ''),
                    'body': self._clean_html(item.get('body', ''))
                }

                # Fetch top answers for the question
                answers = self.get_answers_for_question(item.get('question_id'), limit=2)
                question_data['answers'] = answers

                results.append(question_data)

            return results

        except Exception as e:
            print(f"Error searching questions: {str(e)}")
            return []

    def get_answers_for_question(self, question_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """Get answers for a specific question"""
        if not question_id:
            return []

        try:
            self._ensure_rate_limit()

            answers = self.site.fetch(f'questions/{question_id}/answers',
                                    order='desc',
                                    sort='votes',
                                    pagesize=min(limit, 10),
                                    filter='withbody')

            if not answers.get('items'):
                return []

            results = []
            for item in answers['items'][:limit]:
                answer_data = {
                    'answer_id': item.get('answer_id'),
                    'score': item.get('score', 0),
                    'is_accepted': item.get('is_accepted', False),
                    'creation_date': item.get('creation_date'),
                    'body': self._clean_html(item.get('body', ''))
                }
                results.append(answer_data)

            return results

        except Exception as e:
            print(f"Error fetching answers for question {question_id}: {str(e)}")
            return []

    def search_with_tags(self, tags: List[str], query: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search questions with specific tags"""
        try:
            self._ensure_rate_limit()

            # Ensure OpenShift/Kubernetes tags are included
            enhanced_tags = self._enhance_tags_for_openshift(tags)
            tag_string = ';'.join(enhanced_tags)

            params = {
                'tagged': tag_string,
                'order': 'desc',
                'sort': 'votes',
                'pagesize': 10,
                'filter': 'withbody'
            }

            if query:
                params['q'] = self._enhance_openshift_query(query)

            questions = self.site.fetch('questions', **params)

            if not questions.get('items'):
                return []

            results = []
            for item in questions['items'][:5]:
                question_data = {
                    'question_id': item.get('question_id'),
                    'title': item.get('title', ''),
                    'score': item.get('score', 0),
                    'answer_count': item.get('answer_count', 0),
                    'tags': item.get('tags', []),
                    'creation_date': item.get('creation_date'),
                    'last_activity_date': item.get('last_activity_date'),
                    'is_answered': item.get('is_answered', False),
                    'accepted_answer_id': item.get('accepted_answer_id'),
                    'link': item.get('link', ''),
                    'body': self._clean_html(item.get('body', ''))
                }

                # Fetch top answer
                answers = self.get_answers_for_question(item.get('question_id'), limit=1)
                question_data['answers'] = answers

                results.append(question_data)

            return results

        except Exception as e:
            print(f"Error searching with tags: {str(e)}")
            return []

    def get_top_openshift_questions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top OpenShift-related questions"""
        openshift_tags = ['openshift', 'kubernetes', 'k8s', 'redhat']
        return self.search_with_tags(openshift_tags)

    def _enhance_openshift_query(self, query: str) -> str:
        """Enhance query with OpenShift-specific terms"""
        query_lower = query.lower()

        # If already contains OpenShift/Kubernetes terms, return as-is
        openshift_terms = ['openshift', 'kubernetes', 'k8s', 'redhat', 'ocp']
        if any(term in query_lower for term in openshift_terms):
            return query

        # Add relevant terms based on content
        if any(term in query_lower for term in ['pod', 'deployment', 'service', 'route', 'ingress']):
            return f"{query} openshift kubernetes"

        return f"{query} openshift"

    def _enhance_tags_for_openshift(self, tags: List[str]) -> List[str]:
        """Ensure OpenShift-related tags are included"""
        enhanced_tags = list(tags)

        # Always include core tags if not present
        core_tags = ['openshift', 'kubernetes']
        for tag in core_tags:
            if tag not in enhanced_tags:
                enhanced_tags.append(tag)

        return enhanced_tags

    def _clean_html(self, html_content: str) -> str:
        """Clean HTML content and convert to plain text"""
        if not html_content:
            return ""

        # Unescape HTML entities
        text = unescape(html_content)

        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()

        return text

    def _ensure_rate_limit(self):
        """Ensure rate limiting between requests"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.rate_limit_delay:
            sleep_time = self.rate_limit_delay - time_since_last
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    def test_connection(self) -> bool:
        """Test Stack Overflow API connection"""
        try:
            self._ensure_rate_limit()
            info = self.site.fetch('info')
            return 'items' in info
        except Exception:
            return False

    def get_api_quota(self) -> Dict[str, Any]:
        """Get current API quota information"""
        try:
            info = self.site.fetch('info')
            if 'quota_remaining' in info:
                return {
                    'quota_remaining': info['quota_remaining'],
                    'quota_max': info.get('quota_max', 'unknown'),
                    'has_more': info.get('has_more', False)
                }
        except Exception:
            pass

        return {'quota_remaining': 'unknown', 'quota_max': 'unknown', 'has_more': False}
