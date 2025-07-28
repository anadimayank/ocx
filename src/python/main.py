#!/usr/bin/env python3
"""
OpenShift AI Assistant - Python Service Manager
Entry point for all Python-based services and utilities
"""

import sys
import json
import traceback
from typing import Dict, Any, Optional

# Import services
from services.stackoverflow_service import StackOverflowService


class PythonServiceManager:
    """Main service manager for Python-based services"""

    def __init__(self):
        self.services = {
            'stackoverflow': StackOverflowService(),
        }

    def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming service requests"""
        try:
            service_name = request.get('service')
            params = request.get('params', {})

            if service_name == 'test':
                return {'success': True, 'message': 'Python service is working'}

            if service_name == 'check_package':
                return self.check_package(params.get('package'))

            if service_name not in self.services:
                return {
                    'success': False,
                    'error': f'Unknown service: {service_name}'
                }

            service = self.services[service_name]
            result = service.handle_request(params)

            return {
                'success': True,
                'data': result
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }

    def check_package(self, package_name: str) -> Dict[str, Any]:
        """Check if a Python package is installed"""
        try:
            __import__(package_name)
            return {'success': True, 'message': f'{package_name} is installed'}
        except ImportError:
            return {'success': False, 'message': f'{package_name} is not installed'}


def main():
    """Main entry point"""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()

        if not input_data.strip():
            print(json.dumps({
                'success': False,
                'error': 'No input data provided'
            }))
            sys.exit(1)

        # Parse request
        try:
            request = json.loads(input_data)
        except json.JSONDecodeError as e:
            print(json.dumps({
                'success': False,
                'error': f'Invalid JSON input: {str(e)}'
            }))
            sys.exit(1)

        # Process request
        service_manager = PythonServiceManager()
        response = service_manager.handle_request(request)

        # Output response
        print(json.dumps(response, indent=2))

    except Exception as e:
        error_response = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == '__main__':
    main()
