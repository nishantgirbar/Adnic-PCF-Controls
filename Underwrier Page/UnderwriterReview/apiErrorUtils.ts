export const getApiErrorMessage = (
    result: any,
    fallbackMessage: string
): string => {
    const message =
        typeof result?.message === "string"
            ? result.message.trim()
            : "";

    if (!message) {
        return fallbackMessage;
    }

    // The quote API can wrap the rating service response as an escaped JSON
    // object inside its own message. Extract the innermost useful message.
    const jsonStart = message.indexOf("{");
    const jsonEnd = message.lastIndexOf("}");

    if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
            const nestedError = JSON.parse(
                message.slice(jsonStart, jsonEnd + 1)
            );

            if (
                typeof nestedError?.message === "string" &&
                nestedError.message.trim()
            ) {
                return nestedError.message.trim();
            }
        } catch {
            // The outer API message is still more useful than the fallback.
        }
    }

    return message;
};
