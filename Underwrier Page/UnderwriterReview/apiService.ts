export const fetchQuoteData = async (apiUrl: string, quoteId: string, quoteNumber: string) => {

    const url = `${apiUrl}/${quoteId}?isUnderwriter=true`;
 

    const res = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_TOKEN"
        }
    });

    if (!res.ok) {
        throw new Error("API failed");
    }

    return await res.json();
};