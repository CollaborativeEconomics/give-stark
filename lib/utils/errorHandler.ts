class ErrorHandler {
    static logError(error: Error) {
        // Log the error to an external service or console
        console.error("Logged Error:", error);
        // Optionally, send the error to a logging service
    }

    static displayError(message: string) {
        // Display a user-friendly error message
        alert(message); // Replace with a more user-friendly UI component if needed
    }

    static handleError(error: Error, userMessage: string) {
        this.logError(error);
        this.displayError(userMessage);
    }
}

export default ErrorHandler;