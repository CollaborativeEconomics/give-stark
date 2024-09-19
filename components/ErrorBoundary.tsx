import React, { Component } from 'react';
import { useToast } from './hooks/use-toast';
import ErrorHandler from '@/lib/utils/errorHandler';

class ErrorBoundary extends Component<{ children: React.ReactNode }> {
    state = { hasError: false };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        ErrorHandler.logError(error);
    }

    render() {
        if (this.state.hasError) {
            return <h1>Something went wrong.</h1>; // User-friendly fallback UI
        }

        return this.props.children; 
    }
}

export default ErrorBoundary;