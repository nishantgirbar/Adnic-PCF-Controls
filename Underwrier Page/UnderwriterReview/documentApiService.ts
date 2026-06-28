// documentApiService.ts

export const fetchMemberDocuments = async (
    documentApiUrl: string,
    quoteId: string
) => {

    const url =
        `${documentApiUrl}?referenceType=QUOTE&referenceId=${quoteId}`;

    console.log("DOCUMENT API:", url);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Failed to load documents");
    }

    return await response.json();
};