import * as React from "react";
import "./css/PolicyDocumentControl.css";

export const PolicyDocumentControl  = ({
    context,
    apiBaseUrl
}: any) => {

    const [loading, setLoading] =
        React.useState(true);

    const [documents, setDocuments] =
        React.useState<any[]>([]);

    React.useEffect(() => {

        loadDocuments();

    }, []);

    const loadDocuments = async () => {

        try {

            setLoading(true);

            const response = await fetch(
                `${apiBaseUrl}/document-service/api/v1/document-types/category/QUOTATION`
            );

            const result =
                await response.json();

            result.sort(
                (a: any, b: any) =>
                    a.sortOrder - b.sortOrder
            );

            setDocuments(
                result.map((d: any) => ({
                    ...d,
                    uploadedFiles: []
                }))
            );

        } catch (e) {

            console.error(e);

        } finally {

            setLoading(false);
        }
    };

    const uploadDocument = async (
        document: any,
        file: File
    ) => {

        try {

            const formData =
                new FormData();

            formData.append(
                "referenceType",
                "QUOTATION"
            );

            formData.append(
                "referenceId",
                context.parameters.referenceId.raw || ""
            );

            formData.append(
                "documentCategory",
                "QUOTATION"
            );

            formData.append(
                "documentType",
                document.name
            );

            formData.append(
                "documentTypeId",
                document.id.toString()
            );

            formData.append(
                "file",
                file
            );

            await fetch(
                `${apiBaseUrl}/document-service/api/v1/documents/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );

            const updated =
                [...documents];

            const row =
                updated.find(
                    x => x.id === document.id
                );

            if (row) {

                row.uploadedFiles.push({
                    fileName: file.name
                });
            }

            setDocuments(updated);

        } catch (e) {

            console.error(e);
        }
    };

    const deleteDocument = (
        documentId: number,
        index: number
    ) => {

        const updated =
            [...documents];

        const row =
            updated.find(
                x => x.id === documentId
            );

        if (!row) return;

        row.uploadedFiles.splice(
            index,
            1
        );

        setDocuments(updated);
    };

    if (loading) {

        return (
            <div className="loading">
                Loading Documents...
            </div>
        );
    }

    return (

        <div className="policy-container">

            <div className="header">
               Upload Documents
            </div>

            <div className="document-list">

                {
                    documents.map(doc => (

                        <div
                            key={doc.id}
                            className={
                                doc.isMandatory
                                    ? "document-row mandatory"
                                    : "document-row"
                            }
                        >

                            <div className="document-name">

                                {
                                    doc.isMandatory &&
                                    <span className="mandatory-star">*</span>
                                }

                                {doc.name}

                            </div>

                            <div className="upload-section">

                                <label className="upload-btn">

                                    ☁ Upload

                                    <input
                                        type="file"
                                        hidden
                                        onChange={(e) => {

                                            if (
                                                e.target.files &&
                                                e.target.files.length > 0
                                            ) {

                                                uploadDocument(
                                                    doc,
                                                    e.target.files[0]
                                                );
                                            }
                                        }}
                                    />

                                </label>

                            </div>

                            <div className="file-section">

                                {
                                    doc.uploadedFiles.map(
                                        (
                                            file: any,
                                            index: number
                                        ) => (

                                            <div
                                                key={index}
                                                className="file-row"
                                            >

                                                <span>
                                                    {file.fileName}
                                                </span>

                                                <button
                                                    className="icon-btn"
                                                >
                                                    ↓
                                                </button>

                                                <button
                                                    className="icon-btn delete"
                                                    onClick={() =>
                                                        deleteDocument(
                                                            doc.id,
                                                            index
                                                        )
                                                    }
                                                >
                                                    🗑
                                                </button>

                                            </div>

                                        )
                                    )
                                }

                            </div>

                        </div>

                    ))
                }

            </div>

        </div>
    );
};