export class ApiService {

    public static async load(
        apiUrl: string,
        productCode: string
    ): Promise<any> {

        const response =
            await fetch(
                `${apiUrl}?product=${productCode}`
            );

        return await response.json();
    }
}