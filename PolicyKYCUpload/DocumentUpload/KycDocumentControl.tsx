import * as React from "react";
import "./css/KycDocumentControl.css";

export const KycDocumentControl = ({
    context,
    apiBaseUrl
}: any) => {

    const [loading, setLoading] = React.useState(true);
    const [multipleEntities, setMultipleEntities] = React.useState(false);
    const [entityCount, setEntityCount] = React.useState(1);
    const [activeEntity, setActiveEntity] = React.useState(1);
    const [entityTypes, setEntityTypes] = React.useState<string[]>([]);
    const [mandatoryDocs, setMandatoryDocs] = React.useState<any>({});

    const [entities, setEntities] = React.useState<any[]>([
        {
            entityNumber: 1,
            entityType: "",
            documents: {}
        }
    ]);

    React.useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {

        try {

            setLoading(true);

            const response = await fetch(
                `${apiBaseUrl}/document-service/api/v1/document-types/entity-type-mappings/KYC`
            );

            const result = await response.json();

            setEntityTypes(result.entityTypes || []);
            setMandatoryDocs(result.mandatoryDocs || {});

        } catch (e) {

            console.error(e);

        } finally {

            setLoading(false);
        }
    };

    const createEntities = (count: number) => {

        const rows = [];

        for (let i = 1; i <= count; i++) {

            rows.push({
                entityNumber: i,
                entityType: "",
                documents: {}
            });
        }

        setEntities(rows);
        setActiveEntity(1);
    };

    const updateEntityType = (
        entityNo: number,
        value: string
    ) => {

        const updated = [...entities];

        const entity = updated.find(
            x => x.entityNumber === entityNo
        );

        if (!entity) return;

        entity.entityType = value;

        setEntities(updated);
    };

const uploadDocument = async (
    entityNo: number,
    documentType: string,
    file: File
) => {

    try {

        const formData = new FormData();

        formData.append("referenceType", "POLICY");
        formData.append(
            "referenceId",
            context.parameters.referenceId.raw || ""
        );

        formData.append("documentCategory", "KYC");
        formData.append("documentType", documentType);
        formData.append("file", file);
        formData.append("entityName", `Entity ${entityNo}`);
        formData.append("entityNumber", entityNo.toString());
        formData.append("isMandatory", "true");

        await fetch(
            `${apiBaseUrl}/document-service/api/v1/documents/upload`,
            {
                method: "POST",
                body: formData
            }
        );

        const updated = [...entities];

        const entity = updated.find(
            x => x.entityNumber === entityNo
        );

        if (!entity.documents[documentType]) {
            entity.documents[documentType] = [];
        }

        entity.documents[documentType].push({
            fileName: file.name,
            file
        });

        setEntities(updated);

    } catch (e) {
        console.error(e);
    }
};

const deleteDocument = (
    entityNo: number,
    documentType: string,
    index: number
) => {

    const updated = [...entities];

    const entity = updated.find(
        x => x.entityNumber === entityNo
    );

    if (!entity) return;

    entity.documents[documentType].splice(
        index,
        1
    );

    if (
        entity.documents[documentType].length === 0
    ) {
        delete entity.documents[documentType];
    }

    setEntities(updated);
};
    const activeEntityData =
        entities.find(
            x => x.entityNumber === activeEntity
        );

    const docs =
        mandatoryDocs[
            activeEntityData?.entityType
        ] || [];

    if (loading) {

        return (
            <div>
                Loading KYC Configuration...
            </div>
        );
    }

    return (
    <div className="kyc-container">

        <div className="field-row">
            <label>Are multiple entities involved?</label>

            <select
                value={multipleEntities ? "Yes" : "No"}
                onChange={(e) => {

                    const isMultiple =
                        e.target.value === "Yes";

                    setMultipleEntities(isMultiple);

                    if (!isMultiple) {

                        setEntityCount(1);

                        setEntities([
                            {
                                entityNumber: 1,
                                entityType: "",
                                documents: {}
                            }
                        ]);

                        setActiveEntity(1);
                    }
                }}
            >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
            </select>
        </div>

        {
            multipleEntities && (

                <div className="field-row">

                    <label>
                        No of entities involved
                    </label>

                    <select
                        value={entityCount}
                        onChange={(e) => {

                            const count =
                                Number(e.target.value);

                            setEntityCount(count);

                            createEntities(count);
                        }}
                    >

                        {
                            Array.from(
                                { length: 10 },
                                (_, i) => i + 1
                            ).map(x => (

                                <option
                                    key={x}
                                    value={x}
                                >
                                    {x}
                                </option>
                            ))
                        }

                    </select>

                </div>
            )
        }

        {
            multipleEntities && (

                <div className="entity-tabs">

                    {
                        entities.map(entity => (

                            <button
                                key={entity.entityNumber}
                                className={
                                    activeEntity === entity.entityNumber
                                        ? "entity-tab active"
                                        : "entity-tab"
                                }
                                onClick={() =>
                                    setActiveEntity(
                                        entity.entityNumber
                                    )
                                }
                            >
                                Entity {entity.entityNumber}
                            </button>
                        ))
                    }

                </div>
            )
        }

        <div className="field-row">

            <label>Entity Type</label>

            <select
                value={
                    activeEntityData?.entityType || ""
                }
                onChange={(e) =>
                    updateEntityType(
                        activeEntity,
                        e.target.value
                    )
                }
            >

                <option value="">
                    Select Entity Type
                </option>

                {
                    entityTypes.map(x => (

                        <option
                            key={x}
                            value={x}
                        >
                            {x}
                        </option>
                    ))
                }

            </select>

        </div>

        {
            docs.length > 0 && (

                <div className="document-section">

                    <div className="document-header">
                        UPLOAD DOCUMENTS
                    </div>

                    {
                        docs.map((doc: string) => {

                            const uploadedFiles =
                                activeEntityData?.documents?.[doc] || [];

                            return (

                                <div
                                    key={doc}
                                    className="document-row"
                                    style={{
                                        backgroundColor: "#fff4f4",
                                        borderLeft: "4px solid #d13438",
                                        marginBottom: "10px",
                                        padding: "10px"
                                    }}
                                >

                                    <input
                                        id={`file-${activeEntity}-${doc}`}
                                        type="file"
                                        multiple
                                        style={{ display: "none" }}
                                        onChange={(e: any) => {

                                            const files = e.target.files;

                                            if (files?.length) {

                                                Array.from(files).forEach(
                                                    (file: any) => {

                                                        uploadDocument(
                                                            activeEntity,
                                                            doc,
                                                            file
                                                        );
                                                    }
                                                );
                                            }
                                        }}
                                    />

                                    <div
                                        className="document-name"
                                        style={{
                                            fontWeight: 600
                                        }}
                                    >
                                        {
                                            uploadedFiles.length > 0
                                                ? (
                                                    <span style={{ color: "green" }}>
                                                        ✔ {doc}
                                                    </span>
                                                )
                                                : (
                                                    <span style={{ color: "#d13438" }}>
                                                        * {doc}
                                                    </span>
                                                )
                                        }
                                    </div>

                                    <div className="document-action">

                                        {
                                            uploadedFiles.length === 0 ? (

                                                <button
                                                    type="button"
                                                    className="upload-btn"
                                                    onClick={() => {

                                                        const input =
                                                            document.getElementById(
                                                                `file-${activeEntity}-${doc}`
                                                            ) as HTMLInputElement;

                                                        input?.click();
                                                    }}
                                                >
                                                    Upload
                                                </button>

                                            ) : (

                                                <div className="uploaded-files">

                                                    {
                                                        uploadedFiles.map(
                                                            (
                                                                fileInfo: any,
                                                                index: number
                                                            ) => (

                                                                <div
                                                                    key={index}
                                                                    className="uploaded-file-row"
                                                                    style={{
                                                                        display: "flex",
                                                                        gap: "10px",
                                                                        alignItems: "center",
                                                                        marginBottom: "6px"
                                                                    }}
                                                                >

                                                                    <span>
                                                                        {fileInfo.fileName}
                                                                    </span>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {

                                                                            const url =
                                                                                URL.createObjectURL(
                                                                                    fileInfo.file
                                                                                );

                                                                            window.open(
                                                                                url,
                                                                                "_blank"
                                                                            );
                                                                        }}
                                                                    >
                                                                        View
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            deleteDocument(
                                                                                activeEntity,
                                                                                doc,
                                                                                index
                                                                            )
                                                                        }
                                                                    >
                                                                        Delete
                                                                    </button>

                                                                </div>
                                                            )
                                                        )
                                                    }

                                                    <button
                                                        type="button"
                                                        className="upload-btn"
                                                        onClick={() => {

                                                            const input =
                                                                document.getElementById(
                                                                    `file-${activeEntity}-${doc}`
                                                                ) as HTMLInputElement;

                                                            input?.click();
                                                        }}
                                                    >
                                                        Add More
                                                    </button>

                                                </div>
                                            )
                                        }

                                    </div>

                                </div>
                            );
                        })
                    }

                </div>
            )
        }

    </div>
);
};